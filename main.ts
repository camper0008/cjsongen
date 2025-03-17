import * as d from "./def.ts";
import * as g from "./gen.ts";

if (import.meta.main) {
  const res = g.structs([
    d.struct("hello", {
      whats: d.str(),
      done: d.int(),
      arr: d.arr({
        yep: d.int(),
      }),
    }),
  ]);
  console.log(res);
}
