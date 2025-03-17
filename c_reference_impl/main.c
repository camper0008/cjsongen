#include "models.h"
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

char *serialize_str(char *ptr) {
    size_t size = snprintf(NULL, 0, "\"%s\"", ptr);
    char *buffer = malloc(size + 1);
    sprintf(buffer, "\"%s\"", ptr);
    return buffer;
}
char *serialize_int(int64_t value) {
    size_t size = snprintf(NULL, 0, "%ld", value);
    char *buffer = malloc(size + 1);
    sprintf(buffer, "%ld", value);
    return buffer;
}
char *serialize_size_t(size_t value) {
    size_t size = snprintf(NULL, 0, "%ld", value);
    char *buffer = malloc(size + 1);
    sprintf(buffer, "%ld", value);
    return buffer;
}

char *
receipts_one_res_products_to_json_string(const ReceiptsOneResProducts *model) {

    char *product_id = serialize_int(model->product_id);

    char *name = serialize_str(model->name);

    char *price_dkk_cent = serialize_int(model->product_id);

    char *amount = serialize_int(model->amount);

    size_t size = snprintf(NULL, 0,
                           "{"
                           "\"product_id\": %s,"
                           "\"name\": %s,"
                           "\"price_dkk_cent\": %s,"
                           "\"amount\": %s,"
                           "}",
                           product_id, name, price_dkk_cent, amount);

    char *buffer = malloc(size + 1);
    sprintf(buffer,
            "{"
            "\"product_id\": %s,"
            "\"name\": %s,"
            "\"price_dkk_cent\": %s,"
            "\"amount\": %s"
            "}",
            product_id, name, price_dkk_cent, amount);

    free(product_id);
    free(name);
    free(price_dkk_cent);
    free(amount);
    return buffer;
}
char *receipts_one_res_to_json_string(const ReceiptsOneRes *model);

int main(void) {
    ReceiptsOneResProducts prod = {
        .name = "expensive amper",
        .price_dkk_cent = 1000,
        .amount = 4,
        .product_id = 1,
    };
    char *str = receipts_one_res_products_to_json_string(&prod);
    printf("%s", str);
    free(str);
}
