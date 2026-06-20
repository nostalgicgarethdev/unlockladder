import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Loader2,
  TrendingUp,
  Twitter,
  Users,
  Unlock,
  Trash2,
} from 'lucide-react'
import { api, criteriaLabel, criteriaProgress, formatMcap, formatNumber } from '../lib/api'
import { signAndSendTransaction } from '../lib/tx'
import type { Allocation, Project } from '../lib/types'

const statusConfig = {
  locked: { icon: Lock, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Locked' },
  unlocking: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Unlocking' },
  unlocked: { icon: Unlock, color: 'text-[#4ade80]', bg: 'bg-[#4ade80]/10', label: 'Unlocked' },
  claimed: { icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-500/10', label: 'Claimed' },
}

interface Props {
  allocation: Allocation
  project: Project
  wallet?: string
  isCreator?: boolean
  onUpdate: (project: Project) => void
}

export function AllocationCard({ allocation, project, wallet, isCreator, onUpdate }: Props) {
  const { signTransaction } = useWallet()
  const [busy, setBusy] = useState<'lock' | 'claim' | null>(null)
  const config = statusConfig[allocation.status]
  const StatusIcon = config.icon
  const progress = criteriaProgress(allocation.criteria)

  const handleLockSupply = async () => {
    if (!wallet || !signTransaction || !project.mintAddress) {
      alert('Connect wallet and launch token first')
      return
    }
    const daysStr = prompt(
      'Minimum on-chain lock period (days). Tokens stay in Streamflow escrow until this date AND milestones are met.\n\nDefault: 365 days',
      '365',
    )
    if (daysStr === null) return
    const lockPeriodDays = Math.max(1, Number(daysStr) || 365)

    setBusy('lock')
    try {
      const prepared = await api.prepareLock(project.id, allocation.id, wallet, lockPeriodDays)
      const signature = await signAndSendTransaction(prepared.serializedTx, signTransaction)
      const updated = await api.confirmLock(
        project.id,
        allocation.id,
        prepared.streamId,
        prepared.lockAmount,
        prepared.unlockAt,
        signature,
      )
      onUpdate(updated)
      alert(
        `${allocation.percentage}% supply locked on Streamflow.\n\nView: https://app.streamflow.finance/contract/solana/mainnet/${prepared.streamId}`,
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lock failed')
    } finally {
      setBusy(null)
    }
  }

  const handleClaim = async () => {
    if (!wallet || !signTransaction) return
    setBusy('claim')
    try {
      const prepared = await api.prepareClaim(project.id, allocation.id, wallet)
      const signature = await signAndSendTransaction(prepared.serializedTx, signTransaction)
      const result = await api.confirmClaim(project.id, allocation.id, wallet, signature)
      alert(result.claim.message)
      onUpdate(result)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remove this allocation?')) return
    try {
      const updated = await api.deleteAllocation(project.id, allocation.id)
      onUpdate(updated)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleImpressions = async () => {
    const val = prompt(
      'Enter current impression count:',
      String(
        allocation.criteria.type === 'social_impressions'
          ? allocation.criteria.currentImpressions ?? 0
          : 0,
      ),
    )
    if (!val) return
    try {
      const updated = await api.updateImpressions(project.id, allocation.id, Number(val))
      onUpdate(updated)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const unlockDate =
    allocation.unlockAt != null ? new Date(allocation.unlockAt * 1000).toLocaleDateString() : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#243028] bg-[#111916]/80 p-5 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2420] text-lg font-bold text-[#4ade80]">
            {allocation.percentage}%
          </div>
          <div>
            <h4 className="font-semibold text-white">{allocation.recipientName}</h4>
            <p className="font-mono text-xs text-gray-500 truncate max-w-[200px]">
              {allocation.recipientWallet.slice(0, 6)}...{allocation.recipientWallet.slice(-4)}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </div>
      </div>

      {allocation.supplyLocked ? (
        <div className="mt-3 rounded-lg border border-[#4ade80]/20 bg-[#4ade80]/5 px-3 py-2 text-xs text-[#4ade80]/90 space-y-1">
          <p className="font-medium">Supply locked on Streamflow</p>
          {unlockDate && <p className="text-gray-400">On-chain release after {unlockDate}</p>}
          {allocation.streamId && (
            <a
              href={`https://app.streamflow.finance/contract/solana/mainnet/${allocation.streamId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#4ade80] hover:underline"
            >
              View lock <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-amber-400/80 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          Supply not locked yet — creator must deposit {allocation.percentage}% into Streamflow escrow.
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 text-sm text-gray-400">
        <CriteriaIcon type={allocation.criteria.type} />
        <span>{criteriaLabel(allocation.criteria)}</span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Milestone progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#1a2420] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      <CriteriaDetails criteria={allocation.criteria} />

      <div className="mt-4 flex flex-wrap gap-2">
        {isCreator && project.mintAddress && !allocation.supplyLocked && allocation.status !== 'claimed' && (
          <button
            onClick={handleLockSupply}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a2420] border border-[#4ade80]/40 px-4 py-2 text-sm font-medium text-[#4ade80] hover:bg-[#4ade80]/10 disabled:opacity-50 transition-colors"
          >
            {busy === 'lock' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Lock {allocation.percentage}% Supply
          </button>
        )}
        {allocation.status === 'unlocked' &&
          allocation.supplyLocked &&
          wallet === allocation.recipientWallet && (
            <button
              onClick={handleClaim}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-[#0a0f0d] hover:bg-[#22c55e] disabled:opacity-50 transition-colors"
            >
              {busy === 'claim' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
              Withdraw from Lock
            </button>
          )}
        {allocation.criteria.type === 'social_impressions' && isCreator && (
          <button
            onClick={handleImpressions}
            className="rounded-lg border border-[#243028] px-3 py-2 text-xs text-gray-400 hover:text-white hover:border-[#4ade80]/30 transition-colors"
          >
            Update Impressions
          </button>
        )}
        {isCreator && allocation.status !== 'claimed' && !allocation.supplyLocked && (
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-900/30 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function CriteriaIcon({ type }: { type: string }) {
  const icons = {
    market_cap: TrendingUp,
    social_impressions: Twitter,
    holder_count: Users,
    volume_24h: TrendingUp,
  }
  const Icon = icons[type as keyof typeof icons] ?? TrendingUp
  return <Icon className="h-4 w-4 text-[#4ade80]/60 shrink-0 mt-0.5" />
}

function CriteriaDetails({ criteria }: { criteria: Allocation['criteria'] }) {
  if (criteria.type === 'market_cap') {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-[#1a2420] px-3 py-2">
          <span className="text-gray-500">Current MCap</span>
          <p className="font-mono text-white">{formatMcap(criteria.currentMcap ?? 0)}</p>
        </div>
        <div className="rounded-lg bg-[#1a2420] px-3 py-2">
          <span className="text-gray-500">Days Above Target</span>
          <p className="font-mono text-white">
            {criteria.daysAboveTarget ?? 0} / {criteria.durationDays}
          </p>
        </div>
      </div>
    )
  }
  if (criteria.type === 'social_impressions') {
    return (
      <div className="mt-3 rounded-lg bg-[#1a2420] px-3 py-2 text-xs">
        <span className="text-gray-500">Current Impressions</span>
        <p className="font-mono text-white">
          {formatNumber(criteria.currentImpressions ?? 0)} / {formatNumber(criteria.targetImpressions)}
        </p>
      </div>
    )
  }
  if (criteria.type === 'volume_24h') {
    return (
      <div className="mt-3 rounded-lg bg-[#1a2420] px-3 py-2 text-xs">
        <span className="text-gray-500">24h Volume</span>
        <p className="font-mono text-white">
          {formatMcap(criteria.currentVolume ?? 0)} / {formatMcap(criteria.targetVolume)}
        </p>
      </div>
    )
  }
  if (criteria.type === 'holder_count') {
    return (
      <div className="mt-3 rounded-lg bg-[#1a2420] px-3 py-2 text-xs">
        <span className="text-gray-500">Holders</span>
        <p className="font-mono text-white">
          {formatNumber(criteria.currentHolders ?? 0)} / {formatNumber(criteria.targetHolders)}
        </p>
      </div>
    )
  }
  return null
}