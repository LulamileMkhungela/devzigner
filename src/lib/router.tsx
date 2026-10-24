import { useEffect, useState } from 'react'
import type { ReactNode, AnchorHTMLAttributes } from 'react'

/**
 * Hash routing for the five-phase flow. Every route in the app is a real
 * address, so refresh, back and forward all behave the way the Design OS
 * flow expects.
 *
 *   /                                    Product
 *   /data-shape                          Data Shape
 *   /design                              Design
 *   /shell/design                        Design · shell preview
 *   /sections                            Sections
 *   /sections/:id                        Section detail
 *   /sections/:id/screen-designs/:name   Screen design preview
 *   /export                              Export
 *
 * Any of the last three can be suffixed with /fullscreen.
 */

function currentHash(): string {
  return typeof window === 'undefined' || !window.location ? '' : window.location.hash
}

export function navigate(to: string) {
  const target = `#/${to.replace(/^#?\/?/, '')}`
  if (currentHash() === target) return
  if (typeof window !== 'undefined' && window.location) window.location.hash = target
}

export function pathOf(hash: string): string[] {
  return decodeURIComponent(hash).replace(/^#?\/?/, '').split('/').filter(Boolean)
}

export function href(to: string): string {
  return `#/${to.replace(/^#?\/?/, '')}`
}

export function useRoute(): { path: string[]; raw: string; fullscreen: boolean } {
  const [raw, setRaw] = useState(currentHash)
  useEffect(() => {
    const onChange = () => {
      setRaw(location.hash)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const path = pathOf(raw)
  const fullscreen = path[path.length - 1] === 'fullscreen'
  return { path: fullscreen ? path.slice(0, -1) : path, raw, fullscreen }
}

export function Link({
  to,
  className,
  title,
  onClick,
  children,
  ...rest
}: {
  to: string
  className?: string
  title?: string
  onClick?: () => void
  children: ReactNode
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'className' | 'title'>) {
  return (
    <a
      href={href(to)}
      className={className}
      title={title}
      onClick={() => onClick?.()}
      {...rest}
    >
      {children}
    </a>
  )
}
