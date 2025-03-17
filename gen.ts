import { assertUnreachable } from "./assert.ts";
import { fromDef, Struct, StructDef, StructValues, Value } from "./def.ts";

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

function structValueDependency(
  prefix: string,
  value: StructValues,
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
    case "string":
    case "int":
    case "size_t":
    case "bool":
      return [];
    case "struct": {
      const childDependencies = structValueDependency(
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
      const childDependencies = buildDependency(
        value.value,
        dependencyName(name, "data"),
      );
      return [...childDependencies, { tag: "array", name, value: value }];
    }
    default:
      assertUnreachable(value);
  }
}

function genStructData(
  values: StructValues,
  typePrefix: string,
): string {
  let result = "";
  for (const [key, value] of Object.entries(values)) {
    result += "  ";
    result += key;
    result += ": ";
    switch (value.tag) {
      case "string":
        result += "const *char";
        break;
      case "int":
        result += "int64_t";
        break;
      case "size_t":
        result += "size_t";
        break;
      case "bool":
        result += "bool";
        break;
      case "struct": {
        const name = dependencyName(typePrefix, key);
        result += `const *${name}`;
        break;
      }
      case "array": {
        const name = dependencyName(typePrefix, key);
        result += `const *${name}`;
        break;
      }
      default:
        assertUnreachable(value);
    }
    result += ";\n";
  }
  return result;
}

function generateDependency(dep: Dependency): string {
  switch (dep.tag) {
    case "struct": {
      return genStructLike(dep.name, dep.value.value);
    }
    case "array": {
      return genStructLike(dep.name, {
        data: dep.value,
        length: { tag: "size_t" },
      });
    }
    default:
      assertUnreachable(dep);
  }
}

function genStructLike(name: string, values: StructValues): string {
  let myDef = "";
  myDef += "typedef struct {\n";
  myDef += genStructData(values, name);
  myDef += `} ${name};`;
  return myDef;
}

function genStruct(struct: Struct): string {
  struct.name = pascalCase(struct.name);
  const out = structValueDependency(struct.name, struct.values)
    .map(generateDependency);
  out.push(genStructLike(struct.name, struct.values));
  return out.join("\n");
}
