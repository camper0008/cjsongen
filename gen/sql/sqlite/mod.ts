import { ArrayNode, Node, StructNode } from "../../../repr/node.ts";
import { NodeMap } from "../../nodemap.ts";
import { Output } from "../../output.ts";

function createArray(node: ArrayNode, map: NodeMap): Output {
    const out = new Output();
    out.push(node.key);
    return out;
}

function createStruct(node: StructNode, map: NodeMap): Output {
    const out = new Output();
    out.push(node.key);
    return out;
}

export function create(node: Node[]): string {
    const map = new NodeMap(node);
    return node
        .filter((node) => node.tag === "struct" || node.tag === "array")
        .map((node) =>
            node.tag === "struct"
                ? createStruct(node, map)
                : createArray(node, map)
        )
        .map((node) => node.eval())
        .join("\n");
}
