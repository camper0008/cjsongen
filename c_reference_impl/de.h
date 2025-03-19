#ifndef CJSONGEN_DE
#define CJSONGEN_DE

#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    char* content;
    size_t len;
    size_t capacity;
} String;

void construct_string(String* str);

void destroy_string(String* str);

typedef struct {
    const char* input;
    char* error;
    size_t idx;
    size_t len;
} Ctx;

#define CTX_ERROR_SIZE 63

void construct_ctx(Ctx* ctx, const char* input, size_t len);

void destroy_ctx(Ctx* ctx);

int deserialize_bool(Ctx* ctx, bool* out);

char deserialize_string_escape_char(char id);

// Will construct string for you
// Fails if string is already constructed
int deserialize_string(Ctx* ctx, String* out);

#endif
