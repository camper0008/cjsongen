import { printC } from "./pprint.ts";
import { gen, repr } from "./mod.ts";

function print(value: string = "", useColor = false) {
  printC(value, useColor);
}

if (import.meta.main) {
  const useColor = Deno.args.includes("--color");

  const def: repr.hir.Struct[] = [
    {
      name: "invitation",
      values: {
        names: ["int"],
      },
    },
  ] as const;

  const tree = def
    .map(repr.mir.fromHir)
    .map(repr.fromMir);

  print(
    tree.map(gen.c.typedef.structDef).join("\n\n"),
    useColor,
  );
  print();
  print(tree.map(gen.c.json.serializerDef).join("\n\n"), useColor);
  print();
  print(tree.map(gen.c.json.serializerImpl).join("\n\n"), useColor);
}
