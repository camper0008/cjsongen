import { assertUnreachable } from "../../../assert.ts";
import { ArrayNode, Node, StructNode } from "../../../repr/node.ts";
import { NodeMap, toFieldName, toTypeName } from "../common.ts";
import { Output } from "../output.ts";
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
            return `char* _${name} = ${fn}(model->${name});`;
        }
        case "array": {
            const fn = fnName(field);
            const name = toFieldName(field.key);
            return `char* _${name} = ${fn}(model->${name}, model->${name}_size);`;
        }
        default:
            assertUnreachable(field);
    }
}

function freeStatement(field: ArrayNode | StructNode): string {
    return `free(_${toFieldName(field.key)});`;
}
function formatFieldSpread(fields: Node[]): string {
    return fields
        .map((field) => {
            if (field.tag !== "primitive") {
                return `_${toFieldName(field.key)}`;
            }
            switch (field.type) {
                case "str":
                case "int":
                    return `model->${toFieldName(field.key)}`;
                case "bool":
                    return `model->${
                        toFieldName(field.key)
                    } ? "true" : "false"`;
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
    res += `const char* format = "{`;
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
): Output {
    const data = map.get(node.data);
    const fmt = arrayItemFormatString(data);
    const fmtValue = (i: string | number) =>
        arrayItemFormatValue(data, i.toString());
    const out = new Output();
    out.begin(`${arrayFnDefinition(node, map)} {`);

    out.begin("if (size == 0) {");
    out.push("char* buffer = malloc(3);");
    out.push("*buffer = { '[', ']', '\\0' };");
    out.push("return buffer;");
    out.close("}");

    if (data.tag !== "primitive") {
        out.push(`${arrayItemDefineValue(data, 0)};`);
    }
    out.push(
        `size_t buffer_size = snprintf(NULL, 0, "[${fmt}", ${fmtValue(0)});`,
    );

    out.push(`char* buffer = malloc(buffer_size + 1);`);
    out.push("char* buffer = malloc(buffer_size + 1);");
    out.push(`sprintf(buffer, "[${fmt}", ${fmtValue(0)});`);
    if (data.tag !== "primitive") {
        out.push("free(value);");
    }

    out.begin("for (size_t i = 1; i < size; ++i) {");
    if (data.tag !== "primitive") {
        out.push(`${arrayItemDefineValue(data, "i")};`);
    }
    out.push("char* temp = malloc(buffer_size + 1);");
    out.push("memcpy(temp, buffer, buffer_size + 1);");
    out.push("");
    out.push(
        `buffer_size = snprintf(NULL, 0, "%s,${fmt}", buffer, ${
            fmtValue("i")
        });`,
    );
    out.push("buffer = realloc(buffer, buffer_size + 1);");
    out.push(`sprintf(buffer, "%s,${fmt}", temp, ${fmtValue("i")});`);
    if (data.tag !== "primitive") {
        out.push("free(value);");
    }
    out.push("free(temp);");
    out.close("}");
    out.push("char* temp = malloc(buffer_size + 1);");
    out.push("memcpy(temp, buffer, buffer_size + 1);");
    out.push("");
    out.push('buffer_size = snprintf(NULL, 0, "%s]", buffer);');
    out.push("buffer = realloc(buffer, buffer_size + 1);");
    out.push('sprintf(buffer, "%s]", temp);');
    out.push("free(temp);");
    out.push("return buffer;");
    out.close("}");
    return out;
}

function structSerializer(
    node: StructNode,
    map: NodeMap,
): Output {
    const ind = new Output();

    ind.begin(`${structFnDefinition(node)} {`);
    ind.push(`${formatVariableStatement(node, map)};`);

    node.fields
        .map((key) => map.get(key))
        .filter((node) => node.tag !== "primitive")
        .map((node) => defineFieldStatement(node))
        .forEach((line) => ind.push(line));

    const fieldSpread = formatFieldSpread(
        node.fields.map((key) => map.get(key)),
    );

    ind.push(`size_t size = snprintf(NULL, 0, format, ${fieldSpread});`);
    ind.push("char* buffer = malloc(size + 1);");
    ind.push(`sprintf(buffer, format, ${fieldSpread});`);

    node.fields
        .map((key) => map.get(key))
        .filter((node) => node.tag !== "primitive")
        .map((node) => freeStatement(node))
        .forEach((line) => ind.push(line));

    ind.push("return buffer;");
    ind.close("}");
    return ind;
}

export function serializerDef(nodes: Node[]): string {
    const map = new NodeMap(nodes);
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

export function serializerImpl(nodes: Node[]): string {
    const map = new NodeMap(nodes);
    return nodes
        .filter((node) => node.tag === "struct" || node.tag === "array")
        .map((node) =>
            node.tag === "struct"
                ? structSerializer(node, map)
                : arraySerializer(node, map)
        )
        .map((ind) => ind.eval())
        .join("\n");
}
