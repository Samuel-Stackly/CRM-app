/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public by design — inlined into the bundle. Never put a secret behind VITE_. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
