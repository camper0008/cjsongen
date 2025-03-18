import * as gen from "./gen/mod.ts";
import * as repr from "./repr/mod.ts";

if (import.meta.main) {
  const def: repr.hir.Struct[] = [
    {
      name: "receipts_one_res",
      values: {
        receipt_id: "int",
        timestamp: "str",
        products: [{
          product_id: "int",
          name: "str",
          price_dkk_cent: "int",
          amount: "int",
          twue: "bool",
        }],
      },
    },
  ] as const;

  const tree = def
    .map(repr.mir.fromHir)
    .map(repr.fromMir);

  console.log(tree.map(gen.typedef.structDef).join("\n\n"));
  console.log(tree.map(gen.json.serializerDef).join("\n\n"));
  console.log(tree.map(gen.json.serializerImpl).join("\n\n"));
}
