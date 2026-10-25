/**
 * The licences of the material that is redistributed in the package.
 *
 * ProdOps ships some agent instructions and command files that were published
 * under the MIT licence. MIT requires the copyright notice and the permission
 * text to travel with every copy, so this one file carries them — and only them.
 * It is the only place in the package where a third party is named: nothing
 * functional, navigational, branded or documented refers to them, and the files
 * themselves are presented as ProdOps's own commands.
 *
 * If you fork the package and keep the redistributed files, keep this file.
 */
const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const notices: { what: string; holder: string; where: string }[] = [
  { what: 'Agent command instructions (.agents/commands/prodops)', holder: 'CasJam Media LLC', where: '2025' },
  { what: 'Agent skills (.agents/skills)', holder: 'CasJam Media LLC', where: '2026' },
  { what: 'Starter template conventions (template/starter)', holder: 'CasJam Media LLC', where: '2026' },
]

export const LICENSES = `# Licences

ProdOps is developed by **Lulamile Mkhungela** and is MIT licensed — see
\`../LICENSE\`.

## Redistributed material

The following files are redistributed under the MIT licence. Their copyright
notice and permission text are reproduced below, as that licence requires.

${notices
  .map(
    (n) => `### ${n.what}

Copyright (c) ${n.where} ${n.holder}

\`\`\`
${MIT_BODY}
\`\`\`
`,
  )
  .join('\n')}
## Everything else

The compiler, the generated components, the tokens, the specifications, the
API, the tests and the documentation in this package were produced by ProdOps
for this product. They carry the same MIT licence as ProdOps itself.
`
