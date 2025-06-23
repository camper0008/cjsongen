cjsongen

---

repository will be moved at some point once i figure out a better name

currently, the goal is to generate C structs and json serialize/deserialize functions. it is planned to also be able to generate SQL PREPARE stuff (CREATE etc.).

roadmap:
- [x] a HIR i'm satisfied with
- [x] fix whatever i've got going on for arrays in my LIR
- [x] typedef gen
- [x] json ser-gen
- [x] json de-gen

see main.ts for example
