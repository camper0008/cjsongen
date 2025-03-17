import * as def from "../repr/def.ts";
import * as imm from "../repr/immediate.ts";
import * as node from "../repr/node.ts";
import { getType, key, nodeMap, stripComments, toTypeName } from "./common.ts";

function nodeField(node: node.Node, map: Map<string, node.Node>): string {
  switch (node.tag) {
    case "struct":
      return `  ${toTypeName(node.name)} ${key(node.name)};`;
    case "array": {
      const dataType = getType(node.name, map);
      let res = "";
      res += `  ${dataType} *${key(node.name)};\n`;
      res += `  size_t ${key(node.name)}_size;`;
      return res;
    }
    case "raw":
      return `  ${node.type} ${key(node.name)};`;
  }
}

function genNodeStruct(
  node: node.StructNode,
  map: Map<string, node.Node>,
): string {
  let res = "";
  res += "typedef struct {\n";
  res += node.fields.map((node) => nodeField(node, map)).join("\n");
  res += `\n} ${toTypeName(node.name)};`;
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
    .map(stripComments)
    .map(structsFromNodes)
    .join("\n");
}
