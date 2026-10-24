import type { Project } from '../types'
import { buildPackage, packageSizeKb } from '../export/package'
import { download } from './format'
import { slugify } from '../engine/rng'

export async function downloadProjectZip(project: Project): Promise<void> {
  // Loaded on demand — keeps ~100KB of zip machinery out of the first paint.
  const { default: JSZip } = await import('jszip')
  const files = buildPackage(project)
  const zip = new JSZip()
  const root = zip.folder(`${slugify(project.name)}-devzign`)!
  for (const file of files) root.file(file.path, file.content)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  download(`${slugify(project.name)}-devzign.zip`, blob, 'application/zip')
}

export function packageSummary(project: Project): { files: number; kb: number } {
  const files = buildPackage(project)
  return { files: files.length, kb: packageSizeKb(files) }
}
