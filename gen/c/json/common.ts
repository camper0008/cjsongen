import { ArrayNode, Node, StructNode } from "../../../repr/node.ts";
import { stripComments } from "../common.ts";

export function toFnName(name: string): string {
    const chars = stripComments(name).split("").toReversed();
    let res = "";
    while (true) {
        const char = chars.pop();
        if (!char) {
            break;
        }
        if (char === ".") {
            res += "_";
            continue;
        }
        const isUppercaseLetter = char.toUpperCase() === char &&
            char.toLowerCase() !== char.toUpperCase();
        if (isUppercaseLetter) {
            if (res.length > 0) {
                res += "_";
            }
            res += char.toLowerCase();
            continue;
        }
        res += char;
    }
    return res;
}

export type FnNameNode = {
    tag: StructNode["tag"] | ArrayNode["tag"];
    key: Node["key"];
};
