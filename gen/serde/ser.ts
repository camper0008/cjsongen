import { assertUnreachable } from "../../assert.ts";
import * as def from "../../repr/def.ts";
import * as imm from "../../repr/immediate.ts";
import * as node from "../../repr/node.ts";
import * as prims from "../../repr/primitives.ts";
import { fieldName, stripComments, toTypeName } from "../common.ts";

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
    tag: node.StructNode["tag"] | node.ArrayNode["tag"];
    key: node.Node["key"];
  }
  | { tag: node.PrimitiveNode["tag"]; type: node.PrimitiveNode["type"] };

function fnName(node: FnNameNode): string {
  switch (node.tag) {
    case "primitive": {
      const primitiveNames = {
        "char*": "str",
        "int64_t": "int64",
        "bool": "bool",
      } as const;
      return `${primitiveNames[node.type]}_to_json_primitive`;
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

function primitiveFnDefinition(
  node: FnNameNode & { tag: node.PrimitiveNode["tag"] },
): string {
  return `char* ${fnName(node)}(${node.type} value)`;
}

function primitiveFnImplementation(
  node: FnNameNode & { tag: node.PrimitiveNode["tag"] },
): string {
  let res = `char* ${fnName(node)}(${node.type} value) {\n`;
  switch (node.type) {
    case "char*":
      res += '  size_t size = snprintf(NULL, 0, "\\"%s\\"", value);\n';
      res += "  char* buffer = malloc(size + 1);\n";
      res += '  sprintf(buffer, "\\"%s\\"", value);\n';
      res += "  return buffer;\n";
      break;
    case "int64_t":
      res += '  size_t size = snprintf(NULL, 0, "%ld", value);\n';
      res += "  char* buffer = malloc(size + 1);\n";
      res += '  sprintf(buffer, "%ld", value);\n';
      res += "  return buffer;\n";
      break;
    case "bool":
      res +=
        '  size_t size = snprintf(NULL, 0, "%s", value ? "true" : "false");\n';
      res += "  char* buffer = malloc(size + 1);\n";
      res += '  sprintf(buffer, "%s", value, value ? "true" : "false");\n';
      res += "  return buffer;\n";
  }
  res += "}";

  return res;
}

function arrayFnDefinition(node: node.ArrayNode): string {
  return `char* ${fnName(node)}(const ${
    toTypeName(node.key)
  }* model, size_t size)`;
}

function structFnDefinition(node: node.StructNode): string {
  return `char* ${fnName(node)}(const ${toTypeName(node.key)}* model)`;
}

function defineFieldStatement(field: node.Node): string {
  const name = fieldName(field.key);
  const fn = fnName(field);
  switch (field.tag) {
    case "struct":
    case "primitive": {
      return `  char* ${name} = ${fn}(model->${name});\n`;
    }
    case "array": {
      return `  char* ${name} = ${fn}(model->${name}, model->${name}_size);\n`;
    }
    default:
      assertUnreachable(field);
  }
}

function freeStatement(field: node.Node): string {
  return `  free(${fieldName(field.key)});\n`;
}
function fieldSpread(fields: node.Node[]): string {
  return fields.map((field) => fieldName(field.key)).join(", ");
}

function formatVariableStatement(node: node.StructNode): string {
  let res = "";
  res += `const char* _format = "{`;
  const fields = node.fields
    .map((field) => `\\"${fieldName(field.key)}\\":%s`)
    .join(",");
  res += fields;
  res += '}"';
  return res;
}

function arrayItemToJsonStatement(node: node.ArrayNode, i: string) {
  const toJson = fnName({ tag: "struct", key: node.key });
  return `char* value = ${toJson}(&model[${i}])`;
}

function arraySerializer(
  node: node.ArrayNode,
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
  res += '    sprintf(buffer, "%s,%s", buffer, value);\n';
  res += "    free(value);\n";
  res += "  }\n";

  res += '  buffer_size = snprintf(NULL, 0, "%s]", buffer);\n';
  res += "  buffer = realloc(buffer, buffer_size + 1);\n";
  res += '  sprintf(buffer, "%s]", buffer);\n';

  res += `  return buffer;\n`;
  res += "}";
  return res;
}

function structSerializer(
  node: node.StructNode,
): string {
  let res = "";
  res += `${structFnDefinition(node)} {\n`;
  res += `  ${formatVariableStatement(node)};\n`;
  res += node.fields.map(defineFieldStatement).join("");
  res += `  size_t _size = snprintf(NULL, 0, _format, ${
    fieldSpread(node.fields)
  });\n`;
  res += `  char* _buffer = malloc(_size + 1);\n`;
  res += `  sprintf(_buffer, _format, ${fieldSpread(node.fields)});\n`;
  res += node.fields.map(freeStatement).join("");
  res += `  return _buffer;\n`;
  res += "}";
  return res;
}

function defs(nodes: node.Node[]): string {
  return nodes
    .filter((node) => node.tag === "struct" || node.tag === "array")
    .map((node) =>
      node.tag === "struct" ? structFnDefinition(node) : arrayFnDefinition(node)
    )
    .map((v) => `${v};`)
    .join("\n");
}

function impls(nodes: node.Node[]): string {
  return nodes
    .filter((node) => node.tag === "struct" || node.tag === "array")
    .map((node) =>
      node.tag === "struct" ? structSerializer(node) : arraySerializer(node)
    )
    .join("\n\n");
}

export function serializerPreludeDefinitions(): string {
  const primitives = prims.primitives
    .map((type) => ({ tag: "primitive", type } as const))
    .map(primitiveFnDefinition)
    .map((v) => `${v};`)
    .join("\n");

  return primitives;
}

export function serializerDefinitions(structs: def.Struct[]): string {
  const nodes = structs
    .map(imm.fromDef)
    .map(node.fromRepr);
  const ser = nodes.map(defs);

  return ser.join("\n");
}

export function serializerPreludeImplementations(): string {
  const primitives = prims.primitives
    .map((type) => ({ tag: "primitive", type } as const))
    .map(primitiveFnImplementation)
    .join("\n\n");

  return primitives;
}

export function serializerImplementations(structs: def.Struct[]): string {
  const nodes = structs
    .map(imm.fromDef)
    .map(node.fromRepr);
  const ser = nodes.map(impls);

  return ser.join("\n\n");
}
