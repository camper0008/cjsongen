import { Node, StructNode } from "../../../repr/node.ts";
import { NodeMap } from "../../nodemap.ts";
import { Output } from "../../output.ts";

function createStruct(node: StructNode, map: NodeMap): Output {
    return new Output();
}

export function create(node: Node[]): string {
    const map = new NodeMap(node);
    return node
        .filter((node) => node.tag === "struct")
        .map((node) => createStruct(node, map))
        .map((node) => node.eval())
        .join("\n");
}
