export type Value =
  | { tag: "raw"; value: string }
  | { tag: "struct"; value: StructFields }
  | { tag: "array"; value: Value };

export type StructFields = {
  [key: string]: Value;
};

export type Struct = {
  name: string;
  values: StructFields;
};

export type StructDef = {
  name: string;
  values: { [key: string]: DefValue };
};

export type DefValue =
  | string
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
  if (typeof def === "string") {
    return { tag: "raw", value: def };
  } else if (Array.isArray(def)) {
    const value = fromDefValue(def[0]);
    return { tag: "array", value };
  } else {
    const value = mapDefStruct(def);
    return { tag: "struct", value };
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
