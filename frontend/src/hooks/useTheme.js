import { useEffect, useState } from 'react'

const KEY = 'urbanshield_theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(KEY)
    return saved === 'dark' || saved === 'light' ? saved : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem(KEY, theme)
  }, [theme])

  return { theme, setTheme }
}

