#include <stddef.h>
#include <stdint.h>

typedef struct {
  int64_t product_id;
  char *name;
  int64_t price_dkk_cent;
  int64_t amount;
} ReceiptsOneResProductsData;

typedef struct {
  int64_t receipt_id;
  char *timestamp;
  ReceiptsOneResProductsData *products;
  size_t products_size;
} ReceiptsOneRes;

char *receipts_one_res_products_data_to_json_string(
    const ReceiptsOneResProductsData *model);
char *receipts_one_res_to_json_string(const ReceiptsOneRes *model);
