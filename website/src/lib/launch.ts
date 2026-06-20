import type { VersionedTransaction } from '@solana/web3.js'
import { signAndSendTransaction } from './tx'
import type { PreparedLaunch } from './types'

export async function signAndSendLaunch(
  prepared: PreparedLaunch,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
): Promise<string> {
  return signAndSendTransaction(prepared.serializedTx, signTransaction)
}