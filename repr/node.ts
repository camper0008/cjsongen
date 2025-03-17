import { RawType } from "./supported_types.ts";
import * as imm from "./immediate.ts";

export type StructNode = { tag: "struct"; name: string; fields: Node[] };
export type ArrayNode = { tag: "array"; name: string; data: string };
export type RawNode = { tag: "raw"; name: string; type: RawType };

export type Node =
  | StructNode
  | ArrayNode
  | RawNode;

function fieldNodes(
  parent: string,
  fields: imm.StructFields,
): Node[] {
  const list = Object.entries(fields);
  return list.flatMap((v) => nodeFromField(parent, v));
}

function immediateRelative(parent: string, child: string): boolean {
  const startsWith = child.startsWith(parent);
  const immediateRelative = child.lastIndexOf(".") === parent.length;
  return startsWith && immediateRelative;
}

function nodeFromStruct(parent: string, fields: imm.StructFields): Node[] {
  const children = fieldNodes(parent, fields);
  const root: Node = {
    tag: "struct",
    name: parent,
    fields: children.filter((child) => immediateRelative(parent, child.name)),
  };
  return [...children, root];
}

function nodeFromField(
  parent: string,
  [key, field]: [string, imm.Value],
): Node[] {
  const me = `${parent}.${key}`;
  switch (field.tag) {
    case "struct": {
      return nodeFromStruct(me, field.value);
    }
    case "array": {
      const children = nodeFromField(me, ["#array_data#", field.value]);
      return [...children, {
        tag: "array",
        data: "#array_data#",
        name: me,
      }];
    }
    case "raw":
      return [{
        tag: "raw",
        name: me,
        type: field.value,
      }];
  }
}

export function fromRepr(struct: imm.Struct): Node[] {
  return nodeFromStruct(struct.name, struct.values);
}
