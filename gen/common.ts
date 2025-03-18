import { assertUnreachable, fatal } from "../assert.ts";
import { Node } from "../repr/node.ts";

export class NodeMap {
  inner: Map<string, Node>;

  constructor(nodes: Node[]) {
    this.inner = new Map();
    for (const node of nodes) {
      if (this.inner.has(node.key)) {
        fatal(`encountered duplicate name '${node.key}'`);
      }
      this.inner.set(node.key, node);
    }
  }
  get(key: string): Node {
    const gotten = this.inner.get(key);
    if (!gotten) {
      fatal(`encountered non-existant node '${key}'`);
    }
    return gotten;
  }
  getType(key: string): string {
    const node = this.get(key);
    switch (node.tag) {
      case "array":
      case "struct":
        return toTypeName(node.key);
      case "primitive":
        switch (node.type) {
          case "str":
            return "char*";
          case "int":
            return "int64_t";
          case "bool":
            return "bool";
          default:
            return assertUnreachable(node.type);
        }
      default:
        assertUnreachable(node);
    }
  }
}

export function fieldName(name: string): string {
  const last = stripComments(name).split(".").pop();
  if (!last) {
    fatal(`encountered invalid field name '${last}'`);
  }
  return last;
}

export function toTypeName(name: string) {
  const chars = stripComments(name).split("").toReversed();
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
      return toTypeName(node.key);
    case "primitive":
      return node.type;
    default:
      assertUnreachable(node);
  }
}

export function stripComments(name: string): string {
  return name.replaceAll(".#array_data#", "");
}
