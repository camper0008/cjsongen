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

function defineFieldStatement(
  field: Node,
  indent: number,
  idx: number,
): string {
  const i = " ".repeat(indent * 2);
  const i2 = " ".repeat((indent + 1) * 2);
  const fn = fnName(field);
  const name = toFieldName(field.key);
  const elseOrIndent = idx === 0 ? i : "else ";
  return "" +
    `${elseOrIndent}if (strcmp(key, "${name}") == 0) {\n` +
    `${i2}found_fields_bitmask |= (1 << ${idx});\n` +
    `${i2}res = ${fn}(ctx, &model->${name});\n` +
    `${i2}${returnIfNotOk()}\n` +
    `${i}} `;
}

function arrayDeserializer(
  node: ArrayNode,
  map: NodeMap,
): string {
  // const data = map.get(node.data);
  let res = "";
  res += `${arrayFnDefinition(node, map)} {\n`;
  res += "  DeCtxResult res;\n";
  res += `  res = de_ctx_expect_char(ctx, '[', "${node.key}");\n`;
  res += `  ctx->idx += 1;\n`;
  res += `  res = de_ctx_expect_not_done(ctx, "${node.key}");\n`;
  res += `  ${returnIfNotOk()}\n`;
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
  res += "  DeCtxResult res;\n";
  res += `  res = de_ctx_expect_char(ctx, '{', "${node.key}");\n`;
  res += `  ${returnIfNotOk()}\n`;
  res += `  size_t found_fields_bitmask = 0;\n`;
  res += `  while (true) {\n`;
  res += `    char* key;\n`;
  res += `    res = de_ctx_deserialize_str(ctx, &key);\n`;
  res += `    ${returnIfNotOk()}\n`;
  res += `    res = de_ctx_expect_char(ctx, ':', "${node.key}");\n`;
  res += `    ${returnIfNotOk()}\n`;
  res += "    ctx->idx += 1;\n";
  res += "\n";
  res += node.fields
    .map((key) => map.get(key))
    .map((x, i) => defineFieldStatement(x, 2, i))
    .join("");
  res += "else {\n";
  res +=
    "      snprintf(ctx->error, DE_CTX_ERROR_SIZE, \"got invalid key '%s'\", key);\n";
  res += "      free(key);\n";
  res += "      return DeCtxResult_BadInput;\n";

  res += "    }\n";
  res += "    free(key);\n";
  res += "    de_ctx_skip_whitespace(ctx);\n";
  res += `    res = de_ctx_expect_not_done(ctx, "${node.key}");\n`;
  res += `    ${returnIfNotOk()}\n`;
  res += `    char curr = ctx->input[ctx->idx];\n`;
  res += `    if (curr == ',') { continue; }\n`;
  res += `    res = de_ctx_expect_char(ctx, '}', "${node.key}");\n`;
  res += `    ${returnIfNotOk()}\n`;
  res += "    break;\n";
  res += "  }\n";
  res += `  if (found_fields_bitmask != 0b${
    "1".repeat(node.fields.length)
  }) {\n`;
  res += '      snprintf(ctx->error, DE_CTX_ERROR_SIZE, "missing fields");\n';
  res += "      return DeCtxResult_BadInput;\n";
  res += "  }\n";
  res += "  ctx->idx += 1;\n";
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

function implementations(nodes: Node[], map: NodeMap): string {
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
  const warning =
    "// WARNING: current implementation does not free allocated values if\n" +
    '//          keys are duplicated. i.e. {"key": "val1", "key": "val2"}\n' +
    '//          will not deallocate "val1" - same goes for structs and arrays\n' +
    "//          possible solutions include:\n" +
    "//          1. freeing (maybe hard) 2. disallowing duplicated keys (easy)\n\n";
  const map = new NodeMap(nodes);
  return warning + implementations(nodes, map);
}
