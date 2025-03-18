import { Primitive } from "./primitives.ts";
import * as mir from "./mir.ts";

export type Id = string;

export type StructNode = { tag: "struct"; key: string; fields: Id[] };
export type ArrayNode = { tag: "array"; key: string; data: Id };
export type PrimitiveNode = {
  tag: "primitive";
  key: string;
  type: Primitive;
};

export type Node =
  | StructNode
  | ArrayNode
  | PrimitiveNode;

function fieldNodes(
  parent: string,
  fields: mir.StructFields,
): Node[] {
  const list = Object.entries(fields);
  return list.flatMap((v) => nodeFromField(parent, v));
}

function isChildOf(parent: string, child: string): boolean {
  const startsWith = child.startsWith(parent);
  const immediateRelative = child.lastIndexOf(".") === parent.length;
  return startsWith && immediateRelative;
}

function nodeFromStruct(parent: string, fields: mir.StructFields): Node[] {
  const children = fieldNodes(parent, fields);
  const root: Node = {
    key: parent,
    tag: "struct",
    fields: children
      .filter((child) => isChildOf(parent, child.key))
      .map((child) => child.key),
  };
  return [...children, root];
}

function nodeFromField(
  parent: string,
  [fieldName, fieldValue]: [string, mir.Value],
): Node[] {
  const key = `${parent}.${fieldName}`;
  switch (fieldValue.tag) {
    case "struct": {
      return nodeFromStruct(key, fieldValue.value);
    }
    case "array": {
      const children = nodeFromField(key, ["#array_data#", fieldValue.value]);
      return [...children, {
        tag: "array",
        key,
        data: `${key}.#array_data#`,
      }];
    }
    case "primitive":
      return [{
        tag: "primitive",
        key,
        type: fieldValue.value,
      }];
  }
}

export function fromMir(struct: mir.Struct): Node[] {
  return nodeFromStruct(struct.name, struct.values);
}
