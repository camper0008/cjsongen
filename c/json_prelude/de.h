#ifndef CJSONGEN_DE
#define CJSONGEN_DE

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
  char *content;
  size_t len;
  size_t capacity;
} String;

void construct_string(String *str);
void string_push(String *str, char ch);
void destroy_string(String *str);

typedef struct {
  const char *input;
  char *error;
  size_t idx;
  size_t len;
} Ctx;

typedef enum {
  CtxOk,
  CtxBadInput,
} CtxResult;

void construct_ctx(Ctx *ctx, const char *input, size_t len);
void destroy_ctx(Ctx *ctx);
void ctx_skip_whitespace(Ctx *ctx);

CtxResult ctx_expect_either(Ctx *ctx, char expect0, char expect1,
                            const char *parsing);
CtxResult ctx_expect(Ctx *ctx, char expected, const char *parsing);
CtxResult ctx_expect_not_done(Ctx *ctx, const char *parsing);

CtxResult ctx_deserialize_bool(Ctx *ctx, bool *out);
char ctx_map_escaped_char(char in);
// (!) The caller is not allowed to construct the `String` beforehand
// (!) `ctx_deserialize_string` will construct the `String`
// (!) The function asserts that the `String` is unconstructed,
// (!) and the `assert` will fail if it is the case
//
// It is the caller's responsibility to call `destroy_string` after use
CtxResult ctx_deserialize_string(Ctx *ctx, String *out);
CtxResult ctx_deserialize_int(Ctx *ctx, int64_t *out);

#endif
