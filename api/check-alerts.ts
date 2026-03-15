import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const PASS_RATE_THRESHOLD = 0.70

interface StoreAlert {
  storeId: string
  storeName: string
  town: string
  passRate: number
  totalGraded: number
  managerEmails: string[]
  regionalEmails: string[]
}

async function getTodayAlerts(): Promise<StoreAlert[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Fetch today's grades
  const { data: grades, error: gradesError } = await supabase
    .from('grades')
    .select('store_id, passed')
    .gte('graded_at', todayStart.toISOString())

  if (gradesError || !grades || grades.length === 0) return []

  // Group by store_id
  const byStore = grades.reduce<Record<string, { passed: number; total: number }>>((acc, g) => {
    if (!acc[g.store_id]) acc[g.store_id] = { passed: 0, total: 0 }
    acc[g.store_id].total++
    if (g.passed) acc[g.store_id].passed++
    return acc
  }, {})

  // Find stores below threshold
  const alertStoreIds = Object.entries(byStore)
    .filter(([, v]) => v.total > 0 && v.passed / v.total < PASS_RATE_THRESHOLD)
    .map(([id]) => id)

  if (alertStoreIds.length === 0) return []

  // Fetch store details
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, city')
    .in('id', alertStoreIds)

  if (!stores) return []

  // Fetch manager and regional emails per store
  const alerts: StoreAlert[] = []

  for (const store of stores) {
    const stats = byStore[store.id]
    const passRate = stats.passed / stats.total

    const { data: managers } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('store_id', store.id)
      .in('role', ['gm', 'manager', 'director', 'area_supervisor'])
      .eq('active', true)

    const managerEmails = (managers ?? [])
      .filter(p => ['gm', 'manager'].includes(p.role))
      .map(p => p.email)
      .filter(Boolean)

    const regionalEmails = (managers ?? [])
      .filter(p => ['director', 'area_supervisor'].includes(p.role))
      .map(p => p.email)
      .filter(Boolean)

    alerts.push({
      storeId: store.id,
      storeName: store.name ?? `Store ${store.id}`,
      town: store.city ?? 'Unknown',
      passRate,
      totalGraded: stats.total,
      managerEmails,
      regionalEmails,
    })
  }

  return alerts
}

function buildAlertHtml(alert: StoreAlert): string {
  const pct = Math.round(alert.passRate * 100)
  const color = pct < 50 ? '#CC0000' : '#e67e00'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: ${color}; padding: 20px 28px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">⚠️ Pass Rate Alert — ${alert.storeName}</h1>
    </div>
    <div style="padding: 24px 28px;">
      <p style="margin: 0 0 16px; color: #333; font-size: 15px;">
        <strong>${alert.storeName}</strong> in <strong>${alert.town}</strong> has dropped below the 70% pass rate threshold today.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background: #fafafa;">
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Store</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: #222;">${alert.storeName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Town</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: #222;">${alert.town}</td>
        </tr>
        <tr style="background: #fafafa;">
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Pass Rate Today</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: ${color}; font-weight: bold; font-size: 18px;">${pct}%</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; font-weight: bold; color: #555;">Pizzas Graded</td>
          <td style="padding: 10px 14px; border: 1px solid #e5e5e5; color: #222;">${alert.totalGraded}</td>
        </tr>
      </table>
      <p style="margin: 0; color: #666; font-size: 13px;">
        This alert is sent automatically by Pie-Rate every 15 minutes when any store falls below 70%.
      </p>
    </div>
  </div>
</body>
</html>`.trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET (cron) or POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const alerts = await getTodayAlerts()

    if (alerts.length === 0) {
      return res.status(200).json({ message: 'No alerts — all stores above threshold', alertsSent: 0 })
    }

    const results = await Promise.allSettled(
      alerts.map(async alert => {
        const to = [...new Set([...alert.managerEmails, ...alert.regionalEmails])]
        if (to.length === 0) return { storeId: alert.storeId, skipped: true, reason: 'No recipients' }

        const subject = `⚠️ Pass Rate Alert: ${alert.storeName} at ${Math.round(alert.passRate * 100)}% today`
        const html = buildAlertHtml(alert)

        const { error } = await resend.emails.send({
          from: 'Pie-Rate Alerts <alerts@pie-rate.com>',
          to,
          subject,
          html,
        })

        if (error) throw new Error(error.message)
        return { storeId: alert.storeId, sent: true, to }
      })
    )

    const summary = results.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }))
    return res.status(200).json({ alertsSent: alerts.length, summary })
  } catch (err: any) {
    console.error('check-alerts error:', err)
    return res.status(500).json({ error: err.message })
  }
}
