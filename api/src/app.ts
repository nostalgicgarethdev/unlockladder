import { Connection } from '@solana/web3.js'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prepareClientLaunch } from './pump.js'
import { SOLANA_RPC } from './rpc.js'
import { refreshAllocations } from './milestones.js'
import {
  createProject,
  deleteProject,
  getAllProjects,
  getProject,
  updateProject,
} from './store.js'
import type { Allocation, Project, UnlockCriteria } from './types.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://nostalgicgarethdev.github.io',
]

export const app = new Hono()

app.use(
  '/*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0]
      if (allowedOrigins.some((o) => origin === o || origin.startsWith(o))) return origin
      if (origin.includes('github.io')) return origin
      return allowedOrigins[0]
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.get('/api/health', (c) => c.json({ ok: true, service: 'unlockladder' }))

app.get('/api/projects', async (c) => {
  const projects = getAllProjects()
  const refreshed = await Promise.all(
    projects.map(async (p) => ({
      ...p,
      allocations: await refreshAllocations(p.mintAddress, p.allocations),
    })),
  )
  return c.json(refreshed)
})

app.get('/api/projects/:id', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)
  const allocations = await refreshAllocations(project.mintAddress, project.allocations)
  const updated = updateProject(project.id, { allocations }) ?? { ...project, allocations }
  return c.json(updated)
})

app.post('/api/projects', async (c) => {
  const body = await c.req.json<{
    name: string
    symbol: string
    description: string
    creatorWallet: string
    imageUrl?: string
    twitter?: string
  }>()

  if (!body.name || !body.symbol || !body.creatorWallet) {
    return c.json({ error: 'name, symbol, and creatorWallet are required' }, 400)
  }

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

  createProject(project)
  return c.json(project, 201)
})

app.post('/api/projects/:id/launch', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)
  if (project.mintAddress) return c.json({ error: 'Already launched' }, 400)

  const body = await c.req.json<{ creatorPubkey: string; devBuySol?: number }>()
  if (!body.creatorPubkey) return c.json({ error: 'creatorPubkey required' }, 400)

  try {
    const prepared = await prepareClientLaunch({
      name: project.name,
      symbol: project.symbol,
      description: project.description,
      creatorPubkey: body.creatorPubkey,
      devBuySol: body.devBuySol ?? 0,
      imageUrl: project.imageUrl,
      twitter: project.twitter,
      telegram: project.telegram,
      website: project.website,
    })
    return c.json(prepared)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Launch preparation failed'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/send-transaction', async (c) => {
  const body = await c.req.json<{ transaction: string }>()
  if (!body.transaction) return c.json({ error: 'transaction required' }, 400)

  try {
    const txBytes = Buffer.from(body.transaction, 'base64')
    const connection = new Connection(SOLANA_RPC, 'confirmed')
    const signature = await connection.sendRawTransaction(txBytes, { skipPreflight: false })
    await connection.confirmTransaction(signature, 'confirmed').catch(() => {})
    return c.json({ signature })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transaction failed'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/projects/:id/confirm-launch', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const body = await c.req.json<{ mint: string; pumpFunUrl: string; signature: string }>()
  const updated = updateProject(project.id, {
    mintAddress: body.mint,
    pumpFunUrl: body.pumpFunUrl,
    launchedAt: new Date().toISOString(),
  })
  return c.json(updated)
})

app.post('/api/projects/:id/allocations', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const body = await c.req.json<{
    recipientName: string
    recipientWallet: string
    percentage: number
    criteria: UnlockCriteria
  }>()

  if (!body.recipientName || !body.recipientWallet || !body.percentage || !body.criteria) {
    return c.json({ error: 'Missing required allocation fields' }, 400)
  }

  const newTotal = project.totalAllocated + body.percentage
  if (newTotal > 100) {
    return c.json({ error: `Total allocation would exceed 100% (currently ${project.totalAllocated}%)` }, 400)
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

  const allocations = [...project.allocations, allocation]
  const updated = updateProject(project.id, {
    allocations,
    totalAllocated: newTotal,
  })
  return c.json(updated, 201)
})

app.delete('/api/projects/:id/allocations/:allocId', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const alloc = project.allocations.find((a) => a.id === c.req.param('allocId'))
  if (!alloc) return c.json({ error: 'Allocation not found' }, 404)
  if (alloc.status === 'claimed') return c.json({ error: 'Cannot delete claimed allocation' }, 400)

  const allocations = project.allocations.filter((a) => a.id !== alloc.id)
  const updated = updateProject(project.id, {
    allocations,
    totalAllocated: project.totalAllocated - alloc.percentage,
  })
  return c.json(updated)
})

app.patch('/api/projects/:id/allocations/:allocId/impressions', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const body = await c.req.json<{ impressions: number }>()
  const allocations = project.allocations.map((a) => {
    if (a.id !== c.req.param('allocId')) return a
    if (a.criteria.type !== 'social_impressions') return a
    return { ...a, criteria: { ...a.criteria, currentImpressions: body.impressions } }
  })

  const refreshed = await refreshAllocations(project.mintAddress, allocations)
  const updated = updateProject(project.id, { allocations: refreshed })
  return c.json(updated)
})

app.post('/api/projects/:id/allocations/:allocId/claim', async (c) => {
  const project = getProject(c.req.param('id'))
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const body = await c.req.json<{ wallet: string }>()
  const alloc = project.allocations.find((a) => a.id === c.req.param('allocId'))
  if (!alloc) return c.json({ error: 'Allocation not found' }, 404)
  if (alloc.status !== 'unlocked') return c.json({ error: 'Allocation not yet unlocked' }, 400)
  if (alloc.recipientWallet !== body.wallet) {
    return c.json({ error: 'Only the recipient wallet can claim' }, 403)
  }

  const allocations = project.allocations.map((a) =>
    a.id === alloc.id
      ? { ...a, status: 'claimed' as const, claimedAt: new Date().toISOString() }
      : a,
  )
  const updated = updateProject(project.id, { allocations })
  return c.json({
    ...updated,
    claim: {
      allocationId: alloc.id,
      percentage: alloc.percentage,
      recipient: alloc.recipientWallet,
      message: `${alloc.percentage}% of ${project.symbol} allocation marked as claimed. Transfer tokens from your treasury wallet.`,
    },
  })
})

app.delete('/api/projects/:id', async (c) => {
  const ok = deleteProject(c.req.param('id'))
  if (!ok) return c.json({ error: 'Project not found' }, 404)
  return c.json({ ok: true })
})

const DEMO_CA = 'DWP8uLwh4Dx2toehZchiT4WUzqGRDJarrwpVw9uspump'
const DEMO_PUMP_URL = `https://pump.fun/coin/${DEMO_CA}`

export function seedDemo() {
  const existing = getProject('demo-unlockladder')
  if (existing) {
    if (existing.mintAddress !== DEMO_CA) {
      updateProject('demo-unlockladder', {
        mintAddress: DEMO_CA,
        pumpFunUrl: DEMO_PUMP_URL,
      })
    }
    return
  }

  const projects = getAllProjects()
  if (projects.length > 0) return

  createProject({
    id: 'demo-unlockladder',
    name: 'Unlockladder Demo',
    symbol: 'LADDER',
    description: 'Demo token showing milestone-based unlocks on pump.fun',
    mintAddress: DEMO_CA,
    pumpFunUrl: DEMO_PUMP_URL,
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
        criteria: { type: 'volume_24h', targetVolume: 500_000, currentVolume: 0 },
        status: 'locked',
        createdAt: new Date().toISOString(),
      },
    ],
    totalAllocated: 2.5,
    createdAt: new Date().toISOString(),
    launchedAt: new Date().toISOString(),
  })
}

seedDemo()