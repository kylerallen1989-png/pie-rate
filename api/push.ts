import type { VercelRequest, VercelResponse } from '@vercel/node'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const CLAUDE_SECRET = process.env.CLAUDE_SECRET
const REPO = 'kylerallen1989-png/pie-rate'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers['x-claude-secret'] !== CLAUDE_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { path, content, message } = req.body
  if (!path || !content || !message) return res.status(400).json({ error: 'Missing path, content, or message' })

  try {
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
    })
    let sha = undefined
    if (getRes.ok) {
      const existing = await getRes.json()
      sha = existing.sha
    }
    const body: any = {
      message,
      content: Buffer.from(content).toString('base64'),
    }
    if (sha) body.sha = sha
    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!putRes.ok) {
      const err = await putRes.json()
      return res.status(500).json({ error: err })
    }
    return res.status(200).json({ success: true, path })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}