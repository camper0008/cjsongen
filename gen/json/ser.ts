import { assertUnreachable, fatal } from "../../assert.ts";
import { ArrayNode, Node, PrimitiveNode, StructNode } from "../../repr/node.ts";
import {
  fieldName,
  NodeMap,
  nodeMap,
  stripComments,
  toTypeName,
} from "../common.ts";

function toFnName(name: string): string {
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

type FnNameNode =
  | {
    tag: StructNode["tag"] | ArrayNode["tag"];
    key: Node["key"];
  }
  | { tag: PrimitiveNode["tag"]; type: PrimitiveNode["type"] };

function fnName(node: FnNameNode): string {
  switch (node.tag) {
    case "primitive": {
      return fatal(`tried to get primitive fn for primitive ${node.type}`);
    }
    case "struct": {
      return `${toFnName(node.key)}_to_json`;
    }
    case "array": {
      return `${toFnName(node.key)}_to_json_array`;
    }
    default:
      assertUnreachable(node);
  }
}

function arrayFnDefinition(node: ArrayNode): string {
  return `char* ${fnName(node)}(const ${
    toTypeName(node.key)
  }* model, size_t size)`;
}

function structFnDefinition(node: StructNode): string {
  return `char* ${fnName(node)}(const ${toTypeName(node.key)}* model)`;
}

function defineFieldStatement(field: ArrayNode | StructNode): string {
  switch (field.tag) {
    case "struct": {
      const fn = fnName(field);
      const name = fieldName(field.key);
      return `  char* ${name} = ${fn}(model->${name});\n`;
    }
    case "array": {
      const fn = fnName(field);
      const name = fieldName(field.key);
      return `  char* ${name} = ${fn}(model->${name}, model->${name}_size);\n`;
    }
    default:
      assertUnreachable(field);
  }
}

function freeStatement(field: ArrayNode | StructNode): string {
  return `  free(${fieldName(field.key)});\n`;
}
function formatFieldSpread(fields: Node[]): string {
  return fields
    .map((field) => {
      if (field.tag !== "primitive") {
        return fieldName(field.key);
      }
      switch (field.type) {
        case "str":
        case "int":
          return `model->${fieldName(field.key)}`;
        case "bool":
          return `model->${fieldName(field.key)} ? "true" : "false"`;
        default:
          assertUnreachable(field.type);
      }
    })
    .join(", ");
}

function formatVariableStatement(node: StructNode, map: NodeMap): string {
  function nodeFormat(node: Node): string {
    let fmt;
    switch (node.tag) {
      case "struct":
      case "array": {
        fmt = "%s";
        break;
      }
      case "primitive": {
        switch (node.type) {
          case "str":
            fmt = '\\"%s\\"';
            break;
          case "int":
            fmt = "%ld";
            break;
          case "bool":
            fmt = "%s";
            break;
          default:
            return assertUnreachable(node.type);
        }
        break;
      }
      default:
        assertUnreachable(node);
    }
    return `\\"${fieldName(node.key)}\\":${fmt}`;
  }
  let res = "";
  res += `const char* _format = "{`;
  const fields = node.fields
    .map((key) => map.get(key))
    .map((node) => nodeFormat(node))
    .join("");
  res += fields;
  res += '}"';
  return res;
}

function arrayItemToJsonStatement(node: ArrayNode, i: string) {
  const toJson = fnName({ tag: "struct", key: node.key });
  return `char* value = ${toJson}(&model[${i}])`;
}

function arraySerializer(
  node: ArrayNode,
  map: NodeMap,
): string {
  let res = "";
  res += `${arrayFnDefinition(node)} {\n`;

  res += `  ${arrayItemToJsonStatement(node, "0")};\n`;
  res += '  size_t buffer_size = snprintf(NULL, 0, "[%s", value);\n';
  res += "  char* buffer = malloc(buffer_size + 1);\n";
  res += '  sprintf(buffer, "[%s", value);\n';
  res += "  free(value);\n";

  res += "  for (size_t i = 1; i < size; ++i) {\n";
  res += `    ${arrayItemToJsonStatement(node, "i")};\n`;
  res += '    buffer_size = snprintf(NULL, 0, "%s,%s", buffer, value);\n';
  res += "    buffer = realloc(buffer, buffer_size + 1);\n";
  res += "    temp = malloc(buffer_size + 1);\n";
  res += "    memcpy(temp, buffer, buffer_size + 1);\n";
  res += '    sprintf(buffer, "%s,%s", temp, value);\n';
  res += "    free(value);\n";
  res += "    free(temp);\n";
  res += "  }\n";

  res += '  buffer_size = snprintf(NULL, 0, "%s]", buffer);\n';
  res += "  buffer = realloc(buffer, buffer_size + 1);\n";
  res += '  sprintf(buffer, "%s]", buffer);\n';

  res += `  return buffer;\n`;
  res += "}";
  return res;
}

function structSerializer(
  node: StructNode,
  map: NodeMap,
): string {
  let res = "";
  res += `${structFnDefinition(node)} {\n`;
  res += `  ${formatVariableStatement(node, map)};\n`;
  res += node.fields
    .map((key) => map.get(key))
    .filter((node) => node.tag !== "primitive")
    .map(defineFieldStatement)
    .join("");
  res += `  size_t _size = snprintf(NULL, 0, _format, ${
    formatFieldSpread(node.fields.map((key) => map.get(key)))
  });\n`;
  res += `  char* _buffer = malloc(_size + 1);\n`;
  res += `  sprintf(_buffer, _format, ${
    formatFieldSpread(node.fields.map((key) => map.get(key)))
  });\n`;
  res += node.fields
    .map((key) => map.get(key))
    .filter((node) => node.tag !== "primitive")
    .map(freeStatement)
    .join("");
  res += `  return _buffer;\n`;
  res += "}";
  return res;
}

function defs(nodes: Node[]): string {
  return nodes
    .filter((node) => node.tag === "struct" || node.tag === "array")
    .map((node) =>
      node.tag === "struct" ? structFnDefinition(node) : arrayFnDefinition(node)
    )
    .map((v) => `${v};`)
    .join("\n");
}

function impls(nodes: Node[], map: NodeMap): string {
  return nodes
    .filter((node) => node.tag === "struct" || node.tag === "array")
    .map((node) =>
      node.tag === "struct"
        ? structSerializer(node, map)
        : arraySerializer(node, map)
    )
    .join("\n\n");
}

export function serializerDef(nodes: Node[]): string {
  return defs(nodes);
}

export function serializerImpl(nodes: Node[]): string {
  const map = new NodeMap(nodes);
  return impls(nodes, map);
}
