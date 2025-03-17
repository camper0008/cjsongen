#include "models.h"
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

char* serialize_str(char* ptr)
{
    size_t size = snprintf(NULL, 0, "\"%s\"", ptr);
    char* buffer = malloc(size + 1);
    sprintf(buffer, "\"%s\"", ptr);
    return buffer;
}
char* serialize_int(int64_t value)
{
    size_t size = snprintf(NULL, 0, "%ld", value);
    char* buffer = malloc(size + 1);
    sprintf(buffer, "%ld", value);
    return buffer;
}

char* receipts_one_res_products_to_json(const ReceiptsOneResProducts* model)
{
    char* product_id = serialize_int(model->product_id);
    char* name = serialize_str(model->name);
    char* price_dkk_cent = serialize_int(model->price_dkk_cent);
    char* amount = serialize_int(model->amount);

    const char* format = "{"
                         "\"product_id\": %s,"
                         "\"name\": %s,"
                         "\"price_dkk_cent\": %s,"
                         "\"amount\": %s"
                         "}";

    size_t size
        = snprintf(NULL, 0, format, product_id, name, price_dkk_cent, amount);
    char* buffer = malloc(size + 1);
    sprintf(buffer, format, product_id, name, price_dkk_cent, amount);
    free(product_id);
    free(name);
    free(price_dkk_cent);
    free(amount);
    return buffer;
}

char* receipts_one_res_products_to_json_array(
    const ReceiptsOneResProducts* model, size_t size)
{

    char* value = receipts_one_res_products_to_json(&model[0]);
    size_t buffer_size = snprintf(NULL, 0, "[%s", value);
    char* buffer = malloc(buffer_size + 1);
    sprintf(buffer, "[%s", value);
    free(value);

    for (size_t i = 1; i < size; ++i) {
        char* value = receipts_one_res_products_to_json(&model[i]);

        buffer_size = snprintf(NULL, 0, "%s,%s", buffer, value);
        buffer = realloc(buffer, buffer_size + 1);
        sprintf(buffer, "%s,%s", buffer, value);

        free(value);
    }
    buffer_size = snprintf(NULL, 0, "%s]", buffer);
    buffer = realloc(buffer, buffer_size + 1);
    sprintf(buffer, "%s]", buffer);

    return buffer;
}

char* receipts_one_res_to_json(const ReceiptsOneRes* model);

int main(void)
{
    ReceiptsOneResProducts prod[] = {
        {
            .name = "expensive amper",
            .price_dkk_cent = 1000,
            .amount = 4,
            .product_id = 0,
        },
        {
            .name = "expensiver amper",
            .price_dkk_cent = 3000,
            .amount = 5,
            .product_id = 20,
        },
        {
            .name = "expensivest amper",
            .price_dkk_cent = 6000,
            .amount = 6,
            .product_id = 40,
        },
    };
    char* str = receipts_one_res_products_to_json_array(prod, 3);
    printf("%s", str);
    free(str);
}
