import { Primitive } from "./primitives.ts";
import * as hir from "./hir.ts";

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

function mapHirStruct(
  def: { [key: string]: hir.Value },
): { [key: string]: Value } {
  const entries = Object.entries(def)
    .map(([key, value]) => [key, fromHirValue(value)]);

  return Object.fromEntries(entries);
}

function fromHirValue(def: hir.Value): Value {
  if (Array.isArray(def)) {
    const value = fromHirValue(def[0]);
    return { tag: "array", value };
  } else if (typeof def === "object") {
    const value = mapHirStruct(def);
    return { tag: "struct", value };
  }
  return { tag: "primitive", value: def };
}

export function fromHir(def: hir.Struct): Struct {
  const value = mapHirStruct(def.values);
  const struct = {
    name: def.name,
    values: value,
  };
  return struct;
}
