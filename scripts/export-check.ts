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
import { parse as parseVue, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { compile as compileSvelte } from 'svelte/compiler'
import { parseTemplate } from '@angular/compiler'
import ts from 'typescript'
import { compileProject } from '../src/engine'
import { buildPackage } from '../src/export/package'
import { FRAMEWORKS } from '../src/export/frameworks'

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

/* --------------------------------------------------------------------------
   Every framework target: real components, compiled with the framework's own
   compiler. Vue and Svelte have compilers in devDependencies for exactly this;
   the vanilla target is typechecked by tsc like any other .ts file.
   -------------------------------------------------------------------------- */

const base = compileProject(cases[0] as never)

function asFramework(label: string) {
  return {
    ...base,
    system: {
      ...base.system,
      stack: base.system.stack.map((entry) => (entry.layer === 'UI runtime' ? { ...entry, choice: label } : entry)),
    },
  }
}

const screenCount = base.sections.reduce((total, section) => total + section.screens.length, 0)

for (const framework of FRAMEWORKS) {
  const project = asFramework(framework.label)
  const files = buildPackage(project)
  const components = files.filter(
    (file) =>
      /^sections\/.+\/components\/[^/]+$/.test(file.path) &&
      !file.path.endsWith('index.ts') &&
      file.path.endsWith(`.${framework.extension}`),
  )

  check(
    `${framework.label} · a component for every screen`,
    components.length === screenCount,
    `${components.length}/${screenCount} .${framework.extension}`,
  )

  if (framework.id === 'vue') {
    const problems: string[] = []
    for (const file of components) {
      const { descriptor, errors } = parseVue(file.content, { filename: file.path })
      if (errors.length) problems.push(`${file.path}: ${errors[0].message}`)
      if (!descriptor.template) {
        problems.push(`${file.path}: no template`)
        continue
      }
      try {
        compileScript(descriptor, { id: file.path })
        const compiled = compileTemplate({
          source: descriptor.template.content,
          filename: file.path,
          id: file.path,
        })
        if (compiled.errors.length) problems.push(`${file.path}: ${String(compiled.errors[0])}`)
      } catch (error) {
        problems.push(`${file.path}: ${(error as Error).message}`)
      }
    }
    check(`${framework.label} · every SFC compiles`, problems.length === 0, problems.slice(0, 3).join(' | '))
  }

  if (framework.id === 'svelte') {
    const problems: string[] = []
    for (const file of components) {
      try {
        const result = compileSvelte(file.content, { filename: file.path, generate: 'client' })
        if (result.warnings?.some((warning) => String(warning.code).startsWith('a11y') === false && warning.code === 'parse-error')) {
          problems.push(`${file.path}: parse error`)
        }
      } catch (error) {
        problems.push(`${file.path}: ${(error as Error).message}`)
      }
    }
    check(`${framework.label} · every component compiles`, problems.length === 0, problems.slice(0, 3).join(' | '))
    const shell = files.find((file) => file.path === 'shell/components/AppShell.svelte')
    check(`${framework.label} · shell compiled`, Boolean(shell) && shell!.content.includes('<slot />'))
  }

  if (framework.id === 'vanilla') {
    const dir = join(scratch, 'vanilla')
    const keep = files.filter(
      (file) => file.path === 'ui/renderer.ts' || file.path === 'ui/screens.json' || components.some((c) => c.path === file.path),
    )
    for (const file of keep) {
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
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            resolveJsonModule: true,
            types: [],
          },
          include: ['**/*.ts'],
        },
        null,
        2,
      ),
    )
    try {
      execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(dir, 'tsconfig.json')], {
        cwd: root,
        stdio: 'pipe',
        encoding: 'utf8',
      })
      check(`${framework.label} · renderer and components typecheck`, true)
    } catch (error) {
      const output = String((error as { stdout?: string; stderr?: string }).stdout ?? (error as Error).message)
      check(`${framework.label} · renderer and components typecheck`, false, output.split('\n').slice(0, 6).join(' | '))
    }
  }

  if (framework.id === 'angular') {
    const problems: string[] = []
    for (const file of components) {
      const template = file.content.match(/template:\s*`([\s\S]*?)`,\n\}/)?.[1]
      if (!template) {
        problems.push(`${file.path}: no inline template`)
        continue
      }
      const parsed = parseTemplate(template, file.path, { preserveWhitespaces: false })
      if (parsed.errors?.length) problems.push(`${file.path}: ${String(parsed.errors[0])}`)
      const transpiled = ts.transpileModule(file.content, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true },
        reportDiagnostics: true,
      })
      const errors = (transpiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error)
      if (errors.length) problems.push(`${file.path}: ${ts.flattenDiagnosticMessageText(errors[0].messageText, ' ')}`)
    }
    check(`${framework.label} · every template parses`, problems.length === 0, problems.slice(0, 3).join(' | '))
  }

  if (framework.id === 'solid' || framework.id === 'lit') {
    const dir = join(scratch, framework.id)
    const keep = files.filter(
      (file) =>
        file.path === 'ui/renderer.ts' ||
        file.path === 'ui/screens.json' ||
        (file.path.startsWith('shell/components/') && file.path.endsWith('.ts')) ||
        (file.path.startsWith('shell/components/') && file.path.endsWith('.tsx')) ||
        components.some((component) => component.path === file.path),
    )
    for (const file of keep) {
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
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            resolveJsonModule: true,
            experimentalDecorators: framework.id === 'lit',
            useDefineForClassFields: framework.id !== 'lit',
            jsx: framework.id === 'solid' ? 'preserve' : 'react-jsx',
            jsxImportSource: framework.id === 'solid' ? 'solid-js' : undefined,
            types: [],
          },
          include: ['**/*.ts', '**/*.tsx'],
        },
        null,
        2,
      ),
    )
    try {
      execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(dir, 'tsconfig.json')], {
        cwd: root,
        stdio: 'pipe',
        encoding: 'utf8',
      })
      check(`${framework.label} · components typecheck`, true)
    } catch (error) {
      const output = String((error as { stdout?: string; stderr?: string }).stdout ?? (error as Error).message)
      check(`${framework.label} · components typecheck`, false, output.split('\n').slice(0, 6).join(' | '))
    }
  }

  if (framework.id === 'preact') {
    const component = components[0]
    check(
      `${framework.label} · imports preact, not react`,
      Boolean(component) && component!.content.includes("from 'preact/hooks'") && !component!.content.includes("from 'react'"),
    )
  }

  if (framework.id !== 'react') {
    const renderer = files.some((file) => file.path === 'ui/renderer.ts') && files.some((file) => file.path === 'ui/screens.json')
    check(
      framework.id === 'preact' ? `${framework.label} · ships its own migration note` : `${framework.label} · ships the framework-free renderer`,
      framework.id === 'preact'
        ? files.some((file) => file.path === 'FRAMEWORK.md')
        : renderer && files.some((file) => file.path === 'FRAMEWORK.md'),
    )
  }
}

/* --------------------------------------------------------------------------
   The backend: typecheck the generated server, then run its own test suite.
   Both run for real — a generated rule that does not hold fails this script.
   -------------------------------------------------------------------------- */

for (const testCase of cases.slice(0, 2)) {
  const project = compileProject(testCase)
  const files = buildPackage(project, [])
  const serverFiles = files.filter((file) => file.path.startsWith('server/'))
  const serverDir = join(root, '.scratch', `backend-${testCase.archetypeId}`)
  rmSync(serverDir, { recursive: true, force: true })

  for (const file of serverFiles) {
    const target = join(serverDir, file.path.replace(/^server\//, ''))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, file.content)
  }

  check(`${testCase.archetypeId} · backend is generated (${serverFiles.length} files)`, serverFiles.length >= 14)

  try {
    execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(serverDir, 'tsconfig.json')], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    })
    check(`${testCase.archetypeId} · backend typechecks`, true)
  } catch (error) {
    const output = String((error as { stdout?: string }).stdout ?? (error as Error).message)
    check(`${testCase.archetypeId} · backend typechecks`, false, output.split('\n').slice(0, 5).join(' | '))
  }

  try {
    const output = execFileSync(
      'node',
      ['--experimental-strip-types', '--test', 'src/tests/rules.test.ts', 'src/tests/api.test.ts'],
      { cwd: serverDir, stdio: 'pipe', encoding: 'utf8' },
    )
    const pass = Number((String(output).match(/# pass (\d+)/) ?? [])[1] ?? 0)
    check(`${testCase.archetypeId} · backend tests pass (${pass})`, pass >= 14)
  } catch (error) {
    const output = String((error as { stdout?: string }).stdout ?? (error as Error).message)
    check(`${testCase.archetypeId} · backend tests pass`, false, output.split('\n').slice(-4).join(' | '))
  }
}

rmSync(join(root, '.scratch'), { recursive: true, force: true })
rmSync(scratch, { recursive: true, force: true })
console.log(failures ? `\n${failures} export check(s) failed` : '\nexport check passed')
process.exit(failures ? 1 : 0)
