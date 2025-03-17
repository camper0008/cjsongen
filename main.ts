import * as gen from "./gen.ts";

if (import.meta.main) {
  const res = gen.structs([
    {
      name: "hello",
      values: {
        whats: "string",
        done: "bool",
        yarr: [{
          yep: "int",
        }],
        yarray: ["int"],
      },
    },
  ]);
  console.log(res);
}
