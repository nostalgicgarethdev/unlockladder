import { Connection, VersionedTransaction } from '@solana/web3.js'
import { api } from './api'
import { SOLANA_RPC } from './rpc'
import type { PreparedLaunch } from './types'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function signAndSendLaunch(
  prepared: PreparedLaunch,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
): Promise<string> {
  const txBytes = Uint8Array.from(atob(prepared.serializedTx), (c) => c.charCodeAt(0))
  const tx = VersionedTransaction.deserialize(txBytes)

  const signed = await signTransaction(tx)
  const serialized = toBase64(signed.serialize())

  try {
    const { signature } = await api.sendTransaction(serialized)
    return signature
  } catch {
    // Fallback if API relay is unavailable (e.g. local dev without API).
    const connection = new Connection(SOLANA_RPC, 'confirmed')
    const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
    await connection.confirmTransaction(signature, 'confirmed').catch(() => {})
    return signature
  }
}