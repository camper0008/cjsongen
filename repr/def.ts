export type Struct = {
  name: string;
  values: { [key: string]: Value };
};

export type Value =
  | string
  | { [key: string]: Value }
  | [Value];
