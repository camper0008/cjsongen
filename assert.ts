export function assertUnreachable(v: never): never {
  throw new Error(`${v} was not never`);
}
