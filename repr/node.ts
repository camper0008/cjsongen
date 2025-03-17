import { RawType } from "./supported_types.ts";
import * as imm from "./immediate.ts";

export type StructNode = { tag: "struct"; key: string; fields: Node[] };
export type ArrayNode = { tag: "array"; key: string; data: string };
export type RawNode = { tag: "raw"; key: string; type: RawType };

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
    key: parent,
    fields: children.filter((child) => immediateRelative(parent, child.key)),
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
        key: me,
      }];
    }
    case "raw":
      return [{
        tag: "raw",
        key: me,
        type: field.value,
      }];
  }
}

export function fromRepr(struct: imm.Struct): Node[] {
  return nodeFromStruct(struct.name, struct.values);
}
