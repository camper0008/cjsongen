import * as gen from "./gen.ts";

if (import.meta.main) {
  const res = gen.structs([
    {
      name: "hello",
      values: {
        a: [{
          b: "int",
          c: ["bool"],
        }],
        d: ["int"],
      },
    },
  ]);
  console.log(res);
}
