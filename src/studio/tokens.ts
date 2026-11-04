/** Design token serialization and the starter component guide. */
import type { FileItem } from './model'

/** Stable token names form the contract between the visual editor and compatible CSS. */
export interface Tokens { primary: string; background: string; text: string; radius: number; heading: string; button: string; colors?: Record<string,string> }
export const defaultTokens: Tokens = { primary: '#f0621a', background: '#fcf8f2', text: '#241e1a', radius: 10, heading: 'Your product, beautifully simple.', button: 'Get started', colors: {surface:'#ffffff', muted:'#70665e', border:'#e9dfd6', success:'#16865a'} }
export const tokenStart = '/* PRODOPS TOKENS START */'
export const tokenEnd = '/* PRODOPS TOKENS END */'
const colorName = /^[a-z][a-z0-9-]{0,39}$/
const colorValue = /^#[\da-f]{6}$/i
export function tokenCss(tokens: Tokens): string {
  const extras = Object.entries(tokens.colors ?? {}).filter(([name,value]) => colorName.test(name) && colorValue.test(value) && !['primary','background','text'].includes(name)).map(([name,value])=>`  --color-${name}: ${value};`).join('\n')
  return `${tokenStart}\n:root {\n  --color-primary: ${tokens.primary};\n  --color-background: ${tokens.background};\n  --color-text: ${tokens.text};\n${extras ? extras + '\n' : ''}  --radius: ${tokens.radius}px;\n}\n${tokenEnd}`
}
export function replaceTokenBlock(css: string, tokens: Tokens): string | null {
  const start = css.indexOf(tokenStart), end = css.indexOf(tokenEnd, start)
  if (start < 0 || end < 0) return null
  return css.slice(0, start) + tokenCss(tokens) + css.slice(end + tokenEnd.length)
}
export function starterDesignFiles(): FileItem[] {
  return [
    {path:'design/design-tokens.json',content:JSON.stringify(defaultTokens,null,2)},
    {path:'design/design-tokens.css',content:tokenCss(defaultTokens)+'\n'},
    {path:'design/components.md',content:'# Starter design system\n\nThis is an editable starting point, not a completed design. Replace or remove it if you already have a system.\n\n## Named tokens\nUse CSS variables such as `--color-primary`, `--color-background`, `--color-text`, `--color-surface`, `--color-muted`, `--color-border`, `--color-success` and `--radius`.\n\n## Component classes to consider\n- `.button-primary`: primary actions using `--color-primary`.\n- `.card`: content containers using `--color-surface` and `--radius`.\n- `.input`: labelled fields with visible focus.\n- `.badge`: concise status labels; include text, not color alone.\n\nThese are proposed names, not implemented components. Document your own components and verify accessibility.\n'},
  ]
}
