// MJS
export default {
    input: "parser.pegjs",
    output: "parser.out.js",
    format: "es",
    sourceMap: true,
    dts: true,
    returnTypes: {
        Defs: "repr.hir.Struct[]",
        Ident: "string",
    },
};
