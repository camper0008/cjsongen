export type Value =
  | { tag: "string" }
  | { tag: "int" }
  | { tag: "bool" }
  | { tag: "object"; value: StructValues }
  | { tag: "array"; value: StructValues };

export type StructValues = {
  [key: string]: Value;
};

export type Struct = {
  name: string;
  values: StructValues;
};

export function struct(name: string, values: StructValues): Struct {
  return { name, values };
}

export function str(): Value {
  return { tag: "string" };
}

export function bool(): Value {
  return { tag: "bool" };
}

export function int(): Value {
  return { tag: "int" };
}

export function obj(value: StructValues): Value {
  return {
    tag: "object",
    value,
  };
}

export function arr(value: StructValues): Value {
  return {
    tag: "array",
    value,
  };
}
