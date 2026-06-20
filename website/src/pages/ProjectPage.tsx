import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
} from 'lucide-react'
import { api } from '../lib/api'
import { signAndSendLaunch } from '../lib/launch'
import { AllocationBuilder } from '../components/AllocationBuilder'
import { AllocationCard } from '../components/AllocationCard'
import type { Project } from '../lib/types'

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { publicKey, signTransaction } = useWallet()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const p = await api.getProject(id)
      setProject(p)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const handleRefresh = () => {
    setRefreshing(true)
    load()
  }

  const handleLaunch = async () => {
    if (!project || !publicKey || !signTransaction) {
      alert('Connect wallet to launch')
      return
    }
    setLaunching(true)
    try {
      const prepared = await api.prepareLaunch(project.id, publicKey.toBase58())
      const signature = await signAndSendLaunch(prepared, signTransaction)
      const updated = await api.confirmLaunch(project.id, prepared.mint, prepared.pumpFunUrl, signature)
      setProject(updated)
      alert(`Launched! View on pump.fun: ${prepared.pumpFunUrl}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  const wallet = publicKey?.toBase58()
  const isCreator = wallet === project?.creatorWallet

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-[#4ade80] animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-gray-500">Project not found</p>
        <Link to="/" className="mt-4 inline-block text-[#4ade80] hover:underline text-sm">
          ← Back to projects
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4ade80] mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        All Projects
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a2420] to-[#243028] border border-[#243028] text-lg font-bold text-[#4ade80]">
              ${project.symbol}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{project.description || 'No description'}</p>
              {project.mintAddress && (
                <p className="font-mono text-xs text-gray-600 mt-1">
                  {project.mintAddress.slice(0, 8)}...{project.mintAddress.slice(-8)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl border border-[#243028] p-2.5 text-gray-400 hover:text-white hover:border-[#4ade80]/30 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {project.pumpFunUrl && (
              <a
                href={project.pumpFunUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#4ade80]/30 bg-[#4ade80]/5 px-4 py-2.5 text-sm font-medium text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors"
              >
                pump.fun
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {!project.mintAddress && isCreator && (
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#0a0f0d] disabled:opacity-50"
              >
                <Rocket className="h-3.5 w-3.5" />
                {launching ? 'Launching...' : 'Launch'}
              </button>
            )}
          </div>
        </div>

        {project.mintAddress && isCreator && project.allocations.some((a) => !a.supplyLocked) && (
          <div className="mb-6 rounded-xl border border-[#4ade80]/20 bg-[#4ade80]/5 px-4 py-3 text-sm text-gray-300">
            Lock each allocation&apos;s supply via{' '}
            <a
              href="https://streamflow.finance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4ade80] hover:underline"
            >
              Streamflow
            </a>
            . Tokens leave your wallet and sit in on-chain escrow until milestones are met and the lock period ends.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Allocated', value: `${project.totalAllocated}%` },
            { label: 'Allocations', value: String(project.allocations.length) },
            {
              label: 'Supply Locked',
              value: String(project.allocations.filter((a) => a.supplyLocked).length),
            },
            {
              label: 'Milestones Met',
              value: String(
                project.allocations.filter((a) => a.status === 'unlocked' || a.status === 'claimed').length,
              ),
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[#243028] bg-[#111916] px-4 py-3 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Allocation builder */}
        {isCreator && (
          <div className="mb-6">
            <AllocationBuilder project={project} onUpdate={setProject} />
          </div>
        )}

        {/* Allocations list */}
        <h2 className="text-lg font-semibold text-white mb-4">Milestone Allocations</h2>
        {project.allocations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#243028] p-8 text-center text-gray-500 text-sm">
            No allocations yet.{' '}
            {isCreator ? 'Add your first milestone allocation above.' : 'The creator hasn\'t set up allocations yet.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {project.allocations.map((alloc) => (
              <AllocationCard
                key={alloc.id}
                allocation={alloc}
                project={project}
                wallet={wallet}
                isCreator={isCreator}
                onUpdate={setProject}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}