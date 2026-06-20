import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import type { PreparedLaunch } from './types'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

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

export async function prepareClientLaunch(params: PrepareLaunchParams): Promise<PreparedLaunch> {
  const mint = Keypair.generate()

  let imageToUse = params.imageUrl
  if (!imageToUse) {
    const seed = params.symbol + params.name
    imageToUse = `https://picsum.photos/seed/${encodeURIComponent(seed)}/512/512`
  }

  const imgRes = await fetch(imageToUse)
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch image for metadata (${imgRes.status})`)
  }
  const imgBuf = new Uint8Array(await imgRes.arrayBuffer())
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'

  const form = new FormData()
  form.append('file', new Blob([imgBuf], { type: contentType }), 'image')
  form.append('name', params.name)
  form.append('symbol', params.symbol)
  form.append('description', params.description.slice(0, 2000))
  form.append('showName', 'true')

  if (params.twitter) form.append('twitter', params.twitter)
  if (params.telegram) form.append('telegram', params.telegram)
  if (params.website) form.append('website', params.website)

  const ipfsRes = await fetch('https://pump.fun/api/ipfs', {
    method: 'POST',
    body: form,
  })
  if (!ipfsRes.ok) {
    const txt = await ipfsRes.text().catch(() => '')
    throw new Error(`pump.fun metadata upload failed: ${ipfsRes.status} ${txt}`)
  }
  const ipfsJson = (await ipfsRes.json()) as { metadataUri?: string; uri?: string }
  const metadataUri = ipfsJson.metadataUri || ipfsJson.uri
  if (!metadataUri) throw new Error('No metadataUri returned from pump.fun')

  const devBuy = Math.max(0, params.devBuySol ?? 0)

  const payload = {
    publicKey: params.creatorPubkey,
    action: 'create',
    tokenMetadata: {
      name: params.name,
      symbol: params.symbol,
      uri: metadataUri,
    },
    mint: mint.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: devBuy,
    slippage: 15,
    priorityFee: 0.00005,
    pool: 'pump',
  }

  const tradeRes = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!tradeRes.ok) {
    const txt = await tradeRes.text().catch(() => '')
    throw new Error(`pumpportal launch failed: ${tradeRes.status} ${txt}`)
  }

  const txBytes = new Uint8Array(await tradeRes.arrayBuffer())
  const serializedTx = toBase64(txBytes)
  const mintSecret = bs58.encode(mint.secretKey)
  const pumpFunUrl = `https://pump.fun/coin/${mint.publicKey.toBase58()}`

  return { mint: mint.publicKey.toBase58(), mintSecret, serializedTx, pumpFunUrl }
}