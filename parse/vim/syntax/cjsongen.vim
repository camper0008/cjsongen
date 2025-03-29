" Vim syntax file
" Language: cjsongen
" Maintainer: SFJ <simonfromjakobsen@gmail.com>
" Latest Revision: 29 Marts 2025

if exists("b:current_syntax")
  finish
endif

syn keyword Keyword struct
syn keyword Type str int bool

syn match Operator ':'
syn match Operator ','

syn keyword Todo contained TODO FIXME XXX NOTE
syn match Comment "//.*$" contains=Todo

syn match Identifier '[a-zA-Z_]\w*'

syn region cjsongenBlock start="{" end="}" transparent fold

let b:current_syntax = "cjsongen"
