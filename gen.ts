import { assertUnreachable, fatal } from "./assert.ts";
import * as def from "./repr/def.ts";
import * as imm from "./repr/immediate.ts";
import * as node from "./repr/node.ts";

function key(name: string): string {
  const last = name.split(".").pop();
  if (!last) {
    fatal(`encountered invalid field name '${last}'`);
  }
  return last;
}

function toTypeName(name: string) {
  const chars = name.split("").toReversed();
  let result = "";
  let toUpper = true;
  while (true) {
    const char = chars.pop();
    if (!char) {
      break;
    }
    if (char === "_" || char === ".") {
      toUpper = true;
      continue;
    }
    if (toUpper) {
      result += char.toUpperCase();
    } else {
      result += char;
    }
    toUpper = false;
  }
  return result;
}

function getType(name: string, map: Map<string, node.Node>) {
  const node = map.get(name);
  if (!node) fatal(`attempted to access invalid field '${name}'`);
  switch (node.tag) {
    case "array":
    case "struct":
      return toTypeName(node.name);
    case "raw":
      return node.type;
    default:
      assertUnreachable(node);
  }
}

function nodeField(node: node.Node, map: Map<string, node.Node>): string {
  switch (node.tag) {
    case "struct":
      return `  ${toTypeName(node.name)} ${key(node.name)}`;
    case "array": {
      const dataType = getType(node.data, map);
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
  res += `\n} ${toTypeName(node.name)}`;
  return res;
}

function nodeMap(nodes: node.Node[]): Map<string, node.Node> {
  const map = new Map();
  for (const node of nodes) {
    if (map.has(node.name)) {
      throw new Error(`fatal: encountered duplicate  name '${node.name}'`);
    }
    map.set(node.name, node);
  }
  return map;
}

function fromNodes(nodes: node.Node[]): string {
  console.log(nodes);
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
    .map(fromNodes).join("\n");
}
