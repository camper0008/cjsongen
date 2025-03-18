export const primitives = ["str", "int", "bool"] as const;
export type Primitive = typeof primitives[number];
