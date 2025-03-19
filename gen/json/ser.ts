import { assertUnreachable } from "../../assert.ts";
import { ArrayNode, Node, StructNode } from "../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "../common.ts";
import { FnNameNode, toFnName } from "./common.ts";

function fnName(node: FnNameNode): string {
  switch (node.tag) {
    case "struct": {
      return `${toFnName(node.key)}_to_json`;
    }
    case "array": {
      return `${toFnName(node.key)}_to_json_array`;
    }
    default:
      assertUnreachable(node.tag);
  }
}

function arrayFnDefinition(node: ArrayNode, map: NodeMap): string {
  const data = map.get(node.data);
  let type;
  switch (data.tag) {
    case "struct":
    case "array":
      type = toTypeName(data.key);
      break;
    case "primitive": {
      switch (data.type) {
        case "str":
          type = "char*";
          break;
        case "int":
          type = "int64_t";
          break;
        case "bool":
          type = "bool";
          break;
        default:
          return assertUnreachable(data.type);
      }
      break;
    }
    default:
      return assertUnreachable(data);
  }
  return `char* ${fnName(node)}(const ${type}* model, size_t size)`;
}

function structFnDefinition(node: StructNode): string {
  return `char* ${fnName(node)}(const ${toTypeName(node.key)}* model)`;
}

function defineFieldStatement(field: ArrayNode | StructNode): string {
  switch (field.tag) {
    case "struct": {
      const fn = fnName(field);
      const name = toFieldName(field.key);
      return `  char* ${name} = ${fn}(model->${name});\n`;
    }
    case "array": {
      const fn = fnName(field);
      const name = toFieldName(field.key);
      return `  char* ${name} = ${fn}(model->${name}, model->${name}_size);\n`;
    }
    default:
      assertUnreachable(field);
  }
}

function freeStatement(field: ArrayNode | StructNode): string {
  return `  free(${toFieldName(field.key)});\n`;
}
function formatFieldSpread(fields: Node[]): string {
  return fields
    .map((field) => {
      if (field.tag !== "primitive") {
        return toFieldName(field.key);
      }
      switch (field.type) {
        case "str":
        case "int":
          return `model->${toFieldName(field.key)}`;
        case "bool":
          return `model->${toFieldName(field.key)} ? "true" : "false"`;
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
    return `\\"${toFieldName(node.key)}\\":${fmt}`;
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

function arrayItemDefineValue(
  node: ArrayNode | StructNode,
  i: string | number,
): string {
  switch (node.tag) {
    case "struct":
    case "array": {
      const toJson = fnName(node);
      return `char* value = ${toJson}(&model[${i}])`;
    }
    default:
      assertUnreachable(node);
  }
}

function arrayItemFormatString(
  node: Node,
): string {
  switch (node.tag) {
    case "struct":
    case "array": {
      return "%s";
    }
    case "primitive": {
      switch (node.type) {
        case "int":
          return `%ld`;
        case "str":
          return `\"%s\"`;
        case "bool":
          return `%s`;
        default:
          return assertUnreachable(node.type);
      }
    }
    default:
      assertUnreachable(node);
  }
}

function arrayItemFormatValue(
  node: Node,
  i: string,
): string {
  switch (node.tag) {
    case "struct":
    case "array": {
      return "value";
    }
    case "primitive": {
      switch (node.type) {
        case "int":
          return `model[${i}]`;
        case "str":
          return `model[${i}]`;
        case "bool":
          return `model[${i}] ? "true" : "false"`;
        default:
          return assertUnreachable(node.type);
      }
    }
    default:
      assertUnreachable(node);
  }
}

function arraySerializer(
  node: ArrayNode,
  map: NodeMap,
): string {
  const data = map.get(node.data);
  const fmtValue = (i: string | number) =>
    arrayItemFormatValue(data, i.toString());
  const fmtString = arrayItemFormatString(data);
  let res = "";
  res += `${arrayFnDefinition(node, map)} {\n`;

  res += "  if (size == 0) {\n";
  res += "    char* buffer = malloc(3);\n";
  res += "    *buffer = { '[', ']', '\0' };\n";
  res += "    return buffer;\n";
  res += "  }\n";

  if (data.tag !== "primitive") {
    res += `  ${arrayItemDefineValue(data, 0)};\n`;
  }
  res += `  size_t buffer_size = snprintf(NULL, 0, "[${fmtString}", ${
    fmtValue(0)
  });\n`;
  res += "  char* buffer = malloc(buffer_size + 1);\n";
  res += `  sprintf(buffer, "[${fmtString}", ${fmtValue(0)});\n`;
  if (data.tag !== "primitive") {
    res += "  free(value);";
  }

  res += "  for (size_t i = 1; i < size; ++i) {\n";
  if (data.tag !== "primitive") {
    res += `  ${arrayItemDefineValue(data, "i")};\n`;
  }
  res += "    char* temp = malloc(buffer_size + 1);\n";
  res += "    memcpy(temp, buffer, buffer_size + 1);\n";
  res += `\n`;
  res += `    buffer_size = snprintf(NULL, 0, "%s,${fmtString}", buffer, ${
    fmtValue("i")
  });\n`;
  res += "    buffer = realloc(buffer, buffer_size + 1);\n";
  res += `    sprintf(buffer, "%s,${fmtString}", temp, ${fmtValue("i")});\n`;
  res += `\n`;

  if (data.tag !== "primitive") {
    res += "    free(value);";
  }
  res += "    free(temp);\n";
  res += "  }\n";

  res += "  char* temp = malloc(buffer_size + 1);\n";
  res += "  memcpy(temp, buffer, buffer_size + 1);\n";
  res += '  buffer_size = snprintf(NULL, 0, "%s]", buffer);\n';
  res += "  buffer = realloc(buffer, buffer_size + 1);\n";
  res += '  sprintf(buffer, "%s]", temp_buffer);\n';
  res += "  free(temp);\n";

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

function definitions(nodes: Node[], map: NodeMap): string {
  return nodes
    .filter((node) => node.tag === "struct" || node.tag === "array")
    .map((node) =>
      node.tag === "struct"
        ? structFnDefinition(node)
        : arrayFnDefinition(node, map)
    )
    .map((v) => `${v};`)
    .join("\n");
}

function implentations(nodes: Node[], map: NodeMap): string {
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
  const map = new NodeMap(nodes);
  return definitions(nodes, map);
}

export function serializerImpl(nodes: Node[]): string {
  const map = new NodeMap(nodes);
  return implentations(nodes, map);
}
