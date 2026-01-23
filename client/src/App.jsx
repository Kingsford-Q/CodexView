import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Homepage from './Homepage.jsx'

const App = () => {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element = {<Homepage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
