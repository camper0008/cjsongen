export function assertUnreachable(v: never): never {
  throw new Error(`${v} was not never`);
}

export function fatal(error: string): never {
  throw new Error(`fatal: ${error}`);
}
