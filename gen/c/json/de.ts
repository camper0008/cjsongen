import { assertUnreachable } from "../../../assert.ts";
import {
    ArrayNode,
    Node,
    PrimitiveNode,
    StructNode,
} from "../../../repr/node.ts";
import { CNodeMap, toFieldName, toTypeName } from "../common.ts";
import { Output } from "../../output.ts";
import { toFnName } from "./common.ts";

class OutputDeExt extends Output {
    returnIfNotOk(): void {
        this.push("if (res != DeCtxResult_Ok) { return res; }");
    }

    destroyIfNotOk(node: ArrayNode | StructNode): void {
        switch (node.tag) {
            case "array": {
                const fn = destroyComplexFn(node);
                this.begin("if (res != DeCtxResult_Ok) {");
                this.push(`${fn}(*model, *size);`);
                this.push("return res;");
                this.close("}");
                break;
            }
            case "struct":
                this.push("if (res != DeCtxResult_Ok) { goto drop; }");
                break;
        }
    }

    __structFieldsDestroyStatements(
        node: StructNode,
        map: CNodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field) => this.__fieldDestroyStatement(field));
    }

    private __fieldDestroyStatement(
        field: Node,
    ): void {
        switch (field.tag) {
            case "struct":
                this.push(
                    `${destroyComplexFn(field)}(&model->${
                        toFieldName(field.key)
                    });`,
                );
                break;
            case "primitive":
                switch (field.type) {
                    case "int":
                    case "bool":
                        break;
                    case "str":
                        this.push(`free(model->${toFieldName(field.key)});`);
                        break;
                    default:
                        assertUnreachable(field.type);
                }
                break;
            case "array": {
                this.push(
                    `${destroyComplexFn(field)}(model->${
                        toFieldName(field.key)
                    }, model->${toFieldName(field.key)}_size);`,
                );
                break;
            }
            default:
                assertUnreachable(field);
        }
    }

    structFieldsDestroyStatements(
        node: StructNode,
        map: CNodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field) => this.fieldDestroyStatement(field));
    }

    private fieldDestroyStatement(
        field: Node,
    ): void {
        switch (field.tag) {
            case "struct":
                this.push(
                    `${destroyComplexFn(field)}(&_${toFieldName(field.key)});`,
                );
                break;
            case "primitive":
                switch (field.type) {
                    case "int":
                    case "bool":
                        break;
                    case "str":
                        this.begin(`if (_${toFieldName(field.key)} != NULL) {`);
                        this.push(`free(_${toFieldName(field.key)});`);
                        this.close(`}`);
                        break;
                    default:
                        assertUnreachable(field.type);
                }
                break;
            case "array": {
                this.push(
                    `${destroyComplexFn(field)}(_${toFieldName(field.key)}, _${
                        toFieldName(field.key)
                    }_size);`,
                );
                break;
            }
            default:
                assertUnreachable(field);
        }
    }

    structFieldsInitStatements(
        node: StructNode,
        map: CNodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field) => this.fieldInitStatement(field, map));
    }

    private fieldInitStatement(
        field: Node,
        map: CNodeMap,
    ): void {
        switch (field.tag) {
            case "struct":
                this.push(
                    `${nodeType(field)} _${toFieldName(field.key)} = { 0 };`,
                );
                break;
            case "primitive":
                switch (field.type) {
                    case "str":
                        this.push(
                            `${nodeType(field)} _${
                                toFieldName(field.key)
                            } = NULL;`,
                        );
                        break;
                    case "int":
                    case "bool":
                        this.push(
                            `${nodeType(field)} _${toFieldName(field.key)};`,
                        );
                        break;
                    default:
                        assertUnreachable(field.type);
                }
                break;
            case "array": {
                const data = map.get(field.data);
                this.push(
                    `${nodeType(data)}* _${toFieldName(field.key)} = NULL;`,
                );
                this.push(`size_t _${toFieldName(field.key)}_size = 0;`);
                break;
            }
            default:
                assertUnreachable(field);
        }
    }

    fieldsSetStatements(
        node: StructNode,
        map: CNodeMap,
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

    fieldsDeserializeStatements(
        node: StructNode,
        map: CNodeMap,
    ): void {
        node.fields
            .map((field) => map.get(field))
            .forEach((field, i) =>
                this.fieldDeserializeStatement(node, field, i)
            );
    }

    private fieldDeserializeStatement(
        node: StructNode,
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

        this.begin(`if (found_fields[${idx}]) {`);
        {
            this.fieldDestroyStatement(field);
        }
        this.close("}");
        this.push(`found_fields[${idx}] = true;`);
        this.push(`res = ${fn}(ctx, &_${name}${includes(field)});`);
        this.destroyIfNotOk(node);
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

function destroyArrayFnDefinition(node: ArrayNode, map: CNodeMap): string {
    const type = nodeType(map.get(node.data));
    return `void ${destroyComplexFn(node)}(${type}* model, size_t size)`;
}

function arrayFnDefinition(node: ArrayNode, map: CNodeMap): string {
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

function structDestroyer(
    node: StructNode,
    map: CNodeMap,
): Output {
    const out = new OutputDeExt();

    out.begin(`${destroyStructFnDefinition(node)} {`);
    out.__structFieldsDestroyStatements(node, map);
    out.close("}");
    return out;
}

function arrayDestroyer(
    node: ArrayNode,
    map: CNodeMap,
): Output {
    const data = map.get(node.data);
    const out = new OutputDeExt();

    out.begin(`${destroyArrayFnDefinition(node, map)} {`);

    out.begin("if (model == NULL) {");
    out.push("return;");
    out.close("}");

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
    map: CNodeMap,
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
    map: CNodeMap,
): Output {
    const out = new OutputDeExt();
    out.begin(`${structFnDefinition(node)} {`);
    out.push("DeCtxResult res;");
    out.push(`res = de_ctx_expect_char(ctx, '{', "${node.key}");`);
    out.returnIfNotOk();
    out.push(`ctx->idx += 1;`);
    out.push("");
    out.structFieldsInitStatements(node, map);
    out.push("");
    out.push(`bool found_fields[${node.fields.length}] = { false };`);
    out.push(`char* key = NULL;`);
    out.begin(`while (true) {`);
    {
        out.push(`res = de_ctx_deserialize_str(ctx, &key, "${node.key}");`);
        out.destroyIfNotOk(node);
        out.push(`res = de_ctx_expect_char(ctx, ':', "${node.key}");`);
        out.destroyIfNotOk(node);
        out.push("ctx->idx += 1;");
        {
            out.fieldsDeserializeStatements(node, map);
            out.closeAndBegin("} else {");
            out.push(
                "snprintf(ctx->error, DE_CTX_ERROR_SIZE, \"got invalid key '%s'\", key);",
            );
            out.push("res = DeCtxResult_BadInput;");
            out.push("goto drop;");
            out.close("}");
        }
        out.push(`res = de_ctx_expect_not_done(ctx, "${node.key}");`);
        out.returnIfNotOk();
        out.push(`char curr = ctx->input[ctx->idx];`);

        out.push(`if (curr == ',') { ctx->idx += 1; continue; }`);

        out.push(`res = de_ctx_expect_char(ctx, '}', "${node.key}");`);
        out.destroyIfNotOk(node);
        out.push("ctx->idx += 1;");
        out.push("break;");
    }
    out.close("}");

    out.push(`bool all_fields_received = true;`);
    out.begin(`for (size_t i = 0; i < ${node.fields.length}; ++i) {`);
    {
        out.push(
            `all_fields_received = all_fields_received && found_fields[i];`,
        );
    }
    out.close("}");

    out.begin(`if (!all_fields_received) {`);
    {
        out.push(
            'snprintf(ctx->error, DE_CTX_ERROR_SIZE, "missing fields");',
        );
        out.push("res = DeCtxResult_BadInput;");
        out.push("goto drop;");
    }
    out.close("}");

    out.push("");

    out.push("goto success;");
    out.begin("drop: {");
    {
        out.push("assert(res != DeCtxResult_Ok);");
        out.structFieldsDestroyStatements(node, map);
        out.begin("if (key != NULL) {");
        {
            out.push("free(key);");
        }
        out.close("}");
        out.push("return res;");
    }
    out.close("}");

    out.begin("success: {");
    out.fieldsSetStatements(node, map);
    out.push("return DeCtxResult_Ok;");
    out.close("}");
    out.close("}");
    return out;
}

function definitions(nodes: Node[], map: CNodeMap): string {
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

function implementations(nodes: Node[], map: CNodeMap): string {
    return nodes
        .filter((node) => node.tag === "struct" || node.tag === "array")
        .flatMap((node) =>
            node.tag === "struct"
                ? [structDestroyer(node, map), structDeserializer(node, map)]
                : [arrayDestroyer(node, map), arrayDeserializer(node, map)]
        )
        .map((ind) => ind.eval())
        .join("\n");
}

export function deserializerDef(nodes: Node[]): string {
    const map = new CNodeMap(nodes);
    return definitions(nodes, map);
}

export function deserializerImpl(nodes: Node[]): string {
    const map = new CNodeMap(nodes);
    return implementations(nodes, map);
}
