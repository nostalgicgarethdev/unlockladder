import type { IncomingMessage, ServerResponse } from 'http'
import { app } from './src/app'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host ?? 'localhost'
  const url = `https://${host}${req.url ?? '/'}`

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: req.headers as HeadersInit,
  }

  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    init.body = req as unknown as BodyInit
    init.duplex = 'half'
  }

  const response = await app.fetch(new Request(url, init))
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value)
  })
  const body = Buffer.from(await response.arrayBuffer())
  res.end(body)
}