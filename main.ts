import { Struct } from "./repr/def.ts";
import { generateStructs } from "./gen/typedef.ts";
import { generateSer } from "./gen/serde/ser.ts";

if (import.meta.main) {
  const int = "int64_t";
  const str = "char*";

  const tree: Struct[] = [
    {
      name: "receipts_one_res",
      values: {
        receipt_id: int,
        timestamp: str,
        products: [{
          product_id: int,
          name: str,
          price_dkk_cent: int,
          amount: int,
        }],
      },
    },
  ];

  console.log(generateSer(tree));
  console.log(generateStructs(tree));
}
