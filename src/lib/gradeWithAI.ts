import OpenAI from 'openai'
import { supabase } from './supabase'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export interface BoundingBox {
  x: number      // left edge, 0–1
  y: number      // top edge, 0–1
  width: number  // 0–1
  height: number // 0–1
}

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
  boundingBox: BoundingBox
}

async function cropToBase64(base64Image: string, box: BoundingBox): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const sw = Math.round(box.width * img.naturalWidth)
      const sh = Math.round(box.height * img.naturalHeight)
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        img,
        Math.round(box.x * img.naturalWidth),
        Math.round(box.y * img.naturalHeight),
        sw,
        sh,
        0,
        0,
        sw,
        sh
      )
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = base64Image
  })
}

async function uploadPhoto(base64: string, storeId: string): Promise<string | null> {
  try {
    const base64Data = base64.split(',')[1]
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    const filename = storeId + '/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.jpg'
    const { error } = await supabase.storage
      .from('pizza-photos')
      .upload(filename, bytes, { contentType: 'image/jpeg' })
    if (error) { console.error('Upload error:', error); return null }
    const { data } = supabase.storage.from('pizza-photos').getPublicUrl(filename)
    return data.publicUrl
  } catch (e) {
    console.error('Upload failed:', e)
    return null
  }
}

const PROMPT = `You are a strict Papa John's pizza quality grader.

CRITICAL REQUIREMENTS - reject any pizza that does not meet ALL of these:
- The pizza must be WHOLE and COMPLETE - all 8 slices present
- The photo must be taken from DIRECTLY ABOVE (top-down view)
- The pizza must be freshly cut and ready for boxing
- The entire pizza must be visible with no slices missing or eaten
- Partial pizzas, eaten pizzas, side-angle photos = skip that pizza
- Close-up photos showing only part of a pizza = skip that pizza

Only grade these pizza types: cheese only, pepperoni and cheese, sausage and cheese.
If the pizza type cannot be clearly identified = skip that pizza.

If multiple pizzas are visible, grade EACH one separately as its own entry.

For each qualifying pizza, provide a bounding box as fractions of the image dimensions (0.0–1.0):
- x: left edge fraction
- y: top edge fraction
- width: width fraction
- height: height fraction
Make the bounding box tight around the pizza including the crust edge.

Grade each qualifying pizza using this rubric:

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
    "boundingBox": { "x": 0.0, "y": 0.0, "width": 1.0, "height": 1.0 },
    "crust": 0 or 2,
    "cheeseCoverage": 0 or 2,
    "cheeseLock": 0 or 2,
    "toppings": 0 to 4,
    "notes": "brief explanation of any deductions"
  }
]

If no qualifying pizzas are visible return exactly: []`

export async function gradeWithAI(
  base64Image: string,
  storeId: string,
  mode: 'audit' | 'cut_table'
): Promise<AIGradeResult[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64Image, detail: 'high' } },
        { type: 'text', text: PROMPT }
      ]
    }]
  })

  const text = response.choices[0].message.content || '[]'
  const clean = text.replace(/```json|```/g, '').trim()
  let pizzas: any[] = []
  try { pizzas = JSON.parse(clean) } catch { console.error('Parse error:', clean) }

  const results: AIGradeResult[] = []

  for (const pizza of pizzas) {
    const box: BoundingBox = {
      x: pizza.boundingBox?.x ?? 0,
      y: pizza.boundingBox?.y ?? 0,
      width: pizza.boundingBox?.width ?? 1,
      height: pizza.boundingBox?.height ?? 1
    }

    let imageUrl: string | null = null
    try {
      const cropped = await cropToBase64(base64Image, box)
      imageUrl = await uploadPhoto(cropped, storeId)
    } catch (e) {
      console.error('Crop/upload failed:', e)
    }

    const score = (pizza.crust ?? 0) + (pizza.cheeseCoverage ?? 0) + (pizza.cheeseLock ?? 0) + (pizza.toppings ?? 0)
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

    results.push({
      score,
      passed,
      crust: pizza.crust ?? 0,
      cheeseCoverage: pizza.cheeseCoverage ?? 0,
      cheeseLock: pizza.cheeseLock ?? 0,
      toppings: pizza.toppings ?? 0,
      pizzaType: pizza.pizzaType ?? 'unknown',
      notes: pizza.notes ?? '',
      imageUrl,
      boundingBox: box
    })
  }

  return results
}
