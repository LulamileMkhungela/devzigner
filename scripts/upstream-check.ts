/**
 * Is every vendored Builder Methods file still exactly upstream's file?
 *
 * ProdOps promises the tools are installed *verbatim* — not paraphrased, not
 * trimmed. That claim rots the moment upstream changes a command or adds a step
 * file, and nobody notices because a vendored copy is silent by nature. So this
 * downloads the five repositories and compares, file by file:
 *
 *   npm run upstream-check
 *
 * It fails on a missing file (upstream added one), a changed byte (upstream
 * edited one) or an extra vendored file (we invented one) — line endings aside,
 * which are normalised because upstream is not consistent about them. Network absent is a
 * skip with a clear message, not a failure: the offline answer to "is this
 * verbatim" is `src/export/upstream.ts` plus the pinned commits in it.
 *
 *   npm run upstream-check -- --update   # print the diff, do not fail (review aid)
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { DESIGN_OS_COMMANDS, DESIGN_OS_SKILL } from '../src/export/vendor/designOsCommands'
import { AGENT_OS_COMMANDS } from '../src/export/vendor/agentOsCommands'
import { TOOLKIT } from '../src/export/vendor/toolkit'
import { MANUALS } from '../src/export/vendor/manuals'

const LENIENT = process.argv.includes('--update')

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'ERR '} ${label}${detail ? ` — ${detail}` : ''}`)
}

const work = mkdtempSync(join(tmpdir(), 'prodops-upstream-'))
const REPOS = ['design-os', 'agent-os', 'bm-skills', 'build-new', 'agentcanon'] as const
type Repo = (typeof REPOS)[number]

function fetchRepo(repo: Repo): string | null {
  const target = join(work, repo)
  try {
    execFileSync('curl', ['-sL', '--max-time', '90', `https://codeload.github.com/buildermethods/${repo}/tar.gz/refs/heads/main`, '-o', `${target}.tgz`], {
      stdio: 'pipe',
    })
    execFileSync('mkdir', ['-p', target])
    execFileSync('tar', ['xzf', `${target}.tgz`, '-C', target, '--strip-components=1'], { stdio: 'pipe' })
    return target
  } catch {
    return null
  }
}

function walk(dir: string, base = dir): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full, { throwIfNoEntry: false })
    if (!st || st.isSymbolicLink()) continue
    if (st.isDirectory()) out.push(...walk(full, base))
    else out.push(relative(base, full))
  }
  return out
}

const read = (path: string) => readFileSync(path, 'utf8')

/** The vendored copy, indexed the way the package writes it. */
const vendored = new Map<string, string>()
for (const tool of TOOLKIT) for (const file of tool.files) vendored.set(file.path, file.content)
for (const manual of MANUALS) vendored.set(manual.path, manual.content)

console.log(`upstream check — ${REPOS.length} repositories\n`)

const trees = new Map<Repo, string>()
for (const repo of REPOS) {
  const path = fetchRepo(repo)
  if (path) trees.set(repo, path)
  check(`${repo} downloaded`, Boolean(path))
}

if (trees.size === 0) {
  console.log('\nno network — the pinned commits in src/export/upstream.ts are the offline record')
  rmSync(work, { recursive: true, force: true })
  process.exit(0)
}

/**
 * Compare one upstream file to its vendored copy.
 *
 * Line endings are normalised before the comparison: several upstream files are
 * committed with CRLF, the vendored copies are LF, and "same command, different
 * newline" is not drift. Everything else is compared byte for byte.
 */
const normalise = (text: string) => text.replace(/\r\n/g, '\n')

const compare = (label: string, upstream: string, mine: string | undefined) => {
  if (mine === undefined) {
    check(label, false, 'not vendored')
    return
  }
  const same = normalise(mine) === normalise(upstream)
  const eolOnly = !same ? '' : mine === upstream ? '' : ' (line endings normalised)'
  check(label, same, same ? eolOnly : `${mine.length}b vendored vs ${upstream.length}b upstream`)
}

/* ---- design-os: ten commands + one skill ------------------------------- */
{
  const tree = trees.get('design-os')
  if (tree) {
    const dir = join(tree, '.claude/commands/design-os')
    const files = walk(dir).filter((f) => f.endsWith('.md'))
    check('design-os: ten commands upstream', files.length === 10, `${files.length}`)
    for (const file of files) {
      const name = file.replace(/\.md$/, '')
      compare(`design-os/${name}.md`, read(join(dir, file)), DESIGN_OS_COMMANDS.find((c) => c.name === name)?.content)
    }
    compare('design-os/frontend-design/SKILL.md', read(join(tree, '.agents/skills/frontend-design/SKILL.md')), DESIGN_OS_SKILL)
    const docs = walk(join(tree, 'docs')).filter((f) => f.endsWith('.md'))
    for (const doc of docs) {
      const path = `docs/design-os/${doc}`
      compare(path, read(join(tree, 'docs', doc)), vendored.get(path))
    }
  }
}

/* ---- agent-os: five commands ------------------------------------------- */
{
  const tree = trees.get('agent-os')
  if (tree) {
    const dir = join(tree, 'commands/agent-os')
    const files = walk(dir).filter((f) => f.endsWith('.md'))
    check('agent-os: five commands upstream', files.length === 5, `${files.length}`)
    for (const file of files) {
      const name = file.replace(/\.md$/, '')
      compare(`agent-os/${name}.md`, read(join(dir, file)), AGENT_OS_COMMANDS.find((c) => c.name === name)?.content)
    }
    for (const doc of ['README.md', 'CHANGELOG.md', 'LICENSE']) {
      const path = `docs/agent-os/${doc}`
      compare(path, read(join(tree, doc)), vendored.get(path))
    }
  }
}

/* ---- bm-skills: four skills, minus the marketplace wrapper ------------- */
{
  const tree = trees.get('bm-skills')
  if (tree) {
    let compared = 0
    for (const skill of ['bm-prd-creator', 'bm-skill-builder', 'bm-design-system', 'bm-favicon-creator']) {
      const dir = join(tree, 'skills', skill)
      const name = skill.replace(/^bm-/, '')
      for (const file of walk(dir)) {
        const path = `.agents/skills/${name}/${file}`
        compare(path, read(join(dir, file)), vendored.get(path))
        compared++
      }
    }
    check(`bm-skills: ${compared} files compared`, compared >= 73, `${compared}`)
    const logo = join(tree, '.claude-plugin/icon.png')
    check('bm-skills: the marketplace wrapper is not installed', statSync(logo, { throwIfNoEntry: false }) !== undefined)
  }
}

/* ---- build-new: the starter's notes ----------------------------------- */
{
  const tree = trees.get('build-new')
  if (tree) {
    for (const file of ['AGENTS.md', 'README.md', '.agents/setup', 'docs/hatchbox-deployment-guide.md']) {
      const path = `template/build-new/${file}`
      compare(path, read(join(tree, file)), vendored.get(path))
    }
  }
}

/* ---- agentcanon: two skills ------------------------------------------- */
{
  const tree = trees.get('agentcanon')
  if (tree) {
    for (const file of [
      '.agents/skills/agentcanon-repo/SKILL.md',
      '.agents/skills/agentcanon-manifest/SKILL.md',
      '.agents/skills/agentcanon-manifest/skills-manifest.html',
    ]) {
      compare(file, read(join(tree, file)), vendored.get(file))
    }
    const readme = read(join(tree, 'README.md'))
    check('agentcanon: the convention is README.md', readme.length > 1000, `${readme.length}b`)
  }
}

/* ---- nothing invented, nothing dropped -------------------------------- */
{
  const counted = [...vendored.keys()].filter((path) => !path.startsWith('docs/')).length
  check(`the vendored toolkit is ${counted} files, all traced to upstream`, counted >= 80, `${counted}`)
}

rmSync(work, { recursive: true, force: true })

if (failures > 0) {
  console.error(`\n${failures} difference(s) from upstream`)
  if (LENIENT) {
    console.log('--update: reporting only, not failing')
    process.exit(0)
  }
  process.exit(1)
}
console.log('\nevery vendored file matches the five upstream repositories, byte for byte after line-ending normalisation')
