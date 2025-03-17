import { assertUnreachable } from "../../assert.ts";
import * as def from "../../repr/def.ts";
import * as imm from "../../repr/immediate.ts";
import * as node from "../../repr/node.ts";
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
  | { tag: node.RawNode["tag"]; type: node.RawNode["type"] };

function fnName(node: FnNameNode): string {
  switch (node.tag) {
    case "raw": {
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

function arrayFnDefinition(node: node.ArrayNode): string {
  return `char* ${fnName(node)}(const ${
    toTypeName(node.key)
  }* model, size_t size)`;
}

function structFnDefinition(node: node.StructNode): string {
  return `char* ${fnName(node)}(const ${toTypeName(node.key)}* model)`;
}

function fieldStatement(field: node.Node): string {
  const name = fieldName(field.key);
  const fn = fnName(field);
  switch (field.tag) {
    case "struct":
    case "raw": {
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
  let res = "  ";
  res += `const char* _format = "{`;
  const fields = node.fields
    .map((field) => `\\"${fieldName(field.key)}\\":%s`)
    .join(",");
  res += fields;
  res += '}";\n';
  return res;
}

function arrayItemToJsonStatement(node: node.ArrayNode, i: string) {
  const toJson = fnName({ tag: "struct", key: node.key });
  return `char* value = ${toJson}(&model[${i}])`;
}

function genImplArray(
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

function genImplStruct(
  node: node.StructNode,
): string {
  let res = "";
  res += `${structFnDefinition(node)} {\n`;
  res += formatVariableStatement(node);
  res += node.fields.map(fieldStatement).join("");
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

function gen(nodes: node.Node[]): string {
  return nodes
    .filter((node) => node.tag === "struct" || node.tag === "array")
    .map((node) =>
      node.tag === "struct" ? genImplStruct(node) : genImplArray(node)
    )
    .join("\n\n");
}

export function generateSer(structs: def.Struct[]): string {
  const nodes = structs
    .map(imm.fromDef)
    .map(node.fromRepr);
  const ser = nodes.map(gen);

  return ser.join("\n\n");
}
