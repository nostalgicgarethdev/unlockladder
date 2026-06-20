import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { getBN } from '@streamflow/stream'
import { SOLANA_RPC } from './rpc.js'

// pump.fun tokens: 1B supply, 6 decimals (fallback if mint fetch fails)
const PUMP_FUN_SUPPLY = 1_000_000_000
const PUMP_FUN_DECIMALS = 6

export async function getTokenDecimals(mintAddress: string): Promise<number> {
  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed')
    const info = await connection.getParsedAccountInfo(new PublicKey(mintAddress))
    const parsed = info.value?.data
    if (parsed && typeof parsed === 'object' && 'parsed' in parsed) {
      const decimals = (parsed as { parsed: { info: { decimals?: number } } }).parsed.info.decimals
      if (typeof decimals === 'number') return decimals
    }
  } catch {
    /* use fallback */
  }
  return PUMP_FUN_DECIMALS
}

export async function lockAmountForPercentage(
  mintAddress: string,
  percentage: number,
): Promise<{ amount: BN; decimals: number; humanAmount: number }> {
  const decimals = await getTokenDecimals(mintAddress)
  const tokenCount = Math.floor((PUMP_FUN_SUPPLY * percentage) / 100)
  if (tokenCount < 1) throw new Error('Allocation too small — minimum 1 token')
  return {
    amount: getBN(tokenCount, decimals),
    decimals,
    humanAmount: tokenCount,
  }
}