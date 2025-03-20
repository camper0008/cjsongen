#ifndef CJSONGEN_DE_H
#define CJSONGEN_DE_H

#define DE_CTX_ERROR_SIZE 128

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
    char* content;
    size_t len;
    size_t capacity;
} DeStr;

void de_str_construct(DeStr* str);
void de_str_push(DeStr* str, char ch);
void de_str_copy_to_c_str(DeStr* str, char** dest);
void de_str_destroy(DeStr* str);

typedef struct {
    const char* input;
    char* error;
    size_t idx;
    size_t len;
} DeCtx;

typedef enum {
    DeCtxResult_Ok,
    DeCtxResult_BadInput,
} DeCtxResult;

void de_ctx_construct(DeCtx* ctx, const char* input, size_t len);
void de_ctx_destroy(DeCtx* ctx);
void de_ctx_skip_whitespace(DeCtx* ctx);

DeCtxResult de_ctx_expect_either_char(
    DeCtx* ctx, char expect0, char expect1, const char* parsing);
DeCtxResult de_ctx_expect_char(DeCtx* ctx, char expected, const char* parsing);
DeCtxResult de_ctx_expect_not_done(DeCtx* ctx, const char* parsing);

DeCtxResult de_ctx_deserialize_bool(DeCtx* ctx, bool* out, const char* parsing);
DeCtxResult de_ctx_deserialize_str(DeCtx* ctx, char** out, const char* parsing);
DeCtxResult de_ctx_deserialize_int(
    DeCtx* ctx, int64_t* out, const char* parsing);

#endif
