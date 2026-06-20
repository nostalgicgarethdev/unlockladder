export type CriteriaType = 'market_cap' | 'social_impressions' | 'holder_count' | 'volume_24h'

export interface MarketCapCriteria {
  type: 'market_cap'
  targetMcap: number
  durationDays: number
  currentMcap?: number
  daysAboveTarget?: number
}

export interface SocialImpressionsCriteria {
  type: 'social_impressions'
  targetImpressions: number
  twitterHandle: string
  currentImpressions?: number
}

export interface HolderCountCriteria {
  type: 'holder_count'
  targetHolders: number
  currentHolders?: number
}

export interface VolumeCriteria {
  type: 'volume_24h'
  targetVolume: number
  currentVolume?: number
}

export type UnlockCriteria =
  | MarketCapCriteria
  | SocialImpressionsCriteria
  | HolderCountCriteria
  | VolumeCriteria

export type AllocationStatus = 'locked' | 'unlocking' | 'unlocked' | 'claimed'

export interface Allocation {
  id: string
  recipientName: string
  recipientWallet: string
  percentage: number
  criteria: UnlockCriteria
  status: AllocationStatus
  unlockedAt?: string
  claimedAt?: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  symbol: string
  description: string
  mintAddress?: string
  pumpFunUrl?: string
  creatorWallet: string
  imageUrl?: string
  twitter?: string
  telegram?: string
  website?: string
  allocations: Allocation[]
  totalAllocated: number
  createdAt: string
  launchedAt?: string
}

export interface PreparedLaunch {
  mint: string
  serializedTx: string
  pumpFunUrl: string
}