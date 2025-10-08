import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <div className="container">
        <h1>AI Contracts System</h1>
        <p className="subtitle">AI Coder Agent Contract System</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            Count is {count}
          </button>
        </div>
        <p className="info">
          Frontend is running with Vite + React + TypeScript
        </p>
      </div>
    </div>
  )
}

export default App
