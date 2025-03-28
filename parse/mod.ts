import * as parser from "./parser.out.js";
import { repr } from "../mod.ts";

export type ParseResult =
    | { ok: true; defs: repr.hir.Struct[] }
    | { ok: false; msg: string };

export function parseText(text: string, filename?: string): ParseResult {
    try {
        const defs = parser.parse(text, {
            grammarSource: filename,
        });
        return { ok: true, defs };
    } catch (e) {
        if (e instanceof parser.SyntaxError) {
            const msg = e.format([{ source: filename, text }]);
            return { ok: false, msg };
        }
        throw e;
    }
}

export async function parseFile(filename: string): Promise<ParseResult> {
    const text = await Deno.readTextFile(filename);
    try {
        const defs = parser.parse(text, {
            grammarSource: filename,
        });
        return { ok: true, defs };
    } catch (e) {
        if (e instanceof parser.SyntaxError) {
            const msg = e.format([{ source: filename, text }]);
            return { ok: false, msg };
        }
        throw e;
    }
}
