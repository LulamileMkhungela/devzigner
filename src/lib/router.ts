import { useEffect, useState } from 'react'

export function navigate(to: string) {
  if (location.hash === `#${to}`) return
  location.hash = to
}

function parse(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function useRoute(): { path: string[]; raw: string } {
  const [raw, setRaw] = useState(() => location.hash)
  useEffect(() => {
    const onChange = () => {
      setRaw(location.hash)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return { path: parse(raw), raw }
}
