/**
 * Framework targets.
 *
 * The React components in `handoff.ts` are the reference implementation: hooks,
 * typed props, one component per screen. Other frameworks get the same screens
 * through a different route — a framework-free renderer (`ui/renderer.ts`) plus
 * a small adapter that owns state and forwards events. That keeps one source of
 * truth for markup and makes "export this as Vue" a real option instead of a
 * parallel universe of generated code.
 *
 * The target comes from the product's own decision record: the `UI runtime`
 * layer on the System page. Change it there and the export changes.
 */
import type { Project, Screen, Section } from '../../types'
import type { PackageFile } from '../package'
import { RUNTIME_SOURCE } from './runtime'

export type FrameworkId = 'react' | 'vue' | 'svelte' | 'preact' | 'solid' | 'angular' | 'lit' | 'vanilla'

export interface Framework {
  id: FrameworkId
  label: string
  extension: string
  /** What the package needs installed to build the adapters. */
  install: string
  idiom: string
  note: string
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'react',
    label: 'React',
    extension: 'tsx',
    install: 'react react-dom',
    idiom: 'Function components, hooks, typed props',
    note: 'Reference implementation: every screen is a component with `rows` and callbacks, no data imports.',
  },
  {
    id: 'vue',
    label: 'Vue 3',
    extension: 'vue',
    install: 'vue',
    idiom: 'Single-file components, `<script setup>`, `v-html`',
    note: 'Each screen is an SFC whose template mounts the shared renderer; state is a `ref`.',
  },
  {
    id: 'svelte',
    label: 'Svelte 5',
    extension: 'svelte',
    install: 'svelte',
    idiom: 'Components with `export let`, reactive `$:`, `{@html}`',
    note: 'Each screen is a `.svelte` file; `$:` recomputes the markup when rows or state change.',
  },
  {
    id: 'preact',
    label: 'Preact',
    extension: 'tsx',
    install: 'preact',
    idiom: 'React-compatible components on `preact/hooks`',
    note: 'The React components with the import specifier swapped — 3 kB runtime, same props.',
  },
  {
    id: 'solid',
    label: 'Solid',
    extension: 'tsx',
    install: 'solid-js',
    idiom: 'Signals, `createSignal`, JSX with `innerHTML`',
    note: 'Each screen is a Solid component: one signal holds the state, one accessor returns the markup.',
  },
  {
    id: 'angular',
    label: 'Angular',
    extension: 'ts',
    install: '@angular/core',
    idiom: 'Standalone components, `@Input`, `[innerHTML]`',
    note: 'Each screen is a standalone component with an inline template; rows come in as an `@Input`.',
  },
  {
    id: 'lit',
    label: 'Lit',
    extension: 'ts',
    install: 'lit',
    idiom: '`LitElement`, reactive properties, `unsafeHTML`',
    note: 'Each screen is a Lit element with a reactive `rows` property and a directive-rendered body.',
  },
  {
    id: 'vanilla',
    label: 'Web Components',
    extension: 'ts',
    install: 'none',
    idiom: 'Custom elements, setters, `innerHTML`',
    note: 'No framework at all: `<app-screen-x>` elements your existing page can drop in.',
  },
]

/** The `UI runtime` decision drives the target; anything unrecognised is React. */
export function resolveFramework(project: Project): Framework {
  const runtime = project.system.stack.find((entry) => entry.layer === 'UI runtime')?.choice ?? 'React'
  const choice = runtime.toLowerCase()
  if (choice.startsWith('vue')) return FRAMEWORKS[1]
  if (choice.startsWith('svelte')) return FRAMEWORKS[2]
  if (choice.startsWith('preact')) return FRAMEWORKS[3]
  if (choice.startsWith('solid')) return FRAMEWORKS[4]
  if (choice.startsWith('angular')) return FRAMEWORKS[5]
  if (choice.startsWith('lit')) return FRAMEWORKS[6]
  if (choice.startsWith('web') || choice.startsWith('vanilla')) return FRAMEWORKS[7]
  return FRAMEWORKS[0]
}

export const frameworkById = (id: FrameworkId): Framework => FRAMEWORKS.find((f) => f.id === id) ?? FRAMEWORKS[0]

/* -------------------------------------------------------------------------
   naming
   ------------------------------------------------------------------------- */

import { componentName, kebab } from '../naming'

export { componentName }

/* -------------------------------------------------------------------------
   the shared runtime
   ------------------------------------------------------------------------- */

function runtimeFiles(project: Project): PackageFile[] {
  const ir = Object.fromEntries(
    project.sections.flatMap((section) =>
      section.screens.map((screen) => [
        screen.id,
        { name: screen.name, section: section.name, route: screen.route, blocks: screen.blocks },
      ]),
    ),
  )
  return [
    { path: 'ui/renderer.ts', content: RUNTIME_SOURCE },
    { path: 'ui/screens.json', content: `${JSON.stringify(ir, null, 2)}\n` },
  ]
}

/* -------------------------------------------------------------------------
   per-screen adapters
   ------------------------------------------------------------------------- */

const props = `rows: Row[]
  onOpen?: (id: string) => void
  onCreate?: () => void
  onSearch?: (value: string) => void
  onSubmit?: (values: Record<string, string>) => void
  className?: string`

function vueComponent(section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  return `<!-- ${name} — exported by Lula DevZign. Props only: no data imports, no fetch. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  handleClick,
  handleInput,
  handleSubmit,
  initialState,
  renderScreen,
  type Handlers,
  type Row,
} from '../../../ui/renderer'

const props = defineProps<{
  ${props}
}>()

const handlers: Handlers = {
  onOpen: (id) => props.onOpen?.(id),
  onCreate: () => props.onCreate?.(),
  onSearch: (value) => props.onSearch?.(value),
  onSubmit: (values) => props.onSubmit?.(values),
}

const state = ref(initialState())
const html = computed(() => renderScreen('${screen.id}', props.rows, state.value))

function onClick(event: MouseEvent) {
  state.value = handleClick(event, state.value, handlers)
}
function onInput(event: Event) {
  state.value = handleInput(event, state.value, handlers)
}
function onSubmit(event: Event) {
  handleSubmit(event, state.value, handlers)
}
</script>

<template>
  <div :class="className" @click="onClick" @input="onInput" @submit="onSubmit" v-html="html"></div>
</template>
`
}

function svelteComponent(section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  return `<!-- ${name} — exported by Lula DevZign. Props only: no data imports, no fetch. -->
<script lang="ts">
  import {
    handleClick,
    handleInput,
    handleSubmit,
    initialState,
    renderScreen,
    type Handlers,
    type Row,
    type ScreenState,
  } from '../../../ui/renderer'

  export let rows: Row[] = []
  export let onOpen: ((id: string) => void) | undefined = undefined
  export let onCreate: (() => void) | undefined = undefined
  export let onSearch: ((value: string) => void) | undefined = undefined
  export let onSubmit: ((values: Record<string, string>) => void) | undefined = undefined
  export let className = ''

  const handlers: Handlers = {
    onOpen: (id) => onOpen?.(id),
    onCreate: () => onCreate?.(),
    onSearch: (value) => onSearch?.(value),
    onSubmit: (values) => onSubmit?.(values),
  }

  let state: ScreenState = initialState()
  $: html = renderScreen('${screen.id}', rows, state)

  function onClick(event: MouseEvent) {
    state = handleClick(event, state, handlers)
  }
  function onInput(event: Event) {
    state = handleInput(event, state, handlers)
  }
  function submit(event: Event) {
    handleSubmit(event, state, handlers)
  }
</script>

<div class={className} onclick={onClick} oninput={onInput} onsubmit={submit}>{@html html}</div>
`
}


function solidComponent(section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  return `// ${name} — exported by Lula DevZign. Props only: no data imports, no fetch.
import { createSignal } from 'solid-js'
import {
  handleClick,
  handleInput,
  handleSubmit,
  initialState,
  renderScreen,
  type Handlers,
  type Row,
} from '../../../ui/renderer'

export interface ${name}Props {
  rows: Row[]
  onOpen?: (id: string) => void
  onCreate?: () => void
  onSearch?: (value: string) => void
  onSubmit?: (values: Record<string, string>) => void
  class?: string
}

export function ${name}(props: ${name}Props) {
  const [state, setState] = createSignal(initialState())

  const handlers: Handlers = {
    onOpen: (id) => props.onOpen?.(id),
    onCreate: () => props.onCreate?.(),
    onSearch: (value) => props.onSearch?.(value),
    onSubmit: (values) => props.onSubmit?.(values),
  }

  return (
    <div
      class={props.class}
      innerHTML={renderScreen('${screen.id}', props.rows, state())}
      onClick={(event: MouseEvent) => setState(handleClick(event, state(), handlers))}
      onInput={(event: InputEvent) => setState(handleInput(event, state(), handlers))}
      onSubmit={(event: SubmitEvent) => {
        handleSubmit(event, state(), handlers)
      }}
    />
  )
}
`
}

function angularComponent(section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  const tag = `app-${kebab(name)}`
  return `// ${name} — exported by Lula DevZign. A standalone component: \`<${tag} [rows]="rows">\`.
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core'
import {
  handleClick,
  handleInput,
  handleSubmit,
  initialState,
  renderScreen,
  type Handlers,
  type Row,
  type ScreenState,
} from '../../../ui/renderer'

@Component({
  selector: '${tag}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None, // the design system's classes are global
  template: \`
    <div [innerHTML]="html" (click)="onClick($event)" (input)="onInput($event)" (submit)="onSubmit($event)"></div>
  \`,
})
export class ${name}Component {
  @Input() rows: Row[] = []
  @Input() onOpen?: (id: string) => void
  @Input() onCreate?: () => void
  @Input() onSearch?: (value: string) => void
  @Input() onSubmit?: (values: Record<string, string>) => void

  private state: ScreenState = initialState()

  private get handlers(): Handlers {
    return {
      onOpen: (id) => this.onOpen?.(id),
      onCreate: () => this.onCreate?.(),
      onSearch: (value) => this.onSearch?.(value),
      onSubmit: (values) => this.onSubmit?.(values),
    }
  }

  get html(): string {
    return renderScreen('${screen.id}', this.rows, this.state)
  }

  onClick(event: MouseEvent) {
    this.state = handleClick(event, this.state, this.handlers)
  }

  onInput(event: Event) {
    this.state = handleInput(event, this.state, this.handlers)
  }

  onSubmit(event: Event) {
    handleSubmit(event, this.state, this.handlers)
  }
}
`
}

function litComponent(section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  const tag = `app-screen-${kebab(name)}`
  return `// ${name} — exported by Lula DevZign. A Lit element: \`<${tag}>\`.
import { LitElement, html } from 'lit'
import { customElement, property, state as reactive } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import {
  handleClick,
  handleInput,
  handleSubmit,
  initialState,
  renderScreen,
  type Handlers,
  type Row,
  type ScreenState,
} from '../../../ui/renderer'

@customElement('${tag}')
export class ${name}Element extends LitElement {
  // The design system's classes are global; no shadow root to fight them.
  createRenderRoot() {
    return this
  }

  @property({ attribute: false }) rows: Row[] = []
  @property({ attribute: false }) onOpen?: (id: string) => void
  @property({ attribute: false }) onCreate?: () => void
  @property({ attribute: false }) onSearch?: (value: string) => void
  @property({ attribute: false }) onSubmit?: (values: Record<string, string>) => void

  @reactive() private model: ScreenState = initialState()

  private get handlers(): Handlers {
    return {
      onOpen: (id) => this.onOpen?.(id),
      onCreate: () => this.onCreate?.(),
      onSearch: (value) => this.onSearch?.(value),
      onSubmit: (values) => this.onSubmit?.(values),
    }
  }

  private paint(event: Event) {
    this.model = handleClick(event, this.model, this.handlers)
  }

  private typed(event: Event) {
    this.model = handleInput(event, this.model, this.handlers)
  }

  private submit(event: Event) {
    handleSubmit(event, this.model, this.handlers)
  }

  render() {
    return html\`
      <div
        @click=\${(event: MouseEvent) => this.paint(event)}
        @input=\${(event: InputEvent) => this.typed(event)}
        @submit=\${(event: SubmitEvent) => this.submit(event)}
      >
        \${unsafeHTML(renderScreen('${screen.id}', this.rows, this.model))}
      </div>
    \`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    '${tag}': ${name}Element
  }
}
`
}

function vanillaComponent(section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  const tag = `app-screen-${kebab(name)}`
  return `// ${name} — exported by Lula DevZign. A custom element: \`<${tag}>\`.
// Props only: assign \`rows\`, listen for \`screen-open\` / \`screen-create\`.
import {
  handleClick,
  handleInput,
  handleSubmit,
  initialState,
  renderScreen,
  type Handlers,
  type Row,
  type ScreenState,
} from '../../../ui/renderer'

export class ${name}Element extends HTMLElement {
  private state: ScreenState = initialState()
  private data: Row[] = []

  private handlers: Handlers = {
    onOpen: (id) => this.dispatchEvent(new CustomEvent('screen-open', { detail: id, bubbles: true })),
    onCreate: () => this.dispatchEvent(new CustomEvent('screen-create', { bubbles: true })),
    onSearch: (value) => this.dispatchEvent(new CustomEvent('screen-search', { detail: value, bubbles: true })),
    onSubmit: (values) => this.dispatchEvent(new CustomEvent('screen-submit', { detail: values, bubbles: true })),
  }

  set rows(value: Row[]) {
    this.data = value ?? []
    this.paint()
  }

  get rows(): Row[] {
    return this.data
  }

  connectedCallback() {
    this.addEventListener('click', (event) => {
      this.state = handleClick(event, this.state, this.handlers)
      this.paint()
    })
    this.addEventListener('input', (event) => {
      this.state = handleInput(event, this.state, this.handlers)
      this.paint()
    })
    this.addEventListener('submit', (event) => {
      handleSubmit(event, this.state, this.handlers)
    })
    this.paint()
  }

  private paint() {
    this.innerHTML = renderScreen('${screen.id}', this.data, this.state)
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('${tag}')) {
  customElements.define('${tag}', ${name}Element)
}
`
}

/* -------------------------------------------------------------------------
   shell
   ------------------------------------------------------------------------- */

const navItems = (project: Project) =>
  project.sections.map((section) => ({ name: section.name, route: section.screens[0]?.route ?? `/${section.id}` }))

function vueShell(project: Project): PackageFile[] {
  const items = navItems(project)
  return [
    {
      path: 'shell/components/MainNav.vue',
      content: `<script setup lang="ts">
const items = ${JSON.stringify(items, null, 2)}
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="Primary">
    <a
      v-for="item in items"
      :key="item.route"
      :href="'#' + item.route"
      class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
    >{{ item.name }}</a>
  </nav>
</template>
`,
    },
    {
      path: 'shell/components/AppShell.vue',
      content: `<script setup lang="ts">
import MainNav from './MainNav.vue'
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
    <header class="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <span class="text-sm font-semibold">{{ ${JSON.stringify(project.name)} }}</span>
        <MainNav />
      </div>
    </header>
    <main class="mx-auto w-full max-w-3xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
`,
    },
  ]
}

function svelteShell(project: Project): PackageFile[] {
  const items = navItems(project)
  return [
    {
      path: 'shell/components/MainNav.svelte',
      content: `<script lang="ts">
  const items = ${JSON.stringify(items, null, 2)}
</script>

<nav class="flex items-center gap-1" aria-label="Primary">
  {#each items as item (item.route)}
    <a
      href={'#' + item.route}
      class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
    >{item.name}</a>
  {/each}
</nav>
`,
    },
    {
      path: 'shell/components/AppShell.svelte',
      content: `<script lang="ts">
  import MainNav from './MainNav.svelte'
</script>

<div class="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
  <header class="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
      <span class="text-sm font-semibold">${project.name}</span>
      <MainNav />
    </div>
  </header>
  <main class="mx-auto w-full max-w-3xl px-4 py-6">
    <slot />
  </main>
</div>
`,
    },
  ]
}


function solidShell(project: Project): PackageFile[] {
  const items = navItems(project)
  return [
    {
      path: 'shell/components/MainNav.tsx',
      content: `const items = ${JSON.stringify(items, null, 2)}

export function MainNav() {
  return (
    <nav class="flex items-center gap-1" aria-label="Primary">
      {items.map((item) => (
        <a
          href={'#' + item.route}
          class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >
          {item.name}
        </a>
      ))}
    </nav>
  )
}
`,
    },
    {
      path: 'shell/components/AppShell.tsx',
      content: `import type { JSX } from 'solid-js'
import { MainNav } from './MainNav'

export function AppShell(props: { children?: JSX.Element }) {
  return (
    <div class="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header class="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span class="text-sm font-semibold">${project.name}</span>
          <MainNav />
        </div>
      </header>
      <main class="mx-auto w-full max-w-3xl px-4 py-6">{props.children}</main>
    </div>
  )
}
`,
    },
  ]
}

function angularShell(project: Project): PackageFile[] {
  const items = navItems(project)
  return [
    {
      path: 'shell/components/main-nav.component.ts',
      content: `import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'app-main-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <nav class="flex items-center gap-1" aria-label="Primary">
      @for (item of items; track item.route) {
        <a
          [href]="'#' + item.route"
          class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >{{ item.name }}</a>
      }
    </nav>
  \`,
})
export class MainNavComponent {
  items = ${JSON.stringify(items, null, 2)}
}
`,
    },
    {
      path: 'shell/components/app-shell.component.ts',
      content: `import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MainNavComponent } from './main-nav.component'

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [MainNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div class="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header class="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span class="text-sm font-semibold">${project.name}</span>
          <app-main-nav />
        </div>
      </header>
      <main class="mx-auto w-full max-w-3xl px-4 py-6"><ng-content /></main>
    </div>
  \`,
})
export class AppShellComponent {}
`,
    },
  ]
}

function litShell(project: Project): PackageFile[] {
  const items = navItems(project)
  return [
    {
      path: 'shell/components/app-shell.element.ts',
      content: `import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

const NAV = ${JSON.stringify(items, null, 2)}

@customElement('app-shell')
export class AppShellElement extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html\`
      <div class="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <header class="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
          <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <span class="text-sm font-semibold">${project.name}</span>
            <nav class="flex items-center gap-1" aria-label="Primary">
              \${NAV.map(
                (item) => html\`<a
                  href=\${'#' + item.route}
                  class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                >\${item.name}</a>\`,
              )}
            </nav>
          </div>
        </header>
        <main class="mx-auto w-full max-w-3xl px-4 py-6"><slot></slot></main>
      </div>
    \`
  }
}
`,
    },
  ]
}

function vanillaShell(project: Project): PackageFile[] {
  const items = navItems(project)
  return [
    {
      path: 'shell/components/app-shell.ts',
      content: `// AppShell — the frame every screen sits in. Exported by Lula DevZign.
const NAV = ${JSON.stringify(items, null, 2)}

export class AppShellElement extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return
    this.dataset.ready = 'true'
    this.innerHTML = \`
      <div class="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <header class="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
          <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <span class="text-sm font-semibold">${project.name}</span>
            <nav class="flex items-center gap-1" aria-label="Primary">
              \${NAV.map(
                (item) =>
                  \`<a href="#\${item.route}" class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]">\${item.name}</a>\`,
              ).join('')}
            </nav>
          </div>
        </header>
        <main class="mx-auto w-full max-w-3xl px-4 py-6"><slot></slot></main>
      </div>
    \`
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('app-shell')) {
  customElements.define('app-shell', AppShellElement)
}
`,
    },
  ]
}

/* -------------------------------------------------------------------------
   assembly
   ------------------------------------------------------------------------- */

/** Components for one screen in the target framework (React is emitted by handoff.ts). */
export function screenFile(project: Project, section: Section, screen: Screen, framework: Framework): PackageFile {
  const name = componentName(section, screen)
  switch (framework.id) {
    case 'vue':
      return { path: `sections/${section.id}/components/${name}.vue`, content: vueComponent(section, screen) }
    case 'svelte':
      return { path: `sections/${section.id}/components/${name}.svelte`, content: svelteComponent(section, screen) }
    case 'preact':
      return { path: `sections/${section.id}/components/${name}.tsx`, content: '' }
    case 'solid':
      return { path: `sections/${section.id}/components/${name}.tsx`, content: solidComponent(section, screen) }
    case 'angular':
      return { path: `sections/${section.id}/components/${name}.component.ts`, content: angularComponent(section, screen) }
    case 'lit':
      return { path: `sections/${section.id}/components/${name}.element.ts`, content: litComponent(section, screen) }
    case 'vanilla':
      return { path: `sections/${section.id}/components/${name}.ts`, content: vanillaComponent(section, screen) }
    default:
      return { path: `sections/${section.id}/components/${name}.tsx`, content: '' }
  }
}

export function frameworkDoc(project: Project, framework: Framework): PackageFile {
  const usage: Record<FrameworkId, string> = {
    react: '',
    vue: `\`\`\`vue
<script setup lang="ts">
import { CarelineControlRoom } from './sections/control-room/components/CarelineControlRoom.vue'
</script>

<template>
  <CarelineControlRoom :rows="rows" :on-open="open" :on-search="search" />
</template>
\`\`\``,
    svelte: `\`\`\`svelte
<script lang="ts">
  import CarelineControlRoom from './sections/control-room/components/CarelineControlRoom.svelte'
</script>

<CarelineControlRoom {rows} onOpen={open} onSearch={search} />
\`\`\``,
    solid: `\`\`\`tsx
import { ${'{'} ControlRoom ${'}'}  } from './sections/control-room/components/CarelineControlRoom'

<ControlRoom rows={rows} onOpen={open} onSearch={search} />
\`\`\``,
    angular: `\`\`\`ts
import { CarelineControlRoomComponent } from './sections/control-room/components/CarelineControlRoom.component'

@Component({
  imports: [CarelineControlRoomComponent],
  template: '<app-careline-control-room [rows]="rows" [onOpen]="open" />',
})
export class Page {}
\`\`\``,
    lit: `\`\`\`html
<script type="module">
  import './sections/control-room/components/CarelineControlRoom.element'
  const screen = document.querySelector('app-screen-careline-control-room')
  screen.rows = rows
  screen.onOpen = (id) => open(id)
</script>
\`\`\``,
    preact: `\`\`\`tsx
import { CarelineControlRoom } from './sections/control-room/components/CarelineControlRoom'

<CarelineControlRoom rows={rows} onOpen={open} onSearch={search} />
\`\`\``,
    vanilla: `\`\`\`ts
import './sections/control-room/components/CarelineControlRoom'

const screen = document.querySelector('app-screen-careline-control-room')!
screen.rows = rows
screen.addEventListener('screen-open', (event) => open((event as CustomEvent<string>).detail))
\`\`\``,
  }

  return {
    path: 'FRAMEWORK.md',
    content: `# ${framework.label} target

This package was exported for **${framework.label}** (${framework.idiom}).

${framework.note}

## Install

\`\`\`
npm i ${framework.install}
\`\`\`

## Use a screen

${usage[framework.id]}

## How it fits together

| File | Role |
| --- | --- |
| ${framework.id === 'preact' ? '`sections/<id>/components/*.tsx`' : '`ui/renderer.ts`'} | ${framework.id === 'preact' ? 'the components, on `preact/hooks`' : 'framework-free renderer: block → markup, plus the event helpers'} |
| ${framework.id === 'preact' ? '`shell/components/*.tsx`' : '`ui/screens.json`'} | ${framework.id === 'preact' ? 'the app frame and primary nav' : 'the compiled screen IR the renderer reads'} |
| \`sections/<id>/components/*.${framework.extension}\` | one component per screen, props in, callbacks out |
| \`shell/components/*.${framework.extension}\` | the app frame and primary nav |
| \`sections/<id>/types.ts\` | the row types, generated from the data shape |
| \`src/data/\` | the repository interface and the mock adapter |

${framework.id === 'preact' ? 'Preact consumes the React components directly, so there is one implementation to maintain.' : `The renderer is the same file every target gets, so a screen fixed in ${framework.label} is fixed in React too. React ships idiomatic hook components instead of an adapter — switch the **UI runtime** on the System page back to React to get those.`}

## What is not translated

Tailwind classes, CSS custom properties, the token file and the API are
framework-agnostic and unchanged. Routing is yours: these are components, not an
application with a router, which is also true of the React export.
`,
  }
}

/** Shell, runtime and the migration note. */
export function frameworkFiles(project: Project, framework: Framework, reactShell: PackageFile[]): PackageFile[] {
  if (framework.id === 'react') return []
  const files: PackageFile[] = [...runtimeFiles(project)]

  if (framework.id === 'vue') {
    files.push(...vueShell(project), {
      path: 'shell/components/index.ts',
      content: "export { default as AppShell } from './AppShell.vue'\nexport { default as MainNav } from './MainNav.vue'\n",
    })
  } else if (framework.id === 'svelte') {
    files.push(...svelteShell(project), {
      path: 'shell/components/index.ts',
      content: "export { default as AppShell } from './AppShell.svelte'\nexport { default as MainNav } from './MainNav.svelte'\n",
    })
  } else if (framework.id === 'solid') {
    files.push(...solidShell(project), {
      path: 'shell/components/index.ts',
      content: "export { AppShell } from './AppShell'\nexport { MainNav } from './MainNav'\n",
    })
  } else if (framework.id === 'angular') {
    files.push(...angularShell(project), {
      path: 'shell/components/index.ts',
      content: "export { AppShellComponent } from './app-shell.component'\nexport { MainNavComponent } from './main-nav.component'\n",
    })
  } else if (framework.id === 'lit') {
    files.push(...litShell(project), {
      path: 'shell/components/index.ts',
      content: "export { AppShellElement } from './app-shell.element'\n",
    })
  } else if (framework.id === 'vanilla') {
    files.push(...vanillaShell(project), {
      path: 'shell/components/index.ts',
      content: "export { AppShellElement } from './app-shell'\n",
    })
  }
  else files.push(...reactShell.map((file) => ({ ...file, content: file.content.replace(/from 'react'/g, "from 'preact/hooks'").replace(/from 'react-dom\/client'/g, "from 'preact/compat'") })))

  files.push(frameworkDoc(project, framework))

  return files
}
