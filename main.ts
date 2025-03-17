import { Struct } from "./repr/def.ts";
import { generateStructs } from "./gen/typedef.ts";
import {
  serializerDefinitions,
  serializerImplementations,
  serializerPreludeDefinitions,
  serializerPreludeImplementations,
} from "./gen/serde/ser.ts";

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

  console.log(generateStructs(tree));
  console.log();
  console.log(serializerPreludeDefinitions());
  console.log(serializerDefinitions(tree));
  console.log();
  console.log(serializerPreludeImplementations());
  console.log();
  console.log(serializerImplementations(tree));
}
