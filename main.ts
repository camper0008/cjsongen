import { colorPrint } from "./colored_c.ts";
import { gen, repr } from "./mod.ts";

function pprint(value: string = "", useColor = false) {
  if (useColor) {
    colorPrint(value);
  } else {
    console.log(value);
  }
}

if (import.meta.main) {
  const useColor = Deno.args.includes("--color");

  const def: repr.hir.Struct[] = [
    {
      name: "receipts_one_res",
      values: {
        v: "str",
        x: ["str"],
      },
    },
  ] as const;

  const tree = def
    .map(repr.mir.fromHir)
    .map(repr.fromMir);

  pprint(
    tree.map(gen.c.typedef.structDef).join("\n\n"),
    useColor,
  );
  pprint();
  pprint(tree.map(gen.c.json.deserializerDef).join("\n\n"), useColor);
  pprint();
  pprint(tree.map(gen.c.json.deserializerImpl).join("\n\n"), useColor);
}
