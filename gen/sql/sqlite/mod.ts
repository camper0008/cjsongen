export function create(node: Node[]): string {
    const map = new NodeMap(node);
    return node
        .filter((node) => node.tag === "struct")
        .map((node) => struct(node, map))
        .map((node) => node.eval())
        .join("\n");
}

