import { assertUnreachable } from "../../assert.ts";
import { Node, StructNode } from "../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "./common.ts";
import { Output } from "../output.ts";

class OutputTypedefExt extends Output {
    structFields(node: StructNode, map: NodeMap): void {
        node.fields
            .map((key) => map.get(key))
            .forEach((node) => this.structField(node, map));
    }

    private structField(node: Node, map: NodeMap): void {
        switch (node.tag) {
            case "struct":
                this.push(`${toTypeName(node.key)} ${toFieldName(node.key)};`);
                break;
            case "array": {
                const dataType = map.getType(node.data);
                this.push(`${dataType}* ${toFieldName(node.key)};`);
                this.push(`size_t ${toFieldName(node.key)}_size;`);
                break;
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
                this.push(`${type} ${toFieldName(node.key)};`);
            }
        }
    }
}

function struct(
    node: StructNode,
    map: NodeMap,
): Output {
    const out = new OutputTypedefExt();
    out.begin("typedef struct {");
    out.structFields(node, map);
    out.close(`} ${toTypeName(node.key)};`);
    return out;
}

export function structDef(node: Node[]): string {
    const map = new NodeMap(node);
    return node
        .filter((node) => node.tag === "struct")
        .map((node) => struct(node, map))
        .map((node) => node.eval())
        .join("\n");
}
