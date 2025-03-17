import { assertUnreachable } from "./assert.ts";

export type Value =
  | { tag: "string" }
  | { tag: "int" }
  | { tag: "size_t" }
  | { tag: "bool" }
  | { tag: "struct"; value: StructValues }
  | { tag: "array"; value: Value };

export type StructValues = {
  [key: string]: Value;
};

export type Struct = {
  name: string;
  values: StructValues;
};

export type StructDef = {
  name: string;
  values: { [key: string]: DefValue };
};

export type DefValue =
  | "string"
  | "int"
  | "size_t"
  | "bool"
  | { [key: string]: DefValue }
  | [
    DefValue,
  ];

function mapDefStruct(
  def: { [key: string]: DefValue },
): { [key: string]: Value } {
  const entries = Object.entries(def)
    .map(([key, value]) => [key, fromDefValue(value)]);

  return Object.fromEntries(entries);
}

function fromDefValue(def: DefValue): Value {
  switch (def) {
    case "string":
      return { tag: "string" };
    case "int":
      return { tag: "int" };
    case "size_t":
      return { tag: "size_t" };
    case "bool":
      return { tag: "bool" };
    default:
      if (Array.isArray(def)) {
        const value = fromDefValue(def[0]);
        return { tag: "array", value };
      } else {
        const value = mapDefStruct(def);
        return { tag: "struct", value };
      }
  }
}

export function fromDef(def: StructDef): Struct {
  const value = mapDefStruct(def.values);
  const struct = {
    name: def.name,
    values: value,
  };
  return struct;
}
