#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    bool* v;
    size_t v_size;
} ReceiptsOneRes;

char* receipts_one_res_v_to_json_array(const bool* model, size_t size);
char* receipts_one_res_to_json(const ReceiptsOneRes* model);

char* receipts_one_res_v_to_json_array(const bool* model, size_t size)
{
    if (size == 0) {
        char* buf = malloc(3);
        buf[0] = '[';
        buf[1] = ']';
        buf[2] = '\0';
        return buf;
    }
    size_t buffer_size = snprintf(NULL, 0, "[%s", model[0] ? "true" : "false");
    char* buffer = malloc(buffer_size + 1);
    sprintf(buffer, "[%s", model[0] ? "true" : "false");
    for (size_t i = 1; i < size; ++i) {
        char* temp = malloc(buffer_size + 1);
        memcpy(temp, buffer, buffer_size + 1);

        buffer_size
            = snprintf(NULL, 0, "%s,%s", buffer, model[i] ? "true" : "false");
        buffer = realloc(buffer, buffer_size + 1);
        sprintf(buffer, "%s,%s", temp, model[i] ? "true" : "false");

        free(temp);
    }
    char* temp = malloc(buffer_size + 1);
    memcpy(temp, buffer, buffer_size + 1);
    buffer_size = snprintf(NULL, 0, "%s]", buffer);
    buffer = realloc(buffer, buffer_size + 1);
    sprintf(buffer, "%s]", temp);
    free(temp);
    return buffer;
}

char* receipts_one_res_to_json(const ReceiptsOneRes* model)
{
    const char* _format = "{\"v\":%s}";
    char* v = receipts_one_res_v_to_json_array(model->v, model->v_size);
    size_t _size = snprintf(NULL, 0, _format, v);
    char* _buffer = malloc(_size + 1);
    sprintf(_buffer, _format, v);
    free(v);
    return _buffer;
}

int main(void)
{
    bool arr[] = {
        true,
        false,
        true,
    };
    ReceiptsOneRes v = { .v = arr, .v_size = 3 };

    char* res = receipts_one_res_to_json(&v);

    printf("%s\n", res);

    free(res);
}
