const fs = require('fs')
fs.mkdirSync('src/lib', { recursive: true })
const content = `import OpenAI from 'openai'
import { supabase } from './supabase'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export interface AIGradeResult {
  score: number
  passed: boolean
  crust: number
  cheeseCoverage: number
  cheeseLock: number
  toppings: number
  pizzaType: string
  notes: string
  imageUrl: string | null
}

async function uploadPhoto(base64: string, storeId: string): Promise<string | null> {
  try {
    const base64Data = base64.split(',')[1]
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    const filename = storeId + '/' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('pizza-photos').upload(filename, bytes, { contentType: 'image/jpeg' })
    if (error) { console.error('Upload error:', error); return null }
    const { data } = supabase.storage.from('pizza-photos').getPublicUrl(filename)
    return data.publicUrl
  } catch (e) {
    console.error('Upload failed:', e)
    return null
  }
}

export async function gradeWithAI(base64Image: string, storeId: string, mode: 'audit' | 'cut_table'): Promise<AIGradeResult[]> {
  const imageUrl = await uploadPhoto(base64Image, storeId)

  const prompt = \`You are a strict Papa John's pizza quality grader.

CRITICAL REQUIREMENTS - reject any pizza that does not meet ALL of these:
- The pizza must be WHOLE and COMPLETE - all 8 slices present
- The photo must be taken from DIRECTLY ABOVE (top-down view)
- The pizza must be freshly cut and ready for boxing
- The entire pizza must be visible with no slices missing or eaten
- Partial pizzas, eaten pizzas, side-angle photos = skip that pizza
- Close-up photos showing only part of a pizza = skip that pizza

Only grade these pizza types: cheese only, pepperoni and cheese, sausage and cheese.
If the pizza type cannot be clearly identified = skip that pizza.

If multiple pizzas are visible, grade EACH one separately as its own entry in the array.

For each qualifying pizza grade using this rubric:

CRUST (0 or 2 points) - award 2 only if ALL pass:
- Color between 7-11 on scale (not too pale, not too dark)
- Dirty/burnt area under 25%
- Pizza not misshaped
- All slices fully cut through (if any slice not cut, entire category = 0)

CHEESE COVERAGE (0 or 2 points) - award 2 only if ALL pass:
- 75% or more overall coverage
- No bubbles larger than 1 inch diameter

CHEESE LOCK (0 or 2 points) - award 2 only if ALL pass:
- 75% or more cheese lock coverage
- No bubbles larger than 1 inch diameter

TOPPINGS (0 to 4 points):
- Pepperoni 1-topping: need 5 per slice minimum
- Sausage crumbled: need 7 per slice minimum
- Cheese only: automatically 4/4
- Be strict - if topping counts are borderline, deduct points

Return ONLY a JSON array, no other text:
[
  {
    "pizzaType": "cheese only" | "pepperoni and cheese" | "sausage and cheese",
    "crust": 0 or 2,
    "cheeseCoverage": 0 or 2,
    "cheeseLock": 0 or 2,
    "toppings": 0 to 4,
    "notes": "brief explanation of any deductions"
  }
]

If no qualifying pizzas are visible return exactly: []\`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64Image, detail: 'high' } },
        { type: 'text', text: prompt }
      ]
    }]
  })

  const text = response.choices[0].message.content || '[]'
  const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
  let pizzas: any[] = []
  try { pizzas = JSON.parse(clean) } catch { console.error('Parse error:', clean) }

  const results: AIGradeResult[] = []
  for (const pizza of pizzas) {
    const score = pizza.crust + pizza.cheeseCoverage + pizza.cheeseLock + pizza.toppings
    const passed = score >= 8
    const { error } = await supabase.from('grades').insert({
      store_id: storeId,
      score,
      passed,
      mode,
      image_url: imageUrl,
      graded_at: new Date().toISOString()
    })
    if (error) console.error('Insert error:', error)
    results.push({ score, passed, crust: pizza.crust, cheeseCoverage: pizza.cheeseCoverage, cheeseLock: pizza.cheeseLock, toppings: pizza.toppings, pizzaType: pizza.pizzaType, notes: pizza.notes, imageUrl })
  }
  return results
}`
fs.writeFileSync('src/lib/gradeWithAI.ts', content, 'utf8')
console.log('wrote src/lib/gradeWithAI.ts')