import * as def from "./def.ts";

export function structs(structs: def.Struct[]): string {
  return structs.map(genStruct).join("\n");
}

function assertUnreachable(v: never): never {
  throw new Error(`${v} was not never`);
}

type Dependency =
  | { tag: "object"; name: string; value: def.StructValues }
  | { tag: "array"; name: string; value: def.StructValues };

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

function calculateDependencies(
  values: def.StructValues,
  typePrefix: string,
): Dependency[] {
  const dependencies = Object.entries(values)
    .map(
      ([key, value]): Dependency | null => {
        switch (value.tag) {
          case "object": {
            const name = dependencyName(typePrefix, key);
            return ({ tag: "object", name, value: value.value });
          }
          case "array": {
            const name = dependencyName(typePrefix, key);
            return ({ tag: "array", name, value: value.value });
          }
          case "string":
          case "int":
          case "bool":
            return null;
          default:
            assertUnreachable(value);
        }
      },
    )
    .filter((v) => v !== null);
  const childDependencies = dependencies.flatMap((v) =>
    calculateDependencies(v.value, v.name)
  );
  return [...childDependencies, ...dependencies];
}

function genStructData(
  values: def.StructValues,
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
      case "bool":
        result += "bool";
        break;
      case "object": {
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

function genDependency(dep: Dependency): string {
  let result = "";
  switch (dep.tag) {
    case "object":
      genStructLike();
      let myDef = "";
      myDef += "typedef struct {\n";
      myDef += genStructData(struct.values, struct.name);
      myDef += `} ${struct.name};`;
      break;
    case "array":
      break;
    default:
      assertUnreachable(dep);
  }
  return result;
}

function genStructLike(name: string, values: def.StructValues): string {
  let myDef = "";
  myDef += "typedef struct {\n";
  myDef += genStructData(values, name);
  myDef += `} ${name};`;
  return myDef;
}

function genStruct(struct: def.Struct): string {
  struct.name = pascalCase(struct.name);
  const out = calculateDependencies(struct.values, struct.name)
    .map(genDependency);
  out.push(genStructLike(struct.name, struct.values));
  return out.join("\n");
}
