import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import './styles/global.css'
import { applyAppearance, readAppearance } from './features/settings/appearance'

// Apply stored preferences before mounting any visible application content.
applyAppearance(
  readAppearance().preferences,
  window.matchMedia('(prefers-color-scheme: dark)').matches,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
