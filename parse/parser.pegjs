
{{
    import { repr } from "../mod.ts";
}}

Defs = _ defs:Struct|.., _ | _ { return defs; }

Struct
  = ident:Ident _ "{" values:ValueEntries "}"
    { return { name: ident, values } }

ValueEntries = _ entries:ValueEntry|.., _ "," _| _ ","? _ { return entries.reduce((acc, entry) => ({...acc, ...entry}), {}); }

ValueEntry
  = key:Ident _ ":" _ value:Value
    { return { [key]: value }; }

Value "value"
  = "{" entries:ValueEntries "}" { return entries; }
  / "[" _ value:Value _ "]" { return [value]; }
  / "str" { return "str" }
  / "int" { return "int" }
  / "bool" { return "bool" }

Ident "identifier"
  = [a-zA-Z_][a-zA-Z0-9_]* { return text(); }

_ "whitespace"
  = (WhiteSpaceChars / SingleLineComment)*
  
WhiteSpaceChars = [ \t\n\r]
SingleLineComment = "//" (!"\n" .)*

// vim: commentstring=//\ %s
