import { Primitive } from "./primitives.ts";
import * as def from "./def.ts";

export type StructFields = {
  [key: string]: Value;
};

export type Value =
  | { tag: "primitive"; value: Primitive }
  | { tag: "struct"; value: StructFields }
  | { tag: "array"; value: Value };

export type Struct = {
  name: string;
  values: StructFields;
};

function mapDefStruct(
  def: { [key: string]: def.Value },
): { [key: string]: Value } {
  const entries = Object.entries(def)
    .map(([key, value]) => [key, fromDefValue(value)]);

  return Object.fromEntries(entries);
}

function fromDefValue(def: def.Value): Value {
  if (Array.isArray(def)) {
    const value = fromDefValue(def[0]);
    return { tag: "array", value };
  } else if (typeof def === "object") {
    const value = mapDefStruct(def);
    return { tag: "struct", value };
  }
  return { tag: "primitive", value: def };
}

export function fromDef(def: def.Struct): Struct {
  const value = mapDefStruct(def.values);
  const struct = {
    name: def.name,
    values: value,
  };
  return struct;
}
