import { useState } from 'react'
import CandidateRegister from './pages/candidateRegister'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <CandidateRegister/>
      </>
  )
}

export default App
