import { RawType } from "./supported_types.ts";

export type Struct = {
  name: string;
  values: { [key: string]: Value };
};

export type Value =
  | RawType
  | { [key: string]: Value }
  | [Value];
