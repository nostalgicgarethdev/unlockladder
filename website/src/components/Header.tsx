import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Layers, Rocket } from 'lucide-react'

export function Header() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 border-b border-[#243028]/60 bg-[#0a0f0d]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg shadow-[#4ade80]/20">
            <Layers className="h-5 w-5 text-[#0a0f0d]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#4ade80] transition-colors">
              Unlockladder
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-[#4ade80]/60 font-mono">
              pump.fun allocations
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/'
                ? 'text-[#4ade80] bg-[#4ade80]/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Projects
          </Link>
          <Link
            to="/launch"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/launch'
                ? 'text-[#4ade80] bg-[#4ade80]/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Rocket className="h-3.5 w-3.5" />
            Launch
          </Link>
          <div className="ml-2">
            <WalletMultiButton />
          </div>
        </nav>
      </div>
    </header>
  )
}