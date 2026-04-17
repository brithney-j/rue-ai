import { NextResponse } from "next/server"
import { openai } from "../../../lib/openai"
import { supabase } from "../../../lib/supabase"

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return JSON.parse(fenced[1])

  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start !== -1 && end !== -1) {
    return JSON.parse(text.slice(start, end + 1))
  }

  throw new Error("No JSON found in model response")
}

export async function POST(req) {
  try {
    const { image, fileName } = await req.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("ANALYZE: request received")
    console.log("ANALYZE: filename =", fileName || "unknown")

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this food image and return valid JSON only.

Use the uploaded filename as a hint, not as absolute truth.
Filename: ${fileName || "unknown"}

Schema:
{
  "dishName": "string",
  "confidence": 0.0,
  "ingredients": ["string"],
  "tools": ["string"],
  "prepTime": "string",
  "steps": [
    {
      "title": "string",
      "instruction": "string",
      "durationSec": 120,
      "heatLevel": "low|medium|high",
      "trigger": "what indicates this step is done"
    }
  ]
}

Rules:
- 4 to 6 steps
- instructions must be short and actionable
- steps must be appropriate for a real-time cooking guide
- no markdown
- JSON only`
            },
            {
              type: "input_image",
              image_url: image
            }
          ]
        }
      ]
    })

    console.log("ANALYZE: model responded")

    const parsed = extractJson(response.output_text || "")
    console.log("ANALYZE: parsed json")

    const plan = {
      id: crypto.randomUUID(),
      image_url: image,
      file_name: fileName || null,
      dish_name: parsed.dishName,
      confidence: parsed.confidence,
      ingredients: parsed.ingredients || [],
      tools: parsed.tools || [],
      prep_time: parsed.prepTime || "",
      steps: (parsed.steps || []).map((step, index) => ({
        id: crypto.randomUUID(),
        stepIndex: index,
        title: step.title,
        instruction: step.instruction,
        durationSec: Number(step.durationSec || 120),
        heatLevel: step.heatLevel || "medium",
        trigger: step.trigger || ""
      }))
    }

    const { error } = await supabase.from("session_plans").insert(plan)

    if (error) {
      console.error("ANALYZE: supabase insert failed", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("ANALYZE: inserted plan", plan.id)

    return NextResponse.json({
      plan: {
        id: plan.id,
        imageUrl: plan.image_url,
        fileName: plan.file_name,
        dishName: plan.dish_name,
        confidence: plan.confidence,
        ingredients: plan.ingredients,
        tools: plan.tools,
        prepTime: plan.prep_time,
        steps: plan.steps
      }
    })
  } catch (error) {
    console.error("ANALYZE ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Analyze failed" },
      { status: 500 }
    )
  }
}