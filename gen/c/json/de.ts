import { assertUnreachable } from "../../../assert.ts";
import { ArrayNode, Node, StructNode } from "../../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "../common.ts";
import { toFnName } from "./common.ts";

function returnIfNotOk(): "if (res != DbCtxResult_Ok) { return res; }" {
  return "if (res != DbCtxResult_Ok) { return res; }";
}

function fnName(node: Node): string {
  switch (node.tag) {
    case "struct": {
      return `${toFnName(node.key)}_from_json`;
    }
    case "array": {
      return `${toFnName(node.key)}_from_json_array`;
    }
    case "primitive": {
      switch (node.type) {
        case "str":
          return "de_ctx_deserialize_str";
        case "int":
          return "de_ctx_deserialize_int";
        case "bool":
          return "de_ctx_deserialize_bool";
        default:
          return assertUnreachable(node.type);
      }
    }
    default:
      assertUnreachable(node);
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
  return `DeCtxResult ${
    fnName(node)
  }(DeCtx* ctx, ${type}** model, size_t* size)`;
}

function structFnDefinition(node: StructNode): string {
  return `DeCtxResult ${fnName(node)}(DeCtx* ctx, ${
    toTypeName(node.key)
  }* model)`;
}

function defineFieldStatement(field: Node, level: number): string {
  const i = " ".repeat(level * 2);
  const fn = fnName(field);
  const name = toFieldName(field.key);
  switch (field.tag) {
    case "primitive":
    case "struct": {
      return "" +
        `${i}res = ${fn}(ctx, &model->${name});\n` +
        `${i}${returnIfNotOk()}\n`;
    }
    case "array": {
      return "" +
        `${i}res = ${fn}(ctx, &model->${name});\n` +
        `${i}${returnIfNotOk()}\n`;
    }
    default:
      assertUnreachable(field);
  }
}

function arrayDeserializer(
  node: ArrayNode,
  map: NodeMap,
): string {
  // const data = map.get(node.data);
  let res = "";
  res += `${arrayFnDefinition(node, map)} {\n`;
  res += "  return DeCtxResult_Ok;\n";
  res += "}";
  return res;
}

function structDeserializer(
  node: StructNode,
  map: NodeMap,
): string {
  let res = "";
  res += `${structFnDefinition(node)} {\n`;
  res += "  de_ctx_skip_whitespace(ctx);\n";
  res += "  DeCtxResult res;\n";
  res += `  res = de_ctx_expect_char(ctx, '{', "${toTypeName(node.key)}");\n`;
  res += `  ${returnIfNotOk()}\n`;
  res += `  size_t found_fields_bitmask = 0;\n`;
  res += `  while (true) {\n`;
  res += `    char* key;\n`;
  res += `    res = de_ctx_deserialize_str(ctx, &key);\n`;
  res += `    ${returnIfNotOk()}\n`;
  res += node.fields
    .map((key) => map.get(key))
    .map((x) => defineFieldStatement(x, 2))
    .join("");
  res += "  }\n";
  res += "  return DeCtxResult_Ok;\n";
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
        ? structDeserializer(node, map)
        : arrayDeserializer(node, map)
    )
    .join("\n\n");
}

export function deserializerDef(nodes: Node[]): string {
  const map = new NodeMap(nodes);
  return definitions(nodes, map);
}

export function deserializerImpl(nodes: Node[]): string {
  const map = new NodeMap(nodes);
  return implentations(nodes, map);
}
