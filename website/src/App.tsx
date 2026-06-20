import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { LaunchPage } from './pages/LaunchPage'
import { ProjectPage } from './pages/ProjectPage'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0f0d]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#4ade80]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-[#22c55e]/5 blur-[100px]" />
      </div>
      <Header />
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/project/:id" element={<ProjectPage />} />
        </Routes>
      </main>
    </div>
  )
}