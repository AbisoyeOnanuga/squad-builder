import { isConfigured } from '../lib/config'

export function ConfigBanner() {
  if (isConfigured) return null
  return (
    <p className="config-banner" role="status">
      Local preview on this browser. Add <code>VITE_APPWRITE_ENDPOINT</code> and <code>VITE_APPWRITE_PROJECT_ID</code> to share the board.
    </p>
  )
}
