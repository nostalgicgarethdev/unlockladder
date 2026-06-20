import type { PreparedLaunch, Project, UnlockCriteria } from './types'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data as T
}

export const api = {
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (body: {
    name: string
    symbol: string
    description: string
    creatorWallet: string
    imageUrl?: string
    twitter?: string
  }) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  prepareLaunch: (id: string, creatorPubkey: string, devBuySol?: number) =>
    request<PreparedLaunch>(`/projects/${id}/launch`, {
      method: 'POST',
      body: JSON.stringify({ creatorPubkey, devBuySol }),
    }),
  confirmLaunch: (id: string, mint: string, pumpFunUrl: string, signature: string) =>
    request<Project>(`/projects/${id}/confirm-launch`, {
      method: 'POST',
      body: JSON.stringify({ mint, pumpFunUrl, signature }),
    }),
  sendTransaction: (transaction: string) =>
    request<{ signature: string }>('/send-transaction', {
      method: 'POST',
      body: JSON.stringify({ transaction }),
    }),
  addAllocation: (
    id: string,
    body: {
      recipientName: string
      recipientWallet: string
      percentage: number
      criteria: UnlockCriteria
    },
  ) =>
    request<Project>(`/projects/${id}/allocations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteAllocation: (projectId: string, allocId: string) =>
    request<Project>(`/projects/${projectId}/allocations/${allocId}`, { method: 'DELETE' }),
  updateImpressions: (projectId: string, allocId: string, impressions: number) =>
    request<Project>(`/projects/${projectId}/allocations/${allocId}/impressions`, {
      method: 'PATCH',
      body: JSON.stringify({ impressions }),
    }),
  claimAllocation: (projectId: string, allocId: string, wallet: string) =>
    request<Project & { claim: { message: string } }>(
      `/projects/${projectId}/allocations/${allocId}/claim`,
      { method: 'POST', body: JSON.stringify({ wallet }) },
    ),
}

export function formatMcap(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export function criteriaLabel(criteria: UnlockCriteria): string {
  switch (criteria.type) {
    case 'market_cap':
      return `Hit ${formatMcap(criteria.targetMcap)} mcap for ${criteria.durationDays} days`
    case 'social_impressions':
      return `${formatNumber(criteria.targetImpressions)} impressions on ${criteria.twitterHandle}`
    case 'holder_count':
      return `Reach ${formatNumber(criteria.targetHolders)} holders`
    case 'volume_24h':
      return `${formatMcap(criteria.targetVolume)} 24h volume`
  }
}

export function criteriaProgress(criteria: UnlockCriteria): number {
  switch (criteria.type) {
    case 'market_cap': {
      const mcapPct = Math.min(100, ((criteria.currentMcap ?? 0) / criteria.targetMcap) * 100)
      const dayPct = Math.min(100, ((criteria.daysAboveTarget ?? 0) / criteria.durationDays) * 100)
      return (mcapPct + dayPct) / 2
    }
    case 'social_impressions':
      return Math.min(100, ((criteria.currentImpressions ?? 0) / criteria.targetImpressions) * 100)
    case 'holder_count':
      return Math.min(100, ((criteria.currentHolders ?? 0) / criteria.targetHolders) * 100)
    case 'volume_24h':
      return Math.min(100, ((criteria.currentVolume ?? 0) / criteria.targetVolume) * 100)
  }
}