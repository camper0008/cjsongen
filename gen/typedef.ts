import { Node, StructNode } from "../repr/node.ts";
import { fieldName, getType, NodeMap, toTypeName } from "./common.ts";

function nodeField(node: Node, map: NodeMap): string {
  switch (node.tag) {
    case "struct":
      return `  ${toTypeName(node.key)} ${fieldName(node.key)};`;
    case "array": {
      const dataType = getType(node.key, map);
      let res = "";
      res += `  ${dataType} *${fieldName(node.key)};\n`;
      res += `  size_t ${fieldName(node.key)}_size;`;
      return res;
    }
    case "primitive":
      return `  ${node.type} ${fieldName(node.key)};`;
  }
}

function genNodeStruct(
  node: StructNode,
  map: NodeMap,
): string {
  let res = "";
  res += "typedef struct {\n";
  res += node.fields.map((node) => nodeField(map.get(node), map)).join("\n");
  res += `\n} ${toTypeName(node.key)};`;
  return res;
}

function structsFromNodes(nodes: Node[]): string {
  const map = new NodeMap(nodes);
  return nodes
    .filter((v) => v.tag === "struct")
    .map((n) => genNodeStruct(n, map))
    .join("\n\n");
}

export function structDef(node: Node[]): string {
  return structsFromNodes(node);
}
