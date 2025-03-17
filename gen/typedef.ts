import * as def from "../repr/def.ts";
import * as imm from "../repr/immediate.ts";
import * as node from "../repr/node.ts";
import { fieldName, getType, nodeMap, toTypeName } from "./common.ts";

function nodeField(node: node.Node, map: Map<string, node.Node>): string {
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
    case "raw":
      return `  ${node.type} ${fieldName(node.key)};`;
  }
}

function genNodeStruct(
  node: node.StructNode,
  map: Map<string, node.Node>,
): string {
  let res = "";
  res += "typedef struct {\n";
  res += node.fields.map((node) => nodeField(node, map)).join("\n");
  res += `\n} ${toTypeName(node.key)};`;
  return res;
}

function structsFromNodes(nodes: node.Node[]): string {
  const map = nodeMap(nodes);
  return nodes
    .filter((v) => v.tag === "struct")
    .map((n) => genNodeStruct(n, map))
    .join("\n\n");
}

export function generateStructs(structs: def.Struct[]): string {
  return structs
    .map(imm.fromDef)
    .map(node.fromRepr)
    .map(structsFromNodes)
    .join("\n");
}
