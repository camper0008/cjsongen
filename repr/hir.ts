import { Primitive } from "./primitives.ts";

export type Struct = {
    name: string;
    values: { [key: string]: Value };
};

export type Value =
    | Primitive
    | { [key: string]: Value }
    | [Value];
