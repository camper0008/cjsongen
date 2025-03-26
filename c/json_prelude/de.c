#include "de.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static inline char map_escaped_char(char in);

void de_str_construct(DeStr* str)
{
    str->content = malloc(64);
    str->capacity = 64;
    str->len = 0;
}

void de_str_push(DeStr* str, char ch)
{
    if (str->len >= str->capacity) {
        str->capacity *= 2;
        str->content = realloc(str->content, str->capacity);
    }
    str->content[str->len] = ch;
    str->len += 1;
}

void de_str_copy_to_c_str(DeStr* str, char** dest)
{
    *dest = malloc(str->len + 1);
    memcpy(*dest, str->content, str->len);
    (*dest)[str->len] = '\0';
}

void de_str_destroy(DeStr* str)
{
    free(str->content);
    str->content = NULL;
}

void de_ctx_construct(DeCtx* ctx, const char* input, size_t len)
{
    ctx->input = input;
    ctx->error = malloc(DE_CTX_ERROR_SIZE + 1);
    ctx->idx = 0;
    ctx->len = len;
}

void de_ctx_skip_whitespace(DeCtx* ctx)
{
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
            default:
                break;
        }
        break;
    }
}

DeCtxResult de_ctx_expect_not_done(DeCtx* ctx, const char* parsing)
{
    de_ctx_skip_whitespace(ctx);
    if (ctx->idx >= ctx->len) {
        snprintf(ctx->error,
            DE_CTX_ERROR_SIZE,
            "got EOF while parsing '%s'",
            parsing);
        return DeCtxResult_BadInput;
    }
    return DeCtxResult_Ok;
}

DeCtxResult de_ctx_expect_either_char(
    DeCtx* ctx, char expect0, char expect1, const char* parsing)
{
    de_ctx_skip_whitespace(ctx);
    if (ctx->idx >= ctx->len) {
        snprintf(ctx->error,
            DE_CTX_ERROR_SIZE,
            "expected '%c' or '%c' while parsing '%s', got EOF",
            expect0,
            expect1,
            parsing);
        return DeCtxResult_BadInput;
    }
    char current = ctx->input[ctx->idx];
    if (current != expect0 && current != expect1) {
        snprintf(ctx->error,
            DE_CTX_ERROR_SIZE,
            "expected '%c' or '%c' while parsing '%s', got '%c'",
            expect0,
            expect1,
            parsing,
            current);
        return DeCtxResult_BadInput;
    }
    return DeCtxResult_Ok;
}

DeCtxResult de_ctx_expect_char(DeCtx* ctx, char expected, const char* parsing)
{
    de_ctx_skip_whitespace(ctx);
    if (ctx->idx >= ctx->len) {
        snprintf(ctx->error,
            DE_CTX_ERROR_SIZE,
            "expected '%c' while parsing '%s', got EOF",
            expected,
            parsing);
        return DeCtxResult_BadInput;
    }
    char current = ctx->input[ctx->idx];
    if (current != expected) {
        snprintf(ctx->error,
            DE_CTX_ERROR_SIZE,
            "expected '%c' while parsing '%s', got '%c'",
            expected,
            parsing,
            current);
        return DeCtxResult_BadInput;
    }
    return DeCtxResult_Ok;
}

void de_ctx_destroy(DeCtx* ctx)
{
    assert(ctx->error != NULL);
    free(ctx->error);
    ctx->error = NULL;
}

DeCtxResult de_ctx_deserialize_bool(DeCtx* ctx, bool* out, const char* parsing)
{
    de_ctx_skip_whitespace(ctx);
    DeCtxResult expect_res = de_ctx_expect_either_char(ctx, 't', 'f', parsing);
    if (expect_res != DeCtxResult_Ok) {
        return expect_res;
    }

    char mode = ctx->input[ctx->idx];
    size_t bool_len = 0;

    char bools[2][5] = { "true", "false" };

    while (true) {
        char* current_bool = bools[mode == 't' ? 0 : '1'];
        char expected = current_bool[bool_len];

        DeCtxResult expect_res = de_ctx_expect_char(ctx, expected, parsing);
        if (expect_res != DeCtxResult_Ok) {
            return expect_res;
        }

        bool_len += 1;
        if (mode == 't' && bool_len == 4) {
            break;
        } else if (mode == 'f' && bool_len == 5) {
            break;
        }

        ctx->idx += 1;

        DeCtxResult res = de_ctx_expect_not_done(ctx, parsing);
        if (res != DeCtxResult_Ok) {
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

    ctx->idx += 1;

    return DeCtxResult_Ok;
}

static inline char map_escaped_char(char in)
{
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

DeCtxResult de_ctx_deserialize_str(DeCtx* ctx, char** out, const char* parsing)
{
    de_ctx_skip_whitespace(ctx);
    typedef enum {
        Parsing,
        Escaping,
        Done,
    } CtxDeserializeStrMode;

    DeStr parsed = {
        .len = 0,
        .capacity = 0,
        .content = NULL,
    };
    de_str_construct(&parsed);
    DeCtxResult expect_res = de_ctx_expect_char(ctx, '"', parsing);
    if (expect_res != DeCtxResult_Ok) {
        de_str_destroy(&parsed);
        return expect_res;
    }
    ctx->idx += 1;

    CtxDeserializeStrMode mode = Parsing;

    while (ctx->idx < ctx->len && mode != Done) {
        char curr = ctx->input[ctx->idx];

        if (mode == Escaping) {
            mode = Parsing;
            de_str_push(&parsed, map_escaped_char(curr));
        } else if (curr == '\\') {
            mode = Escaping;
        } else if (curr == '"') {
            mode = Done;
        } else {
            de_str_push(&parsed, curr);
        }
        ctx->idx += 1;
    }

    if (mode != Done) {
        de_str_destroy(&parsed);
        return de_ctx_expect_not_done(ctx, parsing);
    }

    de_str_copy_to_c_str(&parsed, out);
    de_str_destroy(&parsed);

    return DeCtxResult_Ok;
}

DeCtxResult de_ctx_deserialize_int(
    DeCtx* ctx, int64_t* out, const char* parsing)
{
    de_ctx_skip_whitespace(ctx);
    size_t len = 0;
    *out = 0;
    bool is_negative = false;
    while (true) {
        if (ctx->idx >= ctx->len) {
            break;
        }
        char current = ctx->input[ctx->idx];
        bool is_not_number = !(current >= '0' && current <= '9');
        bool starts_with_zero = (current == '0' && len == 0);
        if (is_not_number || starts_with_zero) {
            bool starts_with_minus
                = (!is_negative && current == '-' && len == 0);
            if (starts_with_minus) {
                is_negative = true;
                ctx->idx += 1;
                continue;
            }
            break;
        }
        *out *= 10;
        *out += current - '0';
        ctx->idx += 1;
        len += 1;
    }
    if (len == 0) {
        if (ctx->idx >= ctx->len) {
            return de_ctx_expect_not_done(ctx, parsing);
        }
        char current = ctx->input[ctx->idx];
        snprintf(ctx->error,
            DE_CTX_ERROR_SIZE,
            "expected '1'..'9', got '%c' while parsing '%s'",
            current,
            parsing);
        return DeCtxResult_BadInput;
    }
    if (is_negative) {
        *out = -(*out);
    }

    ctx->idx += 1;

    return DeCtxResult_Ok;
}
