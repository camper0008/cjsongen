import { assertUnreachable } from "../../../assert.ts";
import {
    ArrayNode,
    Node,
    PrimitiveNode,
    StructNode,
} from "../../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "../common.ts";
import { toFnName } from "./common.ts";

function returnIfNotOk(): string {
    return "if (res != DbCtxResult_Ok) { return res; }";
}

function destroyPrimitiveFn(node: PrimitiveNode): string | null {
    switch (node.type) {
        case "str":
            return "de_ctx_destroy_str";
        case "int":
            return null;
        case "bool":
            return null;
        default:
            return assertUnreachable(node.type);
    }
}

function destroyComplexFn(node: StructNode | ArrayNode): string {
    switch (node.tag) {
        case "struct": {
            return `${toFnName(node.key)}_destroy`;
        }
        case "array": {
            return `${toFnName(node.key)}_destroy_array`;
        }
        default:
            assertUnreachable(node);
    }
}

function fromJsonFn(node: Node): string {
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

function nodeType(node: Node): string {
    let type;
    switch (node.tag) {
        case "struct":
        case "array":
            type = toTypeName(node.key);
            break;
        case "primitive": {
            switch (node.type) {
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
                    return assertUnreachable(node.type);
            }
            break;
        }
        default:
            return assertUnreachable(node);
    }
    return type;
}

function destroyArrayFnDefinition(node: ArrayNode, map: NodeMap): string {
    const type = nodeType(map.get(node.data));
    return `void ${destroyComplexFn(node)}(${type}* model, size_t size)`;
}

function arrayFnDefinition(node: ArrayNode, map: NodeMap): string {
    const type = nodeType(map.get(node.data));
    return `DeCtxResult ${
        fromJsonFn(node)
    }(DeCtx* ctx, ${type}** model, size_t* size)`;
}

function destroyStructFnDefinition(node: StructNode): string {
    return `void ${destroyComplexFn(node)}(${toTypeName(node.key)}* model)`;
}

function structFnDefinition(node: StructNode): string {
    return `DeCtxResult ${fromJsonFn(node)}(DeCtx* ctx, ${
        toTypeName(node.key)
    }* model)`;
}

function defineFieldInitializerStatement(
    field: Node,
    indent: number,
    map: NodeMap,
): string {
    const i = " ".repeat(indent * 2);
    if (field.tag !== "array") {
        return `${i}${nodeType(field)} _${toFieldName(field.key)};\n`;
    }
    const data = map.get(field.data);
    return `${i}${nodeType(data)}* _${toFieldName(field.key)};\n` +
        `${i}size_t _${toFieldName(field.key)}_size;\n`;
}

function defineFieldGetStatement(
    field: Node,
    indent: number,
    idx: number,
): string {
    function includes(node: Node): string {
        if (node.tag === "primitive") {
            return `, "${node.key}"`;
        } else if (node.tag === "array") {
            return `, &_${toFieldName(node.key)}_size`;
        } else if (node.tag === "struct") {
            return "";
        }
        return assertUnreachable(node);
    }

    const i = " ".repeat(indent * 2);
    const i2 = " ".repeat((indent + 1) * 2);
    const fn = fromJsonFn(field);
    const name = toFieldName(field.key);
    const elseOrIndent = idx === 0 ? i : "else ";
    return "" +
        `${elseOrIndent}if (strcmp(key, "${name}") == 0) {\n` +
        `${i2}found_fields_bitmask |= (1 << ${idx});\n` +
        `${i2}res = ${fn}(ctx, &_${name}${includes(field)});\n` +
        `${i2}${returnIfNotOk()}\n` +
        `${i}} `;
}

function arrayDeserializer(
    node: ArrayNode,
    map: NodeMap,
): string {
    const data = map.get(node.data);
    const fn = fromJsonFn(data);
    const includeKey = data.tag === "primitive" ? `, "${data.key}"` : "";
    const name = toFieldName(node.key);
    let res = "";
    res += `${arrayFnDefinition(node, map)} {\n`;
    res += "  DeCtxResult res;\n";
    res += `  res = de_ctx_expect_char(ctx, '[', "${node.key}");\n`;
    res += `  ctx->idx += 1;\n`;
    res += `  *model = malloc(sizeof(${nodeType(data)}) * 48);\n`;
    res += `  while (true) {;\n`;
    res += `    res = de_ctx_expect_not_done(ctx, "${node.key}");\n`;
    res += `    ${returnIfNotOk()}\n`;
    res += `    char curr = ctx->content[ctx->idx];\n`;
    res += `    if (curr == ']') { break; }\n`;
    res += `    res = ${fn}(ctx, &model->${name}${includeKey});\n`;
    res += `    ${returnIfNotOk()}\n`;
    res += `  }\n`;
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
    res += "\n";
    res += node.fields
        .map((field) => map.get(field))
        .map((field) => defineFieldInitializerStatement(field, 1, map));
    res += "\n";
    res += `  size_t found_fields_bitmask = 0;\n`;
    res += `  while (true) {\n`;
    res += `    char* key;\n`;
    res += `    res = de_ctx_deserialize_str(ctx, &key, "${node.key}");\n`;
    res += `    ${returnIfNotOk()}\n`;
    res += `    res = de_ctx_expect_char(ctx, ':', "${node.key}");\n`;
    res += `    ${returnIfNotOk()}\n`;
    res += "    ctx->idx += 1;\n";
    res += "\n";
    res += node.fields
        .map((key) => map.get(key))
        .map((x, i) => defineFieldGetStatement(x, 2, i))
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
    const destroy = nodes
        .filter((node) => node.tag === "struct" || node.tag === "array")
        .map((node) =>
            node.tag === "struct"
                ? destroyStructFnDefinition(node)
                : destroyArrayFnDefinition(node, map)
        )
        .filter((node) => node !== null);
    return nodes
        .filter((node) => node.tag === "struct" || node.tag === "array")
        .map((node) =>
            node.tag === "struct"
                ? structFnDefinition(node)
                : arrayFnDefinition(node, map)
        )
        .concat(destroy)
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
        "//          or if an error occurs during parsing\n" +
        "//          possible solutions include:\n" +
        "//          1. destroy functions 2. piet arena allocator\n" +
        "//\n" +
        "// WARNING: current implementation does not free allocated values if\n" +
        "//          an error occurs parsing arrays\n" +
        "//          possible solutions include:\n" +
        "//          1. destroy functions 2. piet arena allocator\n\n";
    const map = new NodeMap(nodes);
    return warning + implementations(nodes, map);
}
