// DS CSS imported as raw string to bypass PostCSS/Tailwind — they are incompatible
// (Tailwind v3 cannot parse @uxuissk/design-system's @layer syntax)
import dsStyles from '@uxuissk/design-system/styles.css?raw'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const dsStyleEl = document.createElement('style')
dsStyleEl.textContent = dsStyles
document.head.prepend(dsStyleEl)
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
