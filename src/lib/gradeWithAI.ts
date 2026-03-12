import OpenAI from 'openai'
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
  const prompt = `You are an expert Papa John's pizza quality grader. Analyze this image and grade every pizza you can clearly see that has been cut and is ready for boxing.

Only grade these pizza types: cheese only, pepperoni and cheese, sausage and cheese. Ignore all other items.

For each pizza grade using this rubric:

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

TOPPINGS (0 to 4 points, 0.5 per slice, 8 slices):
- Pepperoni 1-topping: 5 per slice
- Sausage crumbled: 7 per slice
- Cheese only: automatically 4/4
- Partial slices combined, 90%+ rounds up

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

If no gradeable pizzas are visible return an empty array: []`

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
  const clean = text.replace(/```json|```/g, '').trim()
  let pizzas: any[] = []
  try { pizzas = JSON.parse(clean) } catch { console.error('Parse error:', clean) }

  const results: AIGradeResult[] = []
  for (const pizza of pizzas) {
    const score = pizza.crust + pizza.cheeseCoverage + pizza.cheeseLock + pizza.toppings
    const passed = score >= 8
    const result: AIGradeResult = { score, passed, crust: pizza.crust, cheeseCoverage: pizza.cheeseCoverage, cheeseLock: pizza.cheeseLock, toppings: pizza.toppings, pizzaType: pizza.pizzaType, notes: pizza.notes, imageUrl }
    await supabase.from('grades').insert({ store_id: storeId, score, passed, mode, image_url: imageUrl, graded_at: new Date().toISOString() })
    results.push(result)
  }
  return results
}