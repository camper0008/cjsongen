import { assertUnreachable } from "../../assert.ts";
import { Node, StructNode } from "../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "./common.ts";

function structField(node: Node, map: NodeMap): string {
    switch (node.tag) {
        case "struct":
            return `  ${toTypeName(node.key)} ${toFieldName(node.key)};`;
        case "array": {
            const dataType = map.getType(node.data);
            let res = "";
            res += `  ${dataType}* ${toFieldName(node.key)};\n`;
            res += `  size_t ${toFieldName(node.key)}_size;`;
            return res;
        }
        case "primitive": {
            let type;
            switch (node.type) {
                case "str":
                    type = "char*";
                    break;
                case "int":
                    type = "int64_t";
                    break;
                case "bool":
                    type = "bool";
                    break;
                default:
                    assertUnreachable(node.type);
            }
            return `  ${type} ${toFieldName(node.key)};`;
        }
    }
}

function struct(
    node: StructNode,
    map: NodeMap,
): string {
    let res = "";
    res += "typedef struct {\n";
    res += node.fields
        .map((key) => map.get(key))
        .map((node) => structField(node, map))
        .join("\n");
    res += `\n} ${toTypeName(node.key)};`;
    return res;
}

function structsFromNodes(nodes: Node[]): string {
    const map = new NodeMap(nodes);
    return nodes
        .filter((v) => v.tag === "struct")
        .map((node) => struct(node, map))
        .join("\n\n");
}

export function structDef(node: Node[]): string {
    return structsFromNodes(node);
}
