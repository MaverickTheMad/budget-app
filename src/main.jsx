import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { applyTheme, cachedTheme } from './lib/core.js'
import './styles/index.css'

// Paint the cached theme before React mounts so there's no light-flash while
// whoami/loadTheme resolves the stored preference.
applyTheme(cachedTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
