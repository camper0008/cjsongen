#include <stddef.h>
#include <stdint.h>

typedef struct {
    int64_t product_id;
    char* name;
    int64_t price_dkk_cent;
    int64_t amount;
} ReceiptsOneResProducts;

typedef struct {
    int64_t receipt_id;
    char* timestamp;
    ReceiptsOneResProducts* products;
    size_t products_size;
} ReceiptsOneRes;

char* str_to_json_primitive(char* ptr);
char* int64_to_json_primitive(int64_t value);
char* receipts_one_res_products_to_json_array(
    const ReceiptsOneResProducts* model, size_t size);
char* receipts_one_res_products_to_json(const ReceiptsOneResProducts* model);
char* receipts_one_res_to_json(const ReceiptsOneRes* model);
