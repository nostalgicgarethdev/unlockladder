import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { api } from '../lib/api'
import type { CriteriaType, Project, UnlockCriteria } from '../lib/types'

interface Props {
  project: Project
  onUpdate: (project: Project) => void
}

export function AllocationBuilder({ project, onUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    recipientName: '',
    recipientWallet: '',
    percentage: 1,
    criteriaType: 'market_cap' as CriteriaType,
    targetMcap: 100_000_000,
    durationDays: 7,
    targetImpressions: 1_000_000,
    twitterHandle: '',
    targetHolders: 1000,
    targetVolume: 500_000,
  })

  const remaining = 100 - project.totalAllocated

  const buildCriteria = (): UnlockCriteria => {
    switch (form.criteriaType) {
      case 'market_cap':
        return { type: 'market_cap', targetMcap: form.targetMcap, durationDays: form.durationDays }
      case 'social_impressions':
        return {
          type: 'social_impressions',
          targetImpressions: form.targetImpressions,
          twitterHandle: form.twitterHandle.startsWith('@') ? form.twitterHandle : `@${form.twitterHandle}`,
        }
      case 'holder_count':
        return { type: 'holder_count', targetHolders: form.targetHolders }
      case 'volume_24h':
        return { type: 'volume_24h', targetVolume: form.targetVolume }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.percentage > remaining) {
      alert(`Only ${remaining}% remaining to allocate`)
      return
    }
    setLoading(true)
    try {
      const updated = await api.addAllocation(project.id, {
        recipientName: form.recipientName,
        recipientWallet: form.recipientWallet,
        percentage: form.percentage,
        criteria: buildCriteria(),
      })
      onUpdate(updated)
      setOpen(false)
      setForm((f) => ({ ...f, recipientName: '', recipientWallet: '', twitterHandle: '' }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add allocation')
    } finally {
      setLoading(false)
    }
  }

  if (remaining <= 0) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
        100% of supply allocated. Remove an allocation to add more.
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#4ade80]/30 bg-[#4ade80]/5 py-4 text-sm font-medium text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Milestone Allocation ({remaining}% remaining)
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#243028] bg-[#111916] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#4ade80]">
            <Target className="h-4 w-4" />
            <h3 className="font-semibold">New Allocation</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recipient Name" value={form.recipientName} onChange={(v) => setForm({ ...form, recipientName: v })} placeholder="@username or name" required />
            <Field label="Wallet Address" value={form.recipientWallet} onChange={(v) => setForm({ ...form, recipientWallet: v })} placeholder="Solana wallet" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Allocation %</label>
              <input
                type="number"
                min={0.1}
                max={remaining}
                step={0.1}
                value={form.percentage}
                onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unlock Criteria</label>
              <select
                value={form.criteriaType}
                onChange={(e) => setForm({ ...form, criteriaType: e.target.value as CriteriaType })}
                className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
              >
                <option value="market_cap">Market Cap Milestone</option>
                <option value="social_impressions">Social Impressions</option>
                <option value="holder_count">Holder Count</option>
                <option value="volume_24h">24h Volume</option>
              </select>
            </div>
          </div>

          {form.criteriaType === 'market_cap' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Target Market Cap ($)</label>
                <input
                  type="number"
                  value={form.targetMcap}
                  onChange={(e) => setForm({ ...form, targetMcap: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Must Stay For (days)</label>
                <input
                  type="number"
                  min={1}
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {form.criteriaType === 'social_impressions' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Twitter Handle" value={form.twitterHandle} onChange={(v) => setForm({ ...form, twitterHandle: v })} placeholder="@username" required />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Target Impressions</label>
                <input
                  type="number"
                  value={form.targetImpressions}
                  onChange={(e) => setForm({ ...form, targetImpressions: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {form.criteriaType === 'holder_count' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Target Holders</label>
              <input
                type="number"
                value={form.targetHolders}
                onChange={(e) => setForm({ ...form, targetHolders: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
              />
            </div>
          )}

          {form.criteriaType === 'volume_24h' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Target 24h Volume ($)</label>
              <input
                type="number"
                value={form.targetVolume}
                onChange={(e) => setForm({ ...form, targetVolume: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white focus:border-[#4ade80]/50 focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#4ade80] px-6 py-2.5 text-sm font-semibold text-[#0a0f0d] hover:bg-[#22c55e] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Allocation'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[#243028] px-6 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-[#243028] bg-[#0a0f0d] px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#4ade80]/50 focus:outline-none"
      />
    </div>
  )
}