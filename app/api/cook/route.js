import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req) {

  const { message, image } = await req.json()

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `You are RUE, an AI sous chef guiding someone cooking in real time.

Analyze the food image carefully and respond EXACTLY in this format:

Dish:
<Intrigue and approval> This is <dish name>

Ingredients detected:
• item
• item
• item

Tools needed:
• tool
• tool

Estimated prep time:
<time estimate>

Ask 'are you ready to start cooking?'

Next cooking steps:
1. step
2. step
3. step

Rules:
- Never respond in paragraph form
- Always use bullet points
- Always separate sections with blank lines
- Speak like an encouraging cooking coach
- Keep steps short, clear and actionable
`
          },

          image && {
            type: "input_image",
            image_url: image
          }

        ].filter(Boolean)
      }
    ]
  })

  let text = response.output_text || "Sorry, I couldn't analyze that."



  /*
  ------------------------------
  12 LINE UX FORMATTING UPGRADE
  ------------------------------
  Cleans AI output and ensures
  clean spacing for UI rendering
  */

  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/•/g, "• ")
    .replace(/\n-/g, "\n• ")
    .replace(/Ingredients detected:/i, "🍅 Ingredients detected:")
    .replace(/Tools needed:/i, "🔪 Tools needed:")
    .replace(/Estimated prep time:/i, "⏱ Prep time:")
    .replace(/Next cooking steps:/i, "👨‍🍳 Next steps:")
    .replace(/Dish:/i, "🍽 Dish:")



  return Response.json({
    reply: text
  })
}