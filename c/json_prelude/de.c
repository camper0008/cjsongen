#include "de.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

void construct_string(String *str) {
  assert(str->capacity == 0 && str->content == NULL);
  str->content = malloc(64);
  str->capacity = 64;
  str->len = 0;
}

void string_push(String *str, char ch) {
  assert(str->content != NULL);
  if (str->len >= str->capacity) {
    str->capacity *= 2;
    str->content = realloc(str->content, str->capacity);
  }
  str->content[str->len] = ch;
  str->len += 1;
}

void destroy_string(String *str) {
  assert(str->content != NULL);
  free(str->content);
  str->content = NULL;
}

#define CTX_ERROR_SIZE 128

void construct_ctx(Ctx *ctx, const char *input, size_t len) {
  assert(ctx->error == NULL);
  ctx->input = input;
  ctx->error = malloc(CTX_ERROR_SIZE + 1);
  ctx->idx = 0;
  ctx->len = len;
}

void ctx_skip_whitespace(Ctx *ctx) {
  while (true) {
    if (ctx->idx >= ctx->len) {
      break;
    }
    switch (ctx->input[ctx->idx]) {
    case ' ':
    case '\r':
    case '\n':
    case '\t': {
      ctx->idx += 1;
      continue;
    }
    default: {
      break;
    }
    }
  }
}

CtxResult ctx_expect_not_done(Ctx *ctx, const char *parsing) {
  if (ctx->idx >= ctx->len) {
    snprintf(ctx->error, CTX_ERROR_SIZE, "got EOF while parsing '%s'", parsing);
    return CtxBadInput;
  }
  return CtxOk;
}

CtxResult ctx_expect_either_char(Ctx *ctx, char expect0, char expect1,
                                 const char *parsing) {
  if (ctx->idx >= ctx->len) {
    snprintf(ctx->error, CTX_ERROR_SIZE,
             "expected '%c' or '%c' while parsing '%s', got EOF", expect0,
             expect1, parsing);
    return CtxBadInput;
  }
  char current = ctx->input[ctx->idx];
  if (current != expect0 && current != expect1) {
    snprintf(ctx->error, CTX_ERROR_SIZE,
             "expected '%c' or '%c' while parsing '%s', got '%c'", expect0,
             expect1, parsing, current);
    return CtxBadInput;
  }
  return CtxOk;
}

CtxResult ctx_expect_char(Ctx *ctx, char expected, const char *parsing) {
  if (ctx->idx >= ctx->len) {
    snprintf(ctx->error, CTX_ERROR_SIZE,
             "expected '%c' while parsing '%s', got EOF", expected, parsing);
    return CtxBadInput;
  }
  char current = ctx->input[ctx->idx];
  if (current != expected) {
    snprintf(ctx->error, CTX_ERROR_SIZE,
             "expected '%c' while parsing '%s', got '%c'", expected, parsing,
             current);
    return CtxBadInput;
  }
  return CtxOk;
}

void destroy_ctx(Ctx *ctx) {
  assert(ctx->error != NULL);
  free(ctx->error);
  ctx->error = NULL;
}

CtxResult ctx_deserialize_bool(Ctx *ctx, bool *out) {
  CtxResult expect_res = ctx_expect_either_char(ctx, 't', 'f', "bool");
  if (expect_res != CtxOk) {
    return expect_res;
  }

  char mode = ctx->input[ctx->idx];
  size_t bool_len = 0;

  char bools[2][5] = {"true", "false"};

  while (true) {
    char *current_bool = bools[mode == 't' ? 0 : '1'];
    char expected = current_bool[bool_len];

    int expect_res = ctx_expect_char(ctx, expected, "bool");
    if (expect_res != CtxOk) {
      return expect_res;
    }

    bool_len += 1;
    if (mode == 't' && bool_len == 4) {
      break;
    } else if (mode == 'f' && bool_len == 5) {
      break;
    }

    ctx->idx += 1;

    CtxResult res = ctx_expect_not_done(ctx, "bool");
    if (res != CtxOk) {
      return res;
    }
  }

  if (mode == 't') {
    *out = true;
  } else if (mode == 'f') {
    *out = false;
  } else {
    printf("unreachable: should only break from loop if mode is correct\n");
    exit(1);
  }
  return 0;
}

char ctx_map_escaped_char(char in) {
  switch (in) {
  case '0':
    return '0';
  case 't':
    return '\t';
  case 'r':
    return '\r';
  case 'n':
    return '\n';
  default:
    if (in == 0)
      return '0';
    return in;
  }
}

CtxResult ctx_deserialize_string(Ctx *ctx, String *out) {
  typedef enum {
    Parsing,
    Escaping,
    Done,
  } CtxDeserializeStringMode;

  construct_string(out);
  int res = ctx_expect_char(ctx, '"', "bool");
  if (res != CtxOk) {
    return res;
  }
  ctx->idx += 1;

  CtxDeserializeStringMode mode = Parsing;

  while (ctx->idx < ctx->len && mode != Done) {
    char curr = ctx->input[ctx->idx];

    if (mode == Escaping) {
      mode = Parsing;
      string_push(out, ctx_map_escaped_char(curr));
    } else if (curr == '\\') {
      mode = Escaping;
    } else if (curr == '"') {
      mode = Done;
    } else {
      string_push(out, curr);
    }
    ctx->idx += 1;
  }

  if (mode != Done) {
    return ctx_expect_not_done(ctx, "string");
  }

  return CtxOk;
}

CtxResult ctx_deserialize_int(Ctx *ctx, int64_t *out) {
  size_t len = 0;
  *out = 0;
  while (true) {
    CtxResult is_not_eof_res = ctx_expect_not_done(ctx, "int");
    if (is_not_eof_res != CtxOk) {
      return is_not_eof_res;
    }
    char current = ctx->input[ctx->idx];
    bool is_not_number = !(current >= '0' && current <= '9');
    bool starts_with_zero = (current == '0' && len == 0);
    if (is_not_number || starts_with_zero) {
      break;
    }
    ctx->idx += 1;
    *out *= 10;
    *out += current - '0';
    len += 1;
  }
  if (len == 0) {
    char current = ctx->input[ctx->idx];
    snprintf(ctx->error, CTX_ERROR_SIZE,
             "expected '1'..'9', got '%c' while parsing int", current);
    return CtxBadInput;
  }
  return CtxOk;
}
