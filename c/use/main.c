#include "de.h"
#include <assert.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char* no;
} InvitationYes;

typedef struct {
    InvitationYes yes;
    char** names;
    size_t names_size;
} Invitation;

DeCtxResult invitation_yes_from_json(DeCtx* ctx, InvitationYes* model);
DeCtxResult invitation_names_from_json_array(
    DeCtx* ctx, char*** model, size_t* size);
DeCtxResult invitation_from_json(DeCtx* ctx, Invitation* model);
void invitation_yes_destroy(InvitationYes* model);
void invitation_names_destroy_array(char** model, size_t size);
void invitation_destroy(Invitation* model);

void invitation_yes_destroy(InvitationYes* model)
{
    free(model->no);
}

DeCtxResult invitation_yes_from_json(DeCtx* ctx, InvitationYes* model)
{
    DeCtxResult res;
    res = de_ctx_expect_char(ctx, '{', "invitation.yes");
    if (res != DeCtxResult_Ok) {
        return res;
    }
    ctx->idx += 1;

    char* _no = NULL;

    bool found_fields[1] = { false };
    char* key = NULL;
    while (true) {
        res = de_ctx_deserialize_str(ctx, &key, "invitation.yes");
        if (res != DeCtxResult_Ok) {
            goto drop;
        }
        res = de_ctx_expect_char(ctx, ':', "invitation.yes");
        if (res != DeCtxResult_Ok) {
            goto drop;
        }
        ctx->idx += 1;
        if (strcmp(key, "no") == 0) {
            if (found_fields[0]) {
                if (_no != NULL) {
                    free(_no);
                }
            }
            found_fields[0] = true;
            res = de_ctx_deserialize_str(ctx, &_no, "invitation.yes.no");
            if (res != DeCtxResult_Ok) {
                goto drop;
            }
        } else {
            snprintf(
                ctx->error, DE_CTX_ERROR_SIZE, "got invalid key '%s'", key);
            res = DeCtxResult_BadInput;
            goto drop;
        }
        res = de_ctx_expect_not_done(ctx, "invitation.yes");
        if (res != DeCtxResult_Ok) {
            return res;
        }
        char curr = ctx->input[ctx->idx];
        if (curr == ',') {
            ctx->idx += 1;
            continue;
        }
        res = de_ctx_expect_char(ctx, '}', "invitation.yes");
        if (res != DeCtxResult_Ok) {
            goto drop;
        }
        ctx->idx += 1;
        break;
    }
    bool all_fields_received = true;
    for (size_t i = 0; i < 1; ++i) {
        all_fields_received = all_fields_received && found_fields[i];
    }
    if (!all_fields_received) {
        snprintf(ctx->error, DE_CTX_ERROR_SIZE, "missing fields");
        res = DeCtxResult_BadInput;
        goto drop;
    }

    goto success;
drop: {
    assert(res != DeCtxResult_Ok);
    if (_no != NULL) {
        free(_no);
    }
    if (key != NULL) {
        free(key);
    }
    return res;
}
success: {
    model->no = _no;
    return DeCtxResult_Ok;
}
}

void invitation_names_destroy_array(char** model, size_t size)
{
    if (model == NULL) {
        return;
    }
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

void invitation_destroy(Invitation* model)
{
    invitation_yes_destroy(&model->yes);
    invitation_names_destroy_array(model->names, model->names_size);
}

DeCtxResult invitation_from_json(DeCtx* ctx, Invitation* model)
{
    DeCtxResult res;
    res = de_ctx_expect_char(ctx, '{', "invitation");
    if (res != DeCtxResult_Ok) {
        return res;
    }
    ctx->idx += 1;

    InvitationYes _yes = { 0 };
    char** _names = NULL;
    size_t _names_size = 0;

    bool found_fields[2] = { false };
    char* key = NULL;
    while (true) {
        res = de_ctx_deserialize_str(ctx, &key, "invitation");
        if (res != DeCtxResult_Ok) {
            goto drop;
        }
        res = de_ctx_expect_char(ctx, ':', "invitation");
        if (res != DeCtxResult_Ok) {
            goto drop;
        }
        ctx->idx += 1;
        if (strcmp(key, "yes") == 0) {
            if (found_fields[0]) {
                invitation_yes_destroy(&_yes);
            }
            found_fields[0] = true;
            res = invitation_yes_from_json(ctx, &_yes);
            if (res != DeCtxResult_Ok) {
                goto drop;
            }
        } else if (strcmp(key, "names") == 0) {
            if (found_fields[1]) {
                invitation_names_destroy_array(_names, _names_size);
            }
            found_fields[1] = true;
            res = invitation_names_from_json_array(ctx, &_names, &_names_size);
            if (res != DeCtxResult_Ok) {
                goto drop;
            }
        } else {
            snprintf(
                ctx->error, DE_CTX_ERROR_SIZE, "got invalid key '%s'", key);
            res = DeCtxResult_BadInput;
            goto drop;
        }
        res = de_ctx_expect_not_done(ctx, "invitation");
        if (res != DeCtxResult_Ok) {
            return res;
        }
        char curr = ctx->input[ctx->idx];
        if (curr == ',') {
            ctx->idx += 1;
            continue;
        }
        res = de_ctx_expect_char(ctx, '}', "invitation");
        if (res != DeCtxResult_Ok) {
            goto drop;
        }
        ctx->idx += 1;
        break;
    }
    bool all_fields_received = true;
    for (size_t i = 0; i < 2; ++i) {
        all_fields_received = all_fields_received && found_fields[i];
    }
    if (!all_fields_received) {
        snprintf(ctx->error, DE_CTX_ERROR_SIZE, "missing fields");
        res = DeCtxResult_BadInput;
        goto drop;
    }

    goto success;
drop: {
    assert(res != DeCtxResult_Ok);
    invitation_yes_destroy(&_yes);
    invitation_names_destroy_array(_names, _names_size);
    if (key != NULL) {
        free(key);
    }
    return res;
}
success: {
    model->yes = _yes;
    model->names = _names;
    model->names_size = _names_size;
    return DeCtxResult_Ok;
}
}

int main(void)
{
    DeCtx ctx;
    const char* input = "{"
                        "  \"names\": [\"hello\", \"johnny\"],"
                        "  \"yes\": {"
                        "    \"no\":"
                        "    \"hello world!\""
                        "  }"
                        "}";
    de_ctx_construct(&ctx, input, strlen(input));
    Invitation inv;
    DeCtxResult res = invitation_from_json(&ctx, &inv);
    if (res != DeCtxResult_Ok) {
        printf("error: %s\n", ctx.error);
        return 0;
    }

    printf("yes: %s\n", inv.yes.no);
    for (size_t i = 0; i < inv.names_size; ++i) {
        printf("name: %s\n", inv.names[i]);
    }
}
