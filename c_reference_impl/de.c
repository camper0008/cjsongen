#include "de.h"

void construct_string(String* str)
{
    assert(str->capacity == 0 && str->content == NULL);
    str->content = malloc(64);
    str->capacity = 64;
    str->len = 0;
}

void destroy_string(String* str)
{
    assert(str->content != NULL);
    free(str->content);
}

void construct_ctx(Ctx* ctx, const char* input, size_t len)
{
    assert(ctx->error == NULL);
    ctx->input = input;
    ctx->error = malloc(CTX_ERROR_SIZE + 1);
    ctx->idx = 0;
    ctx->len = len;
}

void destroy_ctx(Ctx* ctx)
{
    assert(ctx->error != NULL);
    free(ctx->error);
}

int deserialize_bool(Ctx* ctx, bool* out)
{
    char bools[2][5] = { "true", "false" };
    char mode = '_';
    size_t len = 0;
    while (true) {
        if (ctx->idx >= ctx->len) {
            snprintf(ctx->error, CTX_ERROR_SIZE, "reached EOF parsing bool");
            return -1;
        }
        char curr = ctx->input[ctx->idx];
        ctx->idx += 1;
        if (mode == '_') {
            mode = curr;
            if (mode != 't' && mode != 'f') {
                snprintf(ctx->error,
                    CTX_ERROR_SIZE,
                    "expected 't' or 'f', got '%c' while parsing bool",
                    curr);
                return -1;
            }
        }
        char expected = bools[mode == 't' ? 0 : 1][len];
        if (expected != curr) {
            snprintf(ctx->error,
                CTX_ERROR_SIZE,
                "expected '%c', got '%c' while parsing bool",
                expected,
                curr);
            return -1;
        }
        len += 1;
        if (mode == 't' && len == 4) {
            break;
        }
        if (mode == 'f' && len == 5) {
            break;
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

char deserialize_string_escape_char(char id)
{
    switch (id) {
        case '0':
            return '\0';
        case 't':
            return '\t';
        case 'r':
            return '\r';
        case 'n':
            return '\n';
        default:
            return id;
    }
}

int deserialize_string(Ctx* ctx, String* out)
{

    construct_string(out);
    if (ctx->idx >= ctx->len) {
        snprintf(ctx->error, CTX_ERROR_SIZE, "reached EOF parsing string");
        return -1;
    }
    if (ctx->input[ctx->idx] != '"') {
        ctx->error = malloc(64);
        snprintf(ctx->error, CTX_ERROR_SIZE, "expected '\"' at %ld", ctx->idx);
        return -1;
    }
    ctx->idx += 1;

    bool done = false;
    bool escaping = false;

    while (ctx->idx < ctx->len && !done) {
        if (out->len >= out->capacity) {
            out->capacity *= 2;
            out->content = realloc(out->content, out->capacity);
        }
        char curr = ctx->input[ctx->idx];
        ctx->idx += 1;
        if (escaping) {
            escaping = false;
            out->content[out->len] = deserialize_string_escape_char(curr);
            out->len += 1;
        } else if (curr == '\\') {
            escaping = true;
        } else if (curr == '"') {
            done = true;
        } else {
            out->content[out->len] = curr;
            out->len += 1;
        }
    }
    if (!done) {
        snprintf(ctx->error, CTX_ERROR_SIZE, "reached EOF parsing string");
        return -1;
    }
    return 0;
}
