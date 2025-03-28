" Vim syntax file
" Language: cjsongen
" Maintainer: SFJ
" Latest Revision: 1 January 1984

if exists("b:current_syntax")
  finish
endif


syn keyword Type str int bool

syn match Operator ':'
syn match Operator ','

syn keyword Todo contained TODO FIXME XXX NOTE
syn match Comment "//.*$" contains=Todo

syn match Identifier '[a-zA-Z_]\w*'

syn region sligeBlock start="{" end="}" transparent fold

let b:current_syntax = "cjsongen"
