import * as def from "../repr/def.ts";
import * as imm from "../repr/immediate.ts";
import * as node from "../repr/node.ts";
import { NodeMap, stripComments, toTypeName } from "./common.ts";

function toFunctionName(name: string): string {
  const chars = stripComments(name).split("").toReversed();
  let res = "";
  while (true) {
    const char = chars.pop();
    if (!char) {
      break;
    }
    if (char === ".") {
      res += "_";
      continue;
    }
    const isUppercaseLetter = char.toUpperCase() === char &&
      char.toLowerCase() !== char.toUpperCase();
    if (isUppercaseLetter) {
      if (res.length > 0) {
        res += "_";
      }
      res += char.toLowerCase();
      continue;
    }
    res += char;
  }
  return res;
}

function functionDefinition(name: string): string {
  return `char* ${toFunctionName(name)}_to_json_string(const ${
    toTypeName(name)
  }* model${name.endsWith(".#array_data#") ? ", size_t size" : ""})`;
}

function genSerDef(
  node: node.StructNode,
): string {
  return `${functionDefinition(node.name)};`;
}

function genSerImplArray() {}

function genSerImpl(
  node: node.ArrayNode | node.StructNode,
  map: NodeMap,
): string {
  let res = "";
  res += `${functionDefinition(node.name)} {\n`;
  res += "";
  return res;
}

function genSer(nodes: node.Node[]): string {
  return nodes
    .filter((node) => node.tag === "struct")
    .map((node) => genSerDef(node))
    .join("\n");
}

export function generateSerde(structs: def.Struct[]): string {
  const nodes = structs
    .map(imm.fromDef)
    .map(node.fromRepr);
  const ser = nodes.map(genSer);

  return ser.join("\n");
}
