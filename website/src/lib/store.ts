import type { Allocation, Project, UnlockCriteria } from './types'

const STORAGE_KEY = 'unlockladder_projects'

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDemo()
    return JSON.parse(raw) as Project[]
  } catch {
    return seedDemo()
  }
}

function save(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

function seedDemo(): Project[] {
  const demo: Project = {
    id: 'demo-unlockladder',
    name: 'Unlockladder Demo',
    symbol: 'LADDER',
    description: 'Demo token showing milestone-based unlocks on pump.fun',
    mintAddress: 'DWP8uLwh4Dx2toehZchiT4WUzqGRDJarrwpVw9uspump',
    pumpFunUrl: 'https://pump.fun/coin/DWP8uLwh4Dx2toehZchiT4WUzqGRDJarrwpVw9uspump',
    creatorWallet: 'DemoCreator1111111111111111111111111111111',
    allocations: [
      {
        id: 'alloc-1',
        recipientName: '@ansem',
        recipientWallet: 'AnsemWallet111111111111111111111111111111',
        percentage: 1,
        criteria: {
          type: 'market_cap',
          targetMcap: 100_000_000,
          durationDays: 7,
          currentMcap: 0,
          daysAboveTarget: 0,
        },
        status: 'locked',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alloc-2',
        recipientName: '@kol_marketer',
        recipientWallet: 'KOLWallet1111111111111111111111111111111',
        percentage: 1,
        criteria: {
          type: 'social_impressions',
          targetImpressions: 1_000_000,
          twitterHandle: '@kol_marketer',
          currentImpressions: 342_000,
        },
        status: 'unlocking',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alloc-3',
        recipientName: 'Community Lead',
        recipientWallet: 'CommWallet111111111111111111111111111111',
        percentage: 0.5,
        criteria: {
          type: 'volume_24h',
          targetVolume: 500_000,
          currentVolume: 0,
        },
        status: 'locked',
        createdAt: new Date().toISOString(),
      },
    ],
    totalAllocated: 2.5,
    createdAt: new Date().toISOString(),
    launchedAt: new Date().toISOString(),
  }
  save([demo])
  return [demo]
}

export function getAllProjects(): Project[] {
  return load()
}

export function getProject(id: string): Project | undefined {
  return load().find((p) => p.id === id)
}

export function createProject(project: Project): Project {
  const projects = load()
  projects.unshift(project)
  save(projects)
  return project
}

export function updateProject(id: string, updates: Partial<Project>): Project | undefined {
  const projects = load()
  const idx = projects.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  projects[idx] = { ...projects[idx], ...updates }
  save(projects)
  return projects[idx]
}

export function deleteProject(id: string): boolean {
  const projects = load()
  const filtered = projects.filter((p) => p.id !== id)
  if (filtered.length === projects.length) return false
  save(filtered)
  return true
}

export function addAllocation(
  projectId: string,
  body: {
    recipientName: string
    recipientWallet: string
    percentage: number
    criteria: UnlockCriteria
  },
): Project {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found')

  const newTotal = project.totalAllocated + body.percentage
  if (newTotal > 100) {
    throw new Error(`Total allocation would exceed 100% (currently ${project.totalAllocated}%)`)
  }

  const allocation: Allocation = {
    id: crypto.randomUUID(),
    recipientName: body.recipientName,
    recipientWallet: body.recipientWallet,
    percentage: body.percentage,
    criteria: body.criteria,
    status: 'locked',
    createdAt: new Date().toISOString(),
  }

  return updateProject(projectId, {
    allocations: [...project.allocations, allocation],
    totalAllocated: newTotal,
  })!
}

export function removeAllocation(projectId: string, allocId: string): Project {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found')

  const alloc = project.allocations.find((a) => a.id === allocId)
  if (!alloc) throw new Error('Allocation not found')
  if (alloc.status === 'claimed') throw new Error('Cannot delete claimed allocation')

  return updateProject(projectId, {
    allocations: project.allocations.filter((a) => a.id !== allocId),
    totalAllocated: project.totalAllocated - alloc.percentage,
  })!
}

export function claimAllocation(
  projectId: string,
  allocId: string,
  wallet: string,
): Project & { claim: { message: string } } {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found')

  const alloc = project.allocations.find((a) => a.id === allocId)
  if (!alloc) throw new Error('Allocation not found')
  if (alloc.status !== 'unlocked') throw new Error('Allocation not yet unlocked')
  if (alloc.recipientWallet !== wallet) throw new Error('Only the recipient wallet can claim')

  const allocations = project.allocations.map((a) =>
    a.id === allocId
      ? { ...a, status: 'claimed' as const, claimedAt: new Date().toISOString() }
      : a,
  )
  const updated = updateProject(projectId, { allocations })!

  return {
    ...updated,
    claim: {
      message: `${alloc.percentage}% of ${project.symbol} allocation marked as claimed. Transfer tokens from your treasury wallet.`,
    },
  }
}