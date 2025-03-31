import { printSql } from "./pprint.ts";
import { gen, parse, repr } from "./mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

function print(value: string = "", useColor = false) {
    printSql(value, useColor);
}

if (import.meta.main) {
    const flags = parseArgs(Deno.args, {
        boolean: ["color"],
    });
    if (flags._.length !== 1 && typeof flags._[0] !== "string") {
        console.error("error: no def-file specified");
        Deno.exit(1);
    }
    const filename = flags._[0] as string;

    const parseRes = await parse.parseFile(filename);
    if (!parseRes.ok) {
        console.error(parseRes.msg);
        Deno.exit(1);
    }
    const def = parseRes.defs;

    const useColor = flags.color;

    const tree = def
        .map(repr.mir.fromHir)
        .map(repr.fromMir);

    print(
        tree.map(gen.sql.sqlite.create).join("\n\n"),
        useColor,
    );
}
