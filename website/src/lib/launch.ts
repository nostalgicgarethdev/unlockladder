import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import type { PreparedLaunch } from './types'

const RPC = 'https://api.mainnet-beta.solana.com'

export async function signAndSendLaunch(
  prepared: PreparedLaunch,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
): Promise<string> {
  const txBytes = Uint8Array.from(atob(prepared.serializedTx), (c) => c.charCodeAt(0))
  const tx = VersionedTransaction.deserialize(txBytes)

  const mint = Keypair.fromSecretKey(bs58.decode(prepared.mintSecret))

  tx.sign([mint])

  const signed = await signTransaction(tx)
  const connection = new Connection(RPC, 'confirmed')
  const signature = await connection.sendTransaction(signed, { skipPreflight: false })
  await connection.confirmTransaction(signature, 'confirmed').catch(() => {})
  return signature
}