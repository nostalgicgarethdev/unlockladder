import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { PUMP_FUN_URL, TOKEN_CA } from '../lib/config'

interface Props {
  variant?: 'hero' | 'compact'
}

export function TokenCA({ variant = 'hero' }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(TOKEN_CA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={copy}
        className="hidden md:flex items-center gap-2 rounded-lg border border-[#243028] bg-[#111916]/80 px-3 py-1.5 text-xs font-mono text-gray-400 hover:border-[#4ade80]/30 hover:text-[#4ade80] transition-colors"
        title="Copy contract address"
      >
        <span className="text-[#4ade80]/70">CA</span>
        <span>{TOKEN_CA.slice(0, 4)}...{TOKEN_CA.slice(-4)}</span>
        {copied ? <Check className="h-3 w-3 text-[#4ade80]" /> : <Copy className="h-3 w-3" />}
      </button>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <div className="rounded-2xl border border-[#4ade80]/20 bg-[#111916]/80 p-4 backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-widest text-[#4ade80]/60 font-mono mb-2">
          Contract Address
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <code className="flex-1 rounded-xl bg-[#0a0f0d] border border-[#243028] px-4 py-2.5 text-sm font-mono text-[#4ade80] break-all text-left">
            {TOKEN_CA}
          </code>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={copy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 px-4 py-2.5 text-sm font-medium text-[#4ade80] hover:bg-[#4ade80]/20 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={PUMP_FUN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#0a0f0d] hover:opacity-90 transition-opacity"
            >
              pump.fun
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}