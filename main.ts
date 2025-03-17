import { generateStructs } from "./gen.ts";

if (import.meta.main) {
  const int = "int64_t";
  const str = "char*";

  const res = generateStructs([
    {
      name: "receipts_one_res",
      values: {
        receipt_id: int,
        timestamp: str,
        products: [{
          product_id: int,
          name: str,
          price_dkk_cent: int,
          nested: {
            value: str,
          },
          amount: int,
        }],
      },
    },
  ]);
  console.log(res);
}
