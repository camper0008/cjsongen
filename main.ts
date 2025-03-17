import { Struct } from "./repr/def.ts";
import { generateStructs } from "./gen/typedef.ts";
import { generateSerde } from "./gen/serde.ts";

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
          nested: {
            value: str,
          },
          amount: int,
        }],
      },
    },
  ];

  console.log(generateSerde(tree));
  console.log(generateStructs(tree));
}
