/**
 * Export check: the strongest possible claim about the generated code is that
 * the TypeScript compiler accepts it. This writes every generated .ts/.tsx
 * artefact for a few archetypes to a scratch directory and typechecks them
 * against the project's React types.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileProject } from '../src/engine'
import { buildPackage } from '../src/export/package'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scratch = join(root, 'node_modules', '.export-check')

let failures = 0

function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'ok ' : 'ERR'} ${label}${detail ? ` — ${detail}` : ''}`)
}

const cases: { archetypeId: string; seed: number; overrides?: Record<string, unknown> }[] = [
  { archetypeId: 'clinic', seed: 4242 },
  { archetypeId: 'marketplace', seed: 112233, overrides: { primaryHue: 205, radius: 4, spacing: 1.15 } },
  { archetypeId: 'logistics', seed: 5, systemOverrides: { stack: { Data: 'Raw SQL' } } } as never,
]

rmSync(scratch, { recursive: true, force: true })

for (const [index, testCase] of cases.entries()) {
  const project = compileProject(testCase as never)
  const files = buildPackage(project)
  const dir = join(scratch, `case-${index}`)
  const code = files.filter(
    (file) =>
      /^(sections|shell|data-shapes)\//.test(file.path) && (file.path.endsWith('.ts') || file.path.endsWith('.tsx')),
  )

  for (const file of code) {
    const target = join(dir, file.path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, file.content)
  }

  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: [],
          baseUrl: root,
          paths: {
            react: ['node_modules/@types/react'],
            'react/jsx-runtime': ['node_modules/@types/react/jsx-runtime'],
          },
        },
        include: ['**/*.ts', '**/*.tsx'],
      },
      null,
      2,
    ),
  )

  check(
    `${testCase.archetypeId} · ${code.length} generated components/contracts written`,
    code.length >= project.sections.length + 3,
    `${code.filter((f) => f.path.endsWith('.tsx')).length} .tsx`,
  )

  try {
    execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(dir, 'tsconfig.json')], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    })
    check(`${testCase.archetypeId} · generated code typechecks`, true)
  } catch (error) {
    const output = String((error as { stdout?: string; stderr?: string }).stdout ?? (error as Error).message)
    check(`${testCase.archetypeId} · generated code typechecks`, false, output.split('\n').slice(0, 6).join(' | '))
  }

  const first = code.find((f) => /sections\/.+\/components\/.+\.tsx$/.test(f.path) && !f.path.endsWith('index.ts'))
  check(
    `${testCase.archetypeId} · components are props-only`,
    Boolean(first) && !/^import .*sample-data/m.test(first!.content) && first!.content.includes('rows:'),
  )
  check(
    `${testCase.archetypeId} · components are responsive`,
    Boolean(first) &&
      ['sm:', 'md:', 'lg:'].some((bp) => first!.content.includes(bp) || project.sections.some((s) => files.some((f) => f.path.includes(`sections/${s.id}/components/`) && ['sm:', 'md:', 'lg:'].some((b) => f.content.includes(b))))),
  )
  check(
    `${testCase.archetypeId} · tokens are DTCG typed`,
    (() => {
      const file = files.find((f) => f.path === 'design-system/tokens.dtcg.json')
      if (!file) return false
      const json = JSON.parse(file.content) as Record<string, Record<string, { $type?: string; $value?: unknown }>>
      return ['color', 'dimension', 'fontFamily', 'duration'].every((group) =>
        Object.values(json[group] ?? {}).every((token) => Boolean(token.$type && token.$value !== undefined)),
      )
    })(),
  )
}

rmSync(scratch, { recursive: true, force: true })
console.log(failures ? `\n${failures} export check(s) failed` : '\nexport check passed')
process.exit(failures ? 1 : 0)
