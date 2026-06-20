import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import {
  SolanaStreamClient,
  buildLockParams,
  getBN,
  getNumberFromBN,
} from '@streamflow/stream'
import type BN from 'bn.js'
import { SOLANA_RPC } from './rpc.js'

const streamClient = new SolanaStreamClient(SOLANA_RPC)

function validatePubkey(address: string, label: string): PublicKey {
  try {
    return new PublicKey(address.trim())
  } catch {
    throw new Error(`Invalid ${label}`)
  }
}

async function buildSerializedTx(
  payer: PublicKey,
  instructions: Awaited<ReturnType<SolanaStreamClient['buildCreateTransactionInstructions']>>['ixs'],
): Promise<string> {
  const { blockhash } = await streamClient.getConnection().getLatestBlockhash('confirmed')
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message()
  const tx = new VersionedTransaction(message)
  return Buffer.from(tx.serialize()).toString('base64')
}

export function defaultUnlockDate(lockPeriodDays = 365): number {
  const overrideSec = Number(process.env.LOCK_UNLOCK_SECONDS || 0)
  if (overrideSec > 0) return Math.floor(Date.now() / 1000) + overrideSec
  const days = Math.max(1, lockPeriodDays)
  return Math.floor(Date.now() / 1000) + days * 86400
}

export async function prepareSupplyLock(params: {
  mintAddress: string
  senderPubkey: string
  recipientPubkey: string
  amount: BN
  decimals: number
  humanAmount: number
  symbol: string
  recipientName: string
  lockPeriodDays?: number
}): Promise<{ serializedTx: string; streamId: string; unlockAt: number; lockAmount: string }> {
  const sender = validatePubkey(params.senderPubkey, 'creator wallet')
  const recipient = validatePubkey(params.recipientPubkey, 'recipient wallet')
  const unlockAt = defaultUnlockDate(params.lockPeriodDays)

  const lockParams = buildLockParams({
    recipient: recipient.toBase58(),
    tokenId: params.mintAddress,
    amount: params.amount,
    unlockDate: unlockAt,
    name: `${params.symbol} · ${params.recipientName} (${params.humanAmount.toLocaleString()} tokens)`,
  })

  const { ixs, metadataId } = await streamClient.buildCreateTransactionInstructions(lockParams, {
    sender: { publicKey: sender },
    isNative: false,
  })

  const serializedTx = await buildSerializedTx(sender, ixs)

  return {
    serializedTx,
    streamId: metadataId,
    unlockAt,
    lockAmount: params.amount.toString(),
  }
}

export async function prepareStreamWithdraw(params: {
  streamId: string
  recipientPubkey: string
}): Promise<{ serializedTx: string }> {
  const invoker = validatePubkey(params.recipientPubkey, 'recipient wallet')
  const ixs = await streamClient.prepareWithdrawInstructions(
    { id: params.streamId },
    { invoker: { publicKey: invoker } },
  )
  const serializedTx = await buildSerializedTx(invoker, ixs)
  return { serializedTx }
}

export async function getStreamStatus(streamId: string): Promise<{
  unlockedAmount: number
  depositedAmount: number
  withdrawable: boolean
}> {
  const stream = await streamClient.getOne({ id: streamId })
  const decimals = stream.mintDecimals ?? 6
  const deposited = getNumberFromBN(stream.depositedAmount, decimals)
  const unlocked = getNumberFromBN(stream.unlocked(), decimals)
  const now = Math.floor(Date.now() / 1000)
  const cliff = Number(stream.cliff)
  return {
    depositedAmount: deposited,
    unlockedAmount: unlocked,
    withdrawable: now >= cliff && unlocked > 0,
  }
}

