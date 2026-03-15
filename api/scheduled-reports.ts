import type { VercelRequest, VercelResponse } from '@vercel/node'

// Placeholder — scheduled report email delivery will be implemented here.
// Will query saved report configs from Supabase and send PDF/CSV summaries via Resend.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ message: 'Scheduled reports — coming soon' })
}
