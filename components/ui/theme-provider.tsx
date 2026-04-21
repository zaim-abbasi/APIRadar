"use client"

import * as React from "react"

interface ThemeProviderContextType {
  theme: string | undefined
  setTheme: (theme: string) => void
}

const ThemeContext = React.createContext<ThemeProviderContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<string>("light")

  return (
    <ThemeContext.Provider value={{ theme, setTheme: (t) => setTheme(t) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    return { theme: "light", setTheme: () => {} }
  }
  return context
}