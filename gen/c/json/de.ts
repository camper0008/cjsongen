import { assertUnreachable } from "../../../assert.ts";
import {
    ArrayNode,
    Node,
    PrimitiveNode,
    StructNode,
} from "../../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "../common.ts";
import { Output } from "../output.ts";
import { toFnName } from "./common.ts";

class OutputDeExt extends Output {
    constructor() {
        super();
    }

    returnIfNotOk(): void {
        this.push("if (res != DeCtxResult_Ok) { return res; }");
    }

    destroyIfNotOk(node: ArrayNode | StructNode): void {
        this.begin("if (res != DeCtxResult_Ok) {");
        const fn = destroyComplexFn(node);
        switch (node.tag) {
            case "array":
                this.push(`${fn}(*model, *size);`);
                break;
            case "struct":
                this.push(`${fn}(model);`);
                break;
        }
        this.push("return res;");
        this.close("}");
    }

    structFieldsInitStatements(
        node: StructNode,
        map: NodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field) => this.fieldInitStatement(field, map));
    }

    structFieldsSetStatements(
        node: StructNode,
        map: NodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field) => this.fieldSetStatement(field));
    }

    private fieldSetStatement(
        field: Node,
    ): void {
        const name = toFieldName(field.key);
        this.push(`model->${name} = _${name};`);
        if (field.tag === "array") {
            this.push(`model->${name}_size = _${name}_size;`);
        }
    }

    structFieldsGetStatements(
        node: StructNode,
        map: NodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field, i) => this.fieldGetStatement(field, i));
    }

    private fieldGetStatement(
        field: Node,
        idx: number,
    ): void {
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

        const fn = fromJsonFn(field);
        const name = toFieldName(field.key);
        if (idx === 0) {
            this.begin(`if (strcmp(key, "${name}") == 0) {`);
        } else {
            this.closeAndBegin(`} else if (strcmp(key, "${name}") == 0) {`);
        }
        this.push(`found_fields_bitmask |= (1 << ${idx});`);
        this.push(`res = ${fn}(ctx, &_${name}${includes(field)});`);
        this.returnIfNotOk();
    }

    private fieldInitStatement(
        field: Node,
        map: NodeMap,
    ): void {
        if (field.tag !== "array") {
            this.push(`${nodeType(field)} _${toFieldName(field.key)};`);
            return;
        }
        const data = map.get(field.data);
        this.push(`${nodeType(data)}* _${toFieldName(field.key)};`);
        this.push(`size_t _${toFieldName(field.key)}_size;`);
    }
}

function destroyPrimitiveFn(node: PrimitiveNode): string | null {
    switch (node.type) {
        case "str":
            return "free";
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

function arrayDestroyer(
    node: ArrayNode,
    map: NodeMap,
): Output {
    const data = map.get(node.data);
    const out = new OutputDeExt();

    out.begin(`${destroyArrayFnDefinition(node, map)} {`);

    const hasDestroyFn = data.tag !== "primitive" ||
        destroyPrimitiveFn(data) !== null;
    if (!hasDestroyFn) {
        out.push(`free(model);`);
        out.close("}");
        return out;
    }

    out.begin(`for (size_t i = 0; i < size; ++i) {`);
    switch (data.tag) {
        case "array":
            out.push(`// WARNING: nested arrays are currently unsupported`);
            break;
        case "struct":
            out.push(`${destroyComplexFn(data)}(&(*model)[i]);`);
            break;
        case "primitive":
            out.push(`${destroyPrimitiveFn(data)}(model[i]);`);
            break;

        default:
            assertUnreachable(data);
    }
    out.close("}");
    out.push(`free(model);`);
    out.close("}");
    return out;
}

function arrayDeserializer(
    node: ArrayNode,
    map: NodeMap,
): Output {
    const data = map.get(node.data);
    const out = new OutputDeExt();
    out.begin(`${arrayFnDefinition(node, map)} {`);
    out.push("DeCtxResult res;");
    out.push(`res = de_ctx_expect_char(ctx, '[', "${node.key}");`);
    out.returnIfNotOk();
    out.push(`ctx->idx += 1;`);

    {
        out.begin(`{`);
        out.push(`char curr = ctx->input[ctx->idx];`);
        out.push(`if (curr == ']') { ctx->idx += 1; return DeCtxResult_Ok; }`);
        out.close(`}`);
    }

    out.push(`size_t allocated = 48;`);

    out.push(`*model = malloc(sizeof(${nodeType(data)}) * allocated);`);
    out.push(`*size = 0;`);

    out.begin(`while (true) {`);
    {
        out.begin(`if (*size >= allocated) {`);
        {
            out.push(`allocated *= 2;`);
            out.push(
                `*model = realloc(*model, sizeof(${
                    nodeType(data)
                }) * allocated);`,
            );
        }
        out.close(`}`);

        const fn = fromJsonFn(data);
        out.push(`res = ${fn}(ctx, &(*model)[*size], "${node.key}");`);
        out.destroyIfNotOk(node);

        out.push("*size += 1;");

        out.push(`char curr = ctx->input[ctx->idx];`);
        out.push(`if (curr == ']') { break; }`);
        out.push(`res = de_ctx_expect_char(ctx, ',', "${node.key}");`);
        out.destroyIfNotOk(node);
        out.push(`ctx->idx += 1;`);
    }
    out.close(`}`);
    out.push(`res = de_ctx_expect_char(ctx, ']', "${node.key}");`);
    out.destroyIfNotOk(node);
    out.push(`ctx->idx += 1;`);
    out.push("return DeCtxResult_Ok;");
    out.close("}");

    return out;
}

function structDeserializer(
    node: StructNode,
    map: NodeMap,
): Output {
    const out = new OutputDeExt();

    {
        out.push(
            "// WARNING: current implementation does not free allocated values if",
        );
        out.push(
            '// keys are duplicated. i.e. {"key": "val1", "key": "val2"}',
        );
        out.push(
            '// will not deallocate "val1" - same goes for structs and arrays',
        );
        out.push("// or if an error occurs during parsing");
    }

    out.begin(`${structFnDefinition(node)} {`);
    out.push("DeCtxResult res;");
    out.push(`res = de_ctx_expect_char(ctx, '{', "${node.key}");`);
    out.returnIfNotOk();
    out.push(`ctx->idx += 1;`);
    out.structFieldsInitStatements(node, map);
    out.push(`size_t found_fields_bitmask = 0;\n`);
    out.begin(`while (true) {\n`);
    out.push(`char* key;`);
    out.push(`res = de_ctx_deserialize_str(ctx, &key, "${node.key}");\n`);
    out.returnIfNotOk();
    out.push(`res = de_ctx_expect_char(ctx, ':', "${node.key}");\n`);
    out.returnIfNotOk();
    out.push("ctx->idx += 1;");

    out.structFieldsGetStatements(node, map);
    out.closeAndBegin("} else {");
    out.push(
        "snprintf(ctx->error, DE_CTX_ERROR_SIZE, \"got invalid key '%s'\", key);",
    );
    out.push("free(key);");
    out.push("return DeCtxResult_BadInput;");
    out.close("}");

    out.push("free(key);");
    out.push("de_ctx_skip_whitespace(ctx);");
    out.push(`res = de_ctx_expect_not_done(ctx, "${node.key}");`);
    out.returnIfNotOk();
    out.push(`char curr = ctx->input[ctx->idx];`);

    out.push(`if (curr == ',') { continue; }`);

    out.push(`res = de_ctx_expect_char(ctx, '}', "${node.key}");`);
    out.returnIfNotOk();
    out.push("break;");
    out.close("}");

    const bitmask = parseInt("1".repeat(node.fields.length), 2);

    out.begin(`if (found_fields_bitmask != ${bitmask}) {`);
    {
        out.push(
            'snprintf(ctx->error, DE_CTX_ERROR_SIZE, "missing fields");',
        );
        out.push("return DeCtxResult_BadInput;");
    }
    out.close("}");
    out.push("ctx->idx += 1;");
    out.structFieldsSetStatements(node, map);
    out.push("return DeCtxResult_Ok;");
    out.close("}");
    return out;
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
        .flatMap((node) =>
            node.tag === "struct"
                ? [structDeserializer(node, map)]
                : [arrayDestroyer(node, map), arrayDeserializer(node, map)]
        )
        .map((ind) => ind.eval())
        .join("\n");
}

export function deserializerDef(nodes: Node[]): string {
    const map = new NodeMap(nodes);
    return definitions(nodes, map);
}

export function deserializerImpl(nodes: Node[]): string {
    const map = new NodeMap(nodes);
    return implementations(nodes, map);
}
