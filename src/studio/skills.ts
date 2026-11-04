/** Bundle the local skill and workflow Markdown for generation and export. */
/// <reference types="vite/client" />
// Bundle the actual skill files and their references for portable handoff.
const raw = import.meta.glob('../../.agents/skills/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const commands = import.meta.glob('../../.agents/commands/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
export const commandFiles = Object.fromEntries(Object.entries(commands).map(([path, content]) => [path.replace('../../.agents/commands/', '.agents/commands/'), content]))
export const skillFiles: Record<string, string> = Object.fromEntries(Object.entries(raw).map(([path, content]) => [path.replace('../../.agents/skills/', '.agents/skills/'), content]))
