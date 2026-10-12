import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App.tsx'

const lenisOptions = {
  autoRaf: true,
  anchors: true,
  allowNestedScroll: true,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactLenis root options={lenisOptions}>
      <App />
    </ReactLenis>
  </StrictMode>,
)
