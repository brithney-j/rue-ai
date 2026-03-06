import OpenAI from "openai"

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req){

const { mode, image, session } = await req.json()



if(mode === "analyze"){

const response = await openai.responses.create({

model:"gpt-4.1",

input:[{
role:"user",
content:[
{
type:"input_text",
text:`

You are RUE, an enthusiastic AI sous chef.

Look at the food image and determine:

1. Dish name
2. Visible ingredients
3. Cooking tools needed
4. Estimated prep time
5. Estimated cook time
6. Current cooking stage
7. Next step

Respond in SHORT, CLEAR bullet points.

Example response style:

Dish: Yum. Chicken Stir Fry. Great choice!
Ingredients: chicken, bell peppers, garlic
Tools: pan, spatula
Prep time: 10 minutes
Cook time: 12 minutes
Are you ready? Let's get cooking. 
Current Stage: sautéing
Next step: stir vegetables now

End with ONE clear next action.

Next step:
[one clear action]

Keep it short and energetic.

`
},

image && {
type:"input_image",
image_url:image
}

].filter(Boolean)
}]

})

const reply = response.output_text

return Response.json({

reply,

session:{
...session,
lastAdvice:reply,
lastMonitorNote:"",
startTime:Date.now()
}

})

}



if(mode === "monitor"){

const response = await openai.responses.create({

model:"gpt-4.1",

input:[{
role:"user",
content:[
{
type:"input_text",
text:`

You are monitoring a cooking pan.

Dish: ${session?.dish}

Previous instruction:
${session?.lastAdvice}

Elapsed cook time: ${session?.elapsedMinutes} minutes

Only respond if action is needed:

flip food
reduce heat
stir ingredients
remove from pan
food burning
food finished

If nothing changed return nothing.

If action is needed respond like:

"Flip the salmon now."

Maximum 10 words.

`
},

image && {
type:"input_image",
image_url:image
}

].filter(Boolean)
}]

})

const reply = response.output_text

return Response.json({reply})

}

}