import { assertUnreachable, fatal } from "../assert.ts";
import { Node } from "../repr/node.ts";

export type NodeMap = Map<string, Node>;

export function nodeMap(nodes: Node[]): NodeMap {
  const map = new Map();
  for (const node of nodes) {
    if (map.has(node.name)) {
      throw new Error(`fatal: encountered duplicate name '${node.name}'`);
    }
    map.set(node.name, node);
  }
  return map;
}

export function key(name: string): string {
  const last = name.split(".").pop();
  if (!last) {
    fatal(`encountered invalid field name '${last}'`);
  }
  return last;
}

export function toTypeName(name: string) {
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

export function getType(name: string, map: NodeMap) {
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

export function stripComments(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const name = node.name.replaceAll("#array", "");
    switch (node.tag) {
      case "struct":
        return { tag: node.tag, name, fields: stripComments(node.fields) };
      case "array":
      case "raw":
        return { ...node, name };
    }
  });
}
