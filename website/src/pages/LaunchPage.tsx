import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { Rocket, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { signAndSendLaunch } from '../lib/launch'

export function LaunchPage() {
  const navigate = useNavigate()
  const { publicKey, signTransaction, connected } = useWallet()
  const [step, setStep] = useState<'form' | 'allocations' | 'launching'>('form')
  const [loading, setLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    devBuySol: 0,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected || !publicKey) {
      alert('Connect your wallet first')
      return
    }
    setLoading(true)
    try {
      const project = await api.createProject({
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        creatorWallet: publicKey.toBase58(),
        twitter: form.twitter || undefined,
      })
      setProjectId(project.id)
      setStep('allocations')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const handleLaunch = async () => {
    if (!projectId || !publicKey || !signTransaction) return
    setStep('launching')
    setLoading(true)
    try {
      const prepared = await api.prepareLaunch(
        projectId,
        publicKey.toBase58(),
        form.devBuySol || undefined,
      )
      const signature = await signAndSendLaunch(prepared, signTransaction)
      await api.confirmLaunch(projectId, prepared.mint, prepared.pumpFunUrl, signature)
      navigate(`/project/${projectId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Launch failed')
      setStep('allocations')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipToProject = () => {
    if (projectId) navigate(`/project/${projectId}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4ade80] to-[#22c55e]">
            <Rocket className="h-6 w-6 text-[#0a0f0d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Launch on pump.fun</h1>
            <p className="text-sm text-gray-500">Create token + set up milestone allocations</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Token Details', 'Ready to Launch', 'Launching'].map((label, i) => {
            const stepIdx = step === 'form' ? 0 : step === 'allocations' ? 1 : 2
            const active = i <= stepIdx
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${active ? 'bg-[#4ade80]' : 'bg-[#1a2420]'}`} />
              </div>
            )
          })}
        </div>

        {step === 'form' && (
          <form onSubmit={handleCreate} className="space-y-5 rounded-2xl border border-[#243028] bg-[#111916] p-6">
            <Field label="Token Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="My Token" required />
            <Field label="Ticker Symbol" value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v.toUpperCase() })} placeholder="TICKER" required maxLength={10} />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="What is this token about?"
                className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#4ade80]/50 focus:outline-none resize-none"
              />
            </div>
            <Field label="Twitter (optional)" value={form.twitter} onChange={(v) => setForm({ ...form, twitter: v })} placeholder="https://x.com/yourproject" />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dev Buy (SOL, optional)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.devBuySol}
                onChange={(e) => setForm({ ...form, devBuySol: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
              />
            </div>

            {!connected && (
              <p className="text-sm text-amber-400/80 rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                Connect your Solana wallet to launch on pump.fun
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !connected}
              className="w-full rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22c55e] py-3.5 text-sm font-semibold text-[#0a0f0d] hover:shadow-lg hover:shadow-[#4ade80]/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating...' : 'Continue →'}
            </button>
          </form>
        )}

        {step === 'allocations' && (
          <div className="rounded-2xl border border-[#243028] bg-[#111916] p-6 space-y-5">
            <p className="text-gray-400 text-sm leading-relaxed">
              Your project <strong className="text-white">${form.symbol}</strong> is ready.
              You can add milestone allocations after launch, or launch now and configure later.
            </p>
            <div className="rounded-xl bg-[#0a0f0d] border border-[#243028] p-4 text-xs text-gray-500 space-y-1">
              <p>• 1% to KOL when token hits $100M for 7 days</p>
              <p>• 1% to marketer at 1M social impressions</p>
              <p>• 0.5% to community lead at $500K daily volume</p>
            </div>
            <button
              onClick={handleLaunch}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22c55e] py-3.5 text-sm font-semibold text-[#0a0f0d] disabled:opacity-50 transition-all"
            >
              Launch on pump.fun
            </button>
            <button
              onClick={handleSkipToProject}
              className="w-full rounded-xl border border-[#243028] py-3 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip launch — configure allocations first
            </button>
          </div>
        )}

        {step === 'launching' && (
          <div className="rounded-2xl border border-[#243028] bg-[#111916] p-12 text-center">
            <Loader2 className="h-10 w-10 text-[#4ade80] animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white">Launching on pump.fun...</h3>
            <p className="text-sm text-gray-500 mt-2">Approve the transaction in your wallet</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  maxLength?: number
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#4ade80]/50 focus:outline-none"
      />
    </div>
  )
}