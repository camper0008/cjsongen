export const primitives = ["char*", "int64_t", "bool"] as const;
export type Primitive = typeof primitives[number];
