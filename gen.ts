import { assertUnreachable } from "./assert.ts";
import { fromDef, Struct, StructDef, StructFields, Value } from "./def.ts";

export function structs(structs: StructDef[]): string {
  return structs.map(fromDef).map(genStruct).join("\n");
}

type Dependency =
  | { tag: "struct"; name: string; value: Value & { tag: "struct" } }
  | { tag: "array"; name: string; value: Value };

function pascalCase(name: string): string {
  const chars = name.split("").toReversed();
  let result = "";
  let toUpper = true;
  while (true) {
    const char = chars.pop();
    if (!char) {
      break;
    }
    if (toUpper) {
      result += char.toUpperCase();
      toUpper = false;
    } else if (char === "_") {
      toUpper = true;
    } else {
      result += char;
    }
  }
  return result;
}

function dependencyName(typePrefix: string, key: string): string {
  return `${typePrefix}${pascalCase(key)}`;
}

function dependencyFromStructValues(
  prefix: string,
  value: StructFields,
) {
  return Object.entries(value)
    .flatMap(([key, value]) =>
      buildDependency(value, dependencyName(prefix, key))
    );
}

function buildDependency(
  value: Value,
  name: string,
): Dependency[] {
  switch (value.tag) {
    case "raw":
      return [];
    case "struct": {
      const childDependencies = dependencyFromStructValues(
        name,
        value.value,
      );

      return [...childDependencies, {
        tag: "struct",
        name: name,
        value: value,
      }];
    }
    case "array": {
      if (value.value.tag !== "raw") {
        const childDependencies = buildDependency(
          value.value,
          dependencyName(name, "data"),
        );
        return [...childDependencies, { tag: "array", name, value: value }];
      }
      return [{ tag: "array", name, value: value }];
    }
    default:
      assertUnreachable(value);
  }
}

function genStructField(
  typePrefix: string,
  name: string,
  field: Value,
): string {
  console.log(name, field);
  let result = "  ";
  result += name;
  result += ": ";
  switch (field.tag) {
    case "raw":
      result += field.value;
      break;
    case "struct": {
      result += `*${dependencyName(typePrefix, name)}`;
      break;
    }
    case "array": {
      result += `*${dependencyName(typePrefix, name)}`;
      break;
    }
    default:
      assertUnreachable(field);
  }
  result += ";\n";
  return result;
}

function fieldType(
  typePrefix: string,
  name: string,
  field: Value,
): string {
  switch (field.tag) {
    case "raw":
      return field.value;
    case "array":
    case "struct": {
      return `*${dependencyName(typePrefix, name)}`;
    }
    default:
      assertUnreachable(field);
  }
}

function genStructFields(
  values: StructFields,
  typePrefix: string,
): string {
  let result = "";
  for (const [key, field] of Object.entries(values)) {
    result += genStructField(typePrefix, key, field);
  }
  return result;
}

function genDependency(dep: Dependency): string {
  switch (dep.tag) {
    case "struct": {
      return genStructLike(dep.name, dep.value.value);
    }
    case "array": {
      console.log(dep.value);
      return genStructLike(dep.name, {
        data: {
          tag: "raw",
          value: `*${fieldType(dep.name, "data", dep.value)}`,
        },
        length: { tag: "raw", value: "size_t" },
      });
    }
    default:
      assertUnreachable(dep);
  }
}

function genStructLike(name: string, values: StructFields): string {
  let myDef = "";
  myDef += "typedef struct {\n";
  myDef += genStructFields(values, name);
  myDef += `} ${name};`;
  return myDef;
}

function genStruct(struct: Struct): string {
  struct.name = pascalCase(struct.name);
  const out = dependencyFromStructValues(struct.name, struct.values)
    .map(genDependency);
  out.push(genStructLike(struct.name, struct.values));
  return out.join("\n");
}
