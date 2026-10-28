import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api'

export default function App() {
  const [status, setStatus] = useState('checking…')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { status: string }) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>App 2</h1>
      <p>API: {status}</p>
    </main>
  )
}
