import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY })

// Day-part buckets (hour ranges, 24h)
const DAY_PARTS = [
  { label: 'Morning (6am–11am)',   start: 6,  end: 11 },
  { label: 'Lunch (11am–2pm)',     start: 11, end: 14 },
  { label: 'Afternoon (2pm–5pm)', start: 14, end: 17 },
  { label: 'Dinner (5pm–9pm)',    start: 17, end: 21 },
  { label: 'Late Night (9pm+)',   start: 21, end: 24 },
]

interface GradeRow {
  store_id: string
  passed: boolean
  score: number
  graded_at: string
}

interface StoreDigest {
  storeId: string
  storeName: string
  town: string
  companyId: string | null
  passRate: number
  totalGraded: number
  avgScore: number
  worstSlot: string
  managerEmails: string[]
}

interface FranchiseDigest {
  franchiseEmail: string
  companyName: string
  stores: Array<{ name: string; town: string; passRate: number; total: number }>
}

function getYesterdayRange(): { start: Date; end: Date } {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 1)
  return { start, end }
}

function worstDayPart(grades: GradeRow[]): string {
  const slotStats = DAY_PARTS.map(slot => {
    const slotGrades = grades.filter(g => {
      const h = new Date(g.graded_at).getHours()
      return h >= slot.start && h < slot.end
    })
    const total = slotGrades.length
    const passed = slotGrades.filter(g => g.passed).length
    const passRate = total > 0 ? passed / total : 1
    return { label: slot.label, passRate, total }
  }).filter(s => s.total > 0)

  if (slotStats.length === 0) return 'N/A'
  return slotStats.sort((a, b) => a.passRate - b.passRate)[0].label
}

async function getAIRecommendations(
  storeName: string,
  passRate: number,
  totalGraded: number,
  worstSlot: string
): Promise<string> {
  try {
    const prompt = `You are a pizza quality consultant. A store called "${storeName}" had the following performance yesterday:
- Pass rate: ${Math.round(passRate * 100)}%
- Total pizzas graded: ${totalGraded}
- Worst performing time slot: ${worstSlot}

Provide 3 specific, actionable recommendations to improve quality. Be concise — one sentence each. Format as a plain numbered list.`

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    })

    return resp.choices[0]?.message?.content?.trim() ?? 'No recommendations available.'
  } catch {
    return '1. Review cheese application technique.\n2. Monitor crust consistency during peak hours.\n3. Conduct a team quality refresher during the worst-performing shift.'
  }
}

function buildStoreDigestHtml(digest: StoreDigest, recommendations: string): string {
  const pct = Math.round(digest.passRate * 100)
  const color = pct >= 80 ? '#16a34a' : pct >= 70 ? '#e67e00' : '#CC0000'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const recLines = recommendations
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<li style="margin-bottom:6px;">${l.replace(/^\d+\.\s*/, '')}</li>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #CC0000; padding: 20px 28px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">Pie-Rate Daily Digest</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">${dateStr} — ${digest.storeName}</p>
    </div>
    <div style="padding: 24px 28px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #333;">Yesterday's Performance</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="background: #fafafa;">
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Pass Rate</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: ${color}; font-weight: bold; font-size: 22px;">${pct}%</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Pizzas Graded</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: #222;">${digest.totalGraded}</td>
        </tr>
        <tr style="background: #fafafa;">
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Avg Score</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: #222;">${digest.avgScore.toFixed(1)} / 10</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Worst Time Slot</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: #CC0000;">${digest.worstSlot}</td>
        </tr>
      </table>
      <h2 style="margin: 0 0 12px; font-size: 16px; color: #333;">AI Recommendations</h2>
      <ol style="margin: 0; padding-left: 20px; color: #444; font-size: 14px; line-height: 1.6;">${recLines}</ol>
    </div>
    <div style="background: #fafafa; padding: 14px 28px; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">Sent daily at 5am CST by Pie-Rate. <a href="#" style="color: #CC0000;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`.trim()
}

function buildFranchiseDigestHtml(digest: FranchiseDigest): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const rows = digest.stores.map(s => {
    const pct = Math.round(s.passRate * 100)
    const color = pct >= 80 ? '#16a34a' : pct >= 70 ? '#e67e00' : '#CC0000'
    return `
      <tr>
        <td style="padding: 10px 14px; border: 1px solid #e5e5e5;">${s.name}</td>
        <td style="padding: 10px 14px; border: 1px solid #e5e5e5;">${s.town}</td>
        <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: ${color}; font-weight: bold;">${pct}%</td>
        <td style="padding: 10px 14px; border: 1px solid #e5e5e5;">${s.total}</td>
      </tr>`
  }).join('')

  const overallPct = digest.stores.length > 0
    ? Math.round(digest.stores.reduce((sum, s) => sum + s.passRate, 0) / digest.stores.length * 100)
    : 0

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 24px;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #CC0000; padding: 20px 28px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">Franchise Daily Summary</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">${dateStr} — ${digest.companyName}</p>
    </div>
    <div style="padding: 24px 28px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #555;">Overall network pass rate yesterday: <strong style="font-size: 18px; color: #CC0000;">${overallPct}%</strong></p>
      <p style="margin: 0 0 20px; font-size: 13px; color: #888;">${digest.stores.length} store${digest.stores.length !== 1 ? 's' : ''} reported</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #CC0000; color: #fff;">
            <th style="padding: 10px 14px; text-align: left; font-size: 13px;">Store</th>
            <th style="padding: 10px 14px; text-align: left; font-size: 13px;">Town</th>
            <th style="padding: 10px 14px; text-align: left; font-size: 13px;">Pass Rate</th>
            <th style="padding: 10px 14px; text-align: left; font-size: 13px;">Graded</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="background: #fafafa; padding: 14px 28px; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">Sent daily at 5am CST by Pie-Rate.</p>
    </div>
  </div>
</body>
</html>`.trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { start, end } = getYesterdayRange()

    // Fetch yesterday's grades
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('store_id, passed, score, graded_at')
      .gte('graded_at', start.toISOString())
      .lt('graded_at', end.toISOString())

    if (gradesError) throw new Error(gradesError.message)

    if (!grades || grades.length === 0) {
      return res.status(200).json({ message: 'No grades yesterday — no digests sent' })
    }

    // Group grades by store
    const byStore = (grades as GradeRow[]).reduce<Record<string, GradeRow[]>>((acc, g) => {
      if (!acc[g.store_id]) acc[g.store_id] = []
      acc[g.store_id].push(g)
      return acc
    }, {})

    const storeIds = Object.keys(byStore)

    // Fetch store details
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, city, company_id')
      .in('id', storeIds)

    if (!stores) return res.status(200).json({ message: 'No store data found' })

    // Fetch all relevant profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, role, store_id, company_id')
      .in('store_id', storeIds)
      .in('role', ['gm', 'manager', 'director', 'area_supervisor', 'franchise_owner'])
      .eq('active', true)

    // Build per-store digest data
    const storeDigests: StoreDigest[] = stores.map(store => {
      const storeGrades = byStore[store.id] ?? []
      const total = storeGrades.length
      const passed = storeGrades.filter(g => g.passed).length
      const avgScore = total > 0 ? storeGrades.reduce((s, g) => s + g.score, 0) / total : 0

      const storeProfiles = (profiles ?? []).filter(p => p.store_id === store.id)
      const managerEmails = storeProfiles
        .filter(p => ['gm', 'manager'].includes(p.role))
        .map(p => p.email)
        .filter(Boolean)

      return {
        storeId: store.id,
        storeName: store.name ?? `Store ${store.id}`,
        town: store.city ?? 'Unknown',
        companyId: store.company_id ?? null,
        passRate: total > 0 ? passed / total : 0,
        totalGraded: total,
        avgScore,
        worstSlot: worstDayPart(storeGrades),
        managerEmails,
      }
    })

    // Send per-store digest emails
    const storeEmailResults = await Promise.allSettled(
      storeDigests.map(async digest => {
        if (digest.managerEmails.length === 0) {
          return { storeId: digest.storeId, skipped: true, reason: 'No manager emails' }
        }

        const recommendations = await getAIRecommendations(
          digest.storeName,
          digest.passRate,
          digest.totalGraded,
          digest.worstSlot
        )

        const subject = `Daily Digest: ${digest.storeName} — ${Math.round(digest.passRate * 100)}% pass rate yesterday`
        const html = buildStoreDigestHtml(digest, recommendations)

        const { error } = await resend.emails.send({
          from: 'Pie-Rate Digest <digest@pie-rate.com>',
          to: digest.managerEmails,
          subject,
          html,
        })

        if (error) throw new Error(error.message)
        return { storeId: digest.storeId, sent: true }
      })
    )

    // Build franchise owner summaries grouped by company_id
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')

    const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

    // Group stores by company_id
    const byCompany = storeDigests.reduce<Record<string, StoreDigest[]>>((acc, d) => {
      const cid = d.companyId ?? '__none__'
      if (!acc[cid]) acc[cid] = []
      acc[cid].push(d)
      return acc
    }, {})

    const franchiseEmailResults = await Promise.allSettled(
      Object.entries(byCompany)
        .filter(([cid]) => cid !== '__none__')
        .map(async ([companyId, storeList]) => {
          const ownerEmails = (profiles ?? [])
            .filter(p => p.company_id === companyId && p.role === 'franchise_owner')
            .map(p => p.email)
            .filter(Boolean)

          if (ownerEmails.length === 0) return { companyId, skipped: true, reason: 'No franchise owner emails' }

          const companyName = companyMap[companyId] ?? 'Your Franchise'

          const franchiseDigest: FranchiseDigest = {
            franchiseEmail: ownerEmails[0],
            companyName,
            stores: storeList.map(s => ({
              name: s.storeName,
              town: s.town,
              passRate: s.passRate,
              total: s.totalGraded,
            })),
          }

          const html = buildFranchiseDigestHtml(franchiseDigest)
          const subject = `Franchise Summary: ${companyName} — ${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

          const { error } = await resend.emails.send({
            from: 'Pie-Rate Digest <digest@pie-rate.com>',
            to: ownerEmails,
            subject,
            html,
          })

          if (error) throw new Error(error.message)
          return { companyId, sent: true, to: ownerEmails }
        })
    )

    return res.status(200).json({
      storeDigestsSent: storeDigests.length,
      storeResults: storeEmailResults.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message })),
      franchiseResults: franchiseEmailResults.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message })),
    })
  } catch (err: any) {
    console.error('daily-digest error:', err)
    return res.status(500).json({ error: err.message })
  }
}
