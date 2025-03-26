#include "de.h"
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char** names;
    size_t names_size;
} Invitation;

DeCtxResult invitation_names_from_json_array(
    DeCtx* ctx, char*** model, size_t* size);
DeCtxResult invitation_from_json(DeCtx* ctx, Invitation* model);
void invitation_names_destroy_array(char** model, size_t size);
void invitation_destroy(Invitation* model);

void invitation_names_destroy_array(char** model, size_t size)
{
    for (size_t i = 0; i < size; ++i) {
        free(model[i]);
    }
    free(model);
}

DeCtxResult invitation_names_from_json_array(
    DeCtx* ctx, char*** model, size_t* size)
{
    DeCtxResult res;
    res = de_ctx_expect_char(ctx, '[', "invitation.names");
    if (res != DeCtxResult_Ok) {
        return res;
    }
    ctx->idx += 1;
    {
        char curr = ctx->input[ctx->idx];
        if (curr == ']') {
            ctx->idx += 1;
            return DeCtxResult_Ok;
        }
    }
    size_t allocated = 48;
    *model = malloc(sizeof(char*) * allocated);
    *size = 0;
    while (true) {
        if (*size >= allocated) {
            allocated *= 2;
            *model = realloc(*model, sizeof(char*) * allocated);
        }
        res = de_ctx_deserialize_str(ctx, &(*model)[*size], "invitation.names");
        if (res != DeCtxResult_Ok) {
            invitation_names_destroy_array(*model, *size);
            return res;
        }
        *size += 1;
        char curr = ctx->input[ctx->idx];
        if (curr == ']') {
            break;
        }
        res = de_ctx_expect_char(ctx, ',', "invitation.names");
        if (res != DeCtxResult_Ok) {
            invitation_names_destroy_array(*model, *size);
            return res;
        }
        ctx->idx += 1;
    }
    res = de_ctx_expect_char(ctx, ']', "invitation.names");
    if (res != DeCtxResult_Ok) {
        invitation_names_destroy_array(*model, *size);
        return res;
    }
    ctx->idx += 1;
    return DeCtxResult_Ok;
}

// WARNING: current implementation does not free allocated values if
// keys are duplicated. i.e. {"key": "val1", "key": "val2"}
// will not deallocate "val1" - same goes for structs and arrays
// or if an error occurs during parsing
DeCtxResult invitation_from_json(DeCtx* ctx, Invitation* model)
{
    DeCtxResult res;
    res = de_ctx_expect_char(ctx, '{', "invitation");
    if (res != DeCtxResult_Ok) {
        return res;
    }
    ctx->idx += 1;
    char** _names;
    size_t _names_size;
    size_t found_fields_bitmask = 0;

    while (true) {

        char* key;
        res = de_ctx_deserialize_str(ctx, &key, "invitation");

        if (res != DeCtxResult_Ok) {
            return res;
        }
        res = de_ctx_expect_char(ctx, ':', "invitation");

        if (res != DeCtxResult_Ok) {
            return res;
        }
        ctx->idx += 1;
        if (strcmp(key, "names") == 0) {
            found_fields_bitmask |= (1 << 0);
            res = invitation_names_from_json_array(ctx, &_names, &_names_size);
            if (res != DeCtxResult_Ok) {
                return res;
            }
        } else {
            snprintf(
                ctx->error, DE_CTX_ERROR_SIZE, "got invalid key '%s'", key);
            free(key);
            return DeCtxResult_BadInput;
        }
        free(key);
        de_ctx_skip_whitespace(ctx);
        res = de_ctx_expect_not_done(ctx, "invitation");
        if (res != DeCtxResult_Ok) {
            return res;
        }
        char curr = ctx->input[ctx->idx];
        if (curr == ',') {
            continue;
        }
        res = de_ctx_expect_char(ctx, '}', "invitation");
        if (res != DeCtxResult_Ok) {
            return res;
        }
        break;
    }
    if (found_fields_bitmask != 1) {
        snprintf(ctx->error, DE_CTX_ERROR_SIZE, "missing fields");
        return DeCtxResult_BadInput;
    }
    ctx->idx += 1;
    model->names = _names;
    model->names_size = _names_size;
    return DeCtxResult_Ok;
}

int main(void)
{
    DeCtx ctx;
    char* input = "{\"names\": [\"hello\", \"johnny\"]}";
    de_ctx_construct(&ctx, input, strlen(input));
    Invitation inv;
    DeCtxResult res = invitation_from_json(&ctx, &inv);
    if (res != DeCtxResult_Ok) {
        printf("error: %s\n", ctx.error);
        return 0;
    }

    for (size_t i = 0; i < inv.names_size; ++i) {
        printf("name: %s\n", inv.names[i]);
    }
}
