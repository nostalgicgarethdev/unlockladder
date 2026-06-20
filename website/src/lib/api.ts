import {
  addAllocation,
  claimAllocation,
  createProject,
  getAllProjects,
  getProject,
  removeAllocation,
  updateProject,
} from './store'
import { refreshAllocations } from './milestones'
import { prepareClientLaunch } from './pump'
import type { PreparedLaunch, Project, UnlockCriteria } from './types'

export const api = {
  async getProjects(): Promise<Project[]> {
    const projects = getAllProjects()
    return Promise.all(
      projects.map(async (p) => ({
        ...p,
        allocations: await refreshAllocations(p.mintAddress, p.allocations),
      })),
    )
  },

  async getProject(id: string): Promise<Project> {
    const project = getProject(id)
    if (!project) throw new Error('Project not found')
    const allocations = await refreshAllocations(project.mintAddress, project.allocations)
    const updated = updateProject(project.id, { allocations }) ?? { ...project, allocations }
    return updated
  },

  createProject(body: {
    name: string
    symbol: string
    description: string
    creatorWallet: string
    imageUrl?: string
    twitter?: string
  }): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      name: body.name,
      symbol: body.symbol.toUpperCase().slice(0, 10),
      description: body.description || '',
      creatorWallet: body.creatorWallet,
      imageUrl: body.imageUrl,
      twitter: body.twitter,
      allocations: [],
      totalAllocated: 0,
      createdAt: new Date().toISOString(),
    }
    return Promise.resolve(createProject(project))
  },

  async prepareLaunch(id: string, creatorPubkey: string, devBuySol?: number): Promise<PreparedLaunch> {
    const project = getProject(id)
    if (!project) throw new Error('Project not found')
    if (project.mintAddress) throw new Error('Already launched')

    return prepareClientLaunch({
      name: project.name,
      symbol: project.symbol,
      description: project.description,
      creatorPubkey,
      devBuySol,
      imageUrl: project.imageUrl,
      twitter: project.twitter,
      telegram: project.telegram,
      website: project.website,
    })
  },

  confirmLaunch(id: string, mint: string, pumpFunUrl: string, _signature: string): Promise<Project> {
    const updated = updateProject(id, {
      mintAddress: mint,
      pumpFunUrl,
      launchedAt: new Date().toISOString(),
    })
    if (!updated) throw new Error('Project not found')
    return Promise.resolve(updated)
  },

  addAllocation(
    id: string,
    body: {
      recipientName: string
      recipientWallet: string
      percentage: number
      criteria: UnlockCriteria
    },
  ): Promise<Project> {
    return Promise.resolve(addAllocation(id, body))
  },

  deleteAllocation(projectId: string, allocId: string): Promise<Project> {
    return Promise.resolve(removeAllocation(projectId, allocId))
  },

  async updateImpressions(projectId: string, allocId: string, impressions: number): Promise<Project> {
    const project = getProject(projectId)
    if (!project) throw new Error('Project not found')

    const allocations = project.allocations.map((a) => {
      if (a.id !== allocId) return a
      if (a.criteria.type !== 'social_impressions') return a
      return { ...a, criteria: { ...a.criteria, currentImpressions: impressions } }
    })

    const refreshed = await refreshAllocations(project.mintAddress, allocations)
    const updated = updateProject(projectId, { allocations: refreshed })
    if (!updated) throw new Error('Project not found')
    return updated
  },

  claimAllocation(projectId: string, allocId: string, wallet: string) {
    return Promise.resolve(claimAllocation(projectId, allocId, wallet))
  },
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