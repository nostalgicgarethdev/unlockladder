import { Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

export interface PrepareLaunchParams {
  name: string
  symbol: string
  description: string
  creatorPubkey: string
  devBuySol?: number
  imageUrl?: string
  twitter?: string
  telegram?: string
  website?: string
}

export interface PreparedLaunch {
  mint: string
  mintSecret: string
  serializedTx: string
  pumpFunUrl: string
}

// 1x1 PNG — avoids flaky external image fetches on serverless
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function sanitizeName(name: string): string {
  return name.trim().slice(0, 32) || 'Token'
}

function sanitizeSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (clean || 'TOKEN').slice(0, 10)
}

function validateCreatorPubkey(pubkey: string): string {
  const trimmed = pubkey?.trim()
  if (!trimmed) throw new Error('Wallet not connected — connect Phantom/Solflare first')
  try {
    return new PublicKey(trimmed).toBase58()
  } catch {
    throw new Error('Invalid wallet address — reconnect your wallet and try again')
  }
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  const v = value.trim()
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  if (v.startsWith('@')) return `https://x.com/${v.slice(1)}`
  return `https://x.com/${v}`
}

async function loadImageBuffer(imageUrl?: string): Promise<{ buf: Buffer; contentType: string }> {
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        return {
          buf: Buffer.from(await res.arrayBuffer()),
          contentType: res.headers.get('content-type') || 'image/png',
        }
      }
    } catch {
      /* fall through to placeholder */
    }
  }
  return { buf: FALLBACK_PNG, contentType: 'image/png' }
}

async function uploadMetadata(params: {
  name: string
  symbol: string
  description: string
  imageBuf: Buffer
  contentType: string
  twitter?: string
  telegram?: string
  website?: string
}): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(params.imageBuf)], { type: params.contentType }), 'image.png')
  form.append('name', params.name)
  form.append('symbol', params.symbol)
  form.append('description', params.description.slice(0, 2000))
  form.append('showName', 'true')

  const twitter = normalizeUrl(params.twitter)
  const telegram = normalizeUrl(params.telegram)
  const website = normalizeUrl(params.website)
  if (twitter) form.append('twitter', twitter)
  if (telegram) form.append('telegram', telegram)
  if (website) form.append('website', website)

  const ipfsRes = await fetch('https://pump.fun/api/ipfs', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20000),
  })

  if (!ipfsRes.ok) {
    const txt = await ipfsRes.text().catch(() => '')
    throw new Error(`Metadata upload failed (${ipfsRes.status}). Try again in a moment. ${txt.slice(0, 120)}`)
  }

  const ipfsJson = (await ipfsRes.json()) as { metadataUri?: string; uri?: string }
  const metadataUri = ipfsJson.metadataUri || ipfsJson.uri
  if (!metadataUri?.startsWith('http')) {
    throw new Error('Metadata upload succeeded but no valid URI was returned')
  }
  return metadataUri
}

export async function prepareClientLaunch(params: PrepareLaunchParams): Promise<PreparedLaunch> {
  const creatorPubkey = validateCreatorPubkey(params.creatorPubkey)
  const name = sanitizeName(params.name)
  const symbol = sanitizeSymbol(params.symbol)
  const mint = Keypair.generate()

  const { buf, contentType } = await loadImageBuffer(params.imageUrl)
  const metadataUri = await uploadMetadata({
    name,
    symbol,
    description: params.description || `${name} on pump.fun`,
    imageBuf: buf,
    contentType,
    twitter: params.twitter,
    telegram: params.telegram,
    website: params.website,
  })

  // pumpportal currently rejects create+devBuy bundles (amount > 0 → 400).
  // Launch with amount 0; user can buy on pump.fun after creation.
  if (params.devBuySol && params.devBuySol > 0) {
    console.warn(`devBuySol ${params.devBuySol} ignored — pumpportal create only supports amount: 0`)
  }

  const payload = {
    publicKey: creatorPubkey,
    action: 'create',
    tokenMetadata: { name, symbol, uri: metadataUri },
    mint: mint.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: 0,
    slippage: 10,
    priorityFee: 0.00001,
    pool: 'pump',
  }

  const tradeRes = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  })

  if (!tradeRes.ok) {
    const txt = await tradeRes.text().catch(() => '')
    if (tradeRes.status === 400) {
      throw new Error(
        `pumpportal rejected launch: ${txt || 'Bad Request'}. Ensure your wallet is connected and has ~0.02 SOL for fees.`,
      )
    }
    throw new Error(`pumpportal launch failed: ${tradeRes.status} ${txt}`)
  }

  const txBytes = new Uint8Array(await tradeRes.arrayBuffer())
  if (txBytes.length < 100) {
    throw new Error('pumpportal returned an invalid transaction — try again')
  }

  const serializedTx = Buffer.from(txBytes).toString('base64')
  const mintSecret = bs58.encode(mint.secretKey)
  const pumpFunUrl = `https://pump.fun/coin/${mint.publicKey.toBase58()}`

  return { mint: mint.publicKey.toBase58(), mintSecret, serializedTx, pumpFunUrl }
}