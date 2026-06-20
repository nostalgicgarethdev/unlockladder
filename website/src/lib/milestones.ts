import type {
  Allocation,
  MarketCapCriteria,
  SocialImpressionsCriteria,
  UnlockCriteria,
} from './types'

interface DexPair {
  marketCap?: number
  volume?: { h24?: number }
}

interface DexResponse {
  pairs?: DexPair[]
}

export async function fetchTokenStats(mintAddress: string): Promise<{
  marketCap: number
  volume24h: number
  holderCount: number
}> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`)
    if (!res.ok) return { marketCap: 0, volume24h: 0, holderCount: 0 }
    const data = (await res.json()) as DexResponse
    const pair = data.pairs?.[0]
    return {
      marketCap: pair?.marketCap ?? 0,
      volume24h: pair?.volume?.h24 ?? 0,
      holderCount: 0,
    }
  } catch {
    return { marketCap: 0, volume24h: 0, holderCount: 0 }
  }
}

function evaluateCriteria(
  criteria: UnlockCriteria,
  stats: { marketCap: number; volume24h: number; holderCount: number },
  previous?: UnlockCriteria,
): { criteria: UnlockCriteria; status: Allocation['status'] } {
  if (criteria.type === 'market_cap') {
    const prev = previous as MarketCapCriteria | undefined
    const currentMcap = stats.marketCap
    const prevAboveSince = (prev as MarketCapCriteria & { mcapAboveSince?: string })?.mcapAboveSince

    let mcapAboveSince: string | undefined = prevAboveSince
    let daysAbove = prev?.daysAboveTarget ?? 0

    if (currentMcap >= criteria.targetMcap) {
      if (!mcapAboveSince) {
        mcapAboveSince = new Date().toISOString()
        daysAbove = 0
      } else {
        const elapsed = Date.now() - new Date(mcapAboveSince).getTime()
        daysAbove = Math.floor(elapsed / (1000 * 60 * 60 * 24))
      }
    } else {
      mcapAboveSince = undefined
      daysAbove = 0
    }

    const updated = {
      ...criteria,
      currentMcap,
      daysAboveTarget: daysAbove,
      mcapAboveSince,
    } as MarketCapCriteria & { mcapAboveSince?: string }

    if (daysAbove >= criteria.durationDays) return { criteria: updated, status: 'unlocked' }
    if (daysAbove > 0 || currentMcap >= criteria.targetMcap) return { criteria: updated, status: 'unlocking' }
    return { criteria: updated, status: 'locked' }
  }

  if (criteria.type === 'social_impressions') {
    const current = criteria.currentImpressions ?? 0
    const updated: SocialImpressionsCriteria = { ...criteria, currentImpressions: current }
    if (current >= criteria.targetImpressions) return { criteria: updated, status: 'unlocked' }
    if (current >= criteria.targetImpressions * 0.5) return { criteria: updated, status: 'unlocking' }
    return { criteria: updated, status: 'locked' }
  }

  if (criteria.type === 'holder_count') {
    const current = stats.holderCount
    const updated = { ...criteria, currentHolders: current }
    if (current >= criteria.targetHolders) return { criteria: updated, status: 'unlocked' }
    if (current >= criteria.targetHolders * 0.5) return { criteria: updated, status: 'unlocking' }
    return { criteria: updated, status: 'locked' }
  }

  if (criteria.type === 'volume_24h') {
    const current = stats.volume24h
    const updated = { ...criteria, currentVolume: current }
    if (current >= criteria.targetVolume) return { criteria: updated, status: 'unlocked' }
    if (current >= criteria.targetVolume * 0.5) return { criteria: updated, status: 'unlocking' }
    return { criteria: updated, status: 'locked' }
  }

  return { criteria, status: 'locked' }
}

export async function refreshAllocations(
  mintAddress: string | undefined,
  allocations: Allocation[],
): Promise<Allocation[]> {
  let stats = { marketCap: 0, volume24h: 0, holderCount: 0 }
  if (mintAddress) stats = await fetchTokenStats(mintAddress)

  return allocations.map((alloc) => {
    if (alloc.status === 'claimed') return alloc
    const { criteria, status } = evaluateCriteria(alloc.criteria, stats, alloc.criteria)
    const unlockedAt =
      status === 'unlocked' && alloc.status !== 'unlocked'
        ? new Date().toISOString()
        : alloc.unlockedAt
    return { ...alloc, criteria, status, unlockedAt }
  })
}