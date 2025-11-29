import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const raw = localStorage.getItem('profile_display')
      if (raw) {
        const d = JSON.parse(raw)
        const t = (d.theme || 'Dark').toString().toLowerCase()
        // map removed 'slate' theme to 'dark' to avoid unknown theme value
        return t === 'slate' ? 'dark' : t
      }
    } catch (e) { /* ignore */ }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  })

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      // also set Bootstrap theme attribute for components that respect it
      document.documentElement.setAttribute('data-bs-theme', theme)
    } catch (e) { /* ignore */ }

    try {
      const raw = localStorage.getItem('profile_display')
      const obj = raw ? JSON.parse(raw) : {}
      obj.theme = theme.charAt(0).toUpperCase() + theme.slice(1)
      localStorage.setItem('profile_display', JSON.stringify(obj))
    } catch (e) { /* ignore */ }

    try { window.dispatchEvent(new CustomEvent('digiman:themeChanged', { detail: { theme } })) } catch (e) { }
  }, [theme])

  // Listen for external theme changes (for example from Settings component)
  useEffect(() => {
    function onExternalTheme(e){
      try{
        const t = (e && e.detail && e.detail.theme) || null
        if (t){
          const low = t.toString().toLowerCase()
          setTheme(low === 'slate' ? 'dark' : low)
        }
      }catch(_){ }
    }
    window.addEventListener('digiman:themeChanged', onExternalTheme)
    // Also listen to storage events in case another tab updated localStorage
    function onStorage(e){
      try{
        if (e.key === 'profile_display' && e.newValue){
          const d = JSON.parse(e.newValue)
          if (d.theme){
            const low = d.theme.toString().toLowerCase()
            setTheme(low === 'slate' ? 'dark' : low)
          }
        }
      }catch(_){ }
    }
    window.addEventListener('storage', onStorage)
    return ()=>{ window.removeEventListener('digiman:themeChanged', onExternalTheme); window.removeEventListener('storage', onStorage) }
  }, [])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(){
  return useContext(ThemeContext)
}

export default ThemeContext
