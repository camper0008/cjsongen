import { gen, repr } from "./mod.ts";

if (import.meta.main) {
  const def: repr.hir.Struct[] = [
    {
      name: "receipts_one_res",
      values: {
        v: ["bool"],
      },
    },
  ] as const;

  const tree = def
    .map(repr.mir.fromHir)
    .map(repr.fromMir);

  console.log(tree.map(gen.typedef.structDef).join("\n\n"));
  console.log();
  console.log(tree.map(gen.json.serializerDef).join("\n\n"));
  console.log();
  console.log(tree.map(gen.json.serializerImpl).join("\n\n"));
}
