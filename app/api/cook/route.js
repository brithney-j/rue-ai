import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req){

  const { mode, message, image, session } = await req.json();



  if(mode === "analyze"){

    const response = await openai.responses.create({

      model:"gpt-4.1",

      input:[{
        role:"user",
        content:[
          {
            type:"input_text",
            text:`

You are RUE, an excited, calm. supportive, AI sous chef.

Look at the food and determine:

1. Dish name
2. Visible ingredients
3. Cooking tools needed
4. Estimated prep time
5. Estimated cook time
6. Current cooking stage
7. Next step

Respond in SHORT, CLEAR bullet points.

Example style:

Dish: Yum. Chicken Stir Fry. Great choice!
Ingredients: chicken, bell peppers, garlic
Tools: pan, spatula
Prep time: 10 minutes
Cook time: 12 minutes
Are you ready? Let's get cooking. 
Current Stage: sautéing
Next step: stir vegetables now

End with ONE clear next action.

Return JSON:

{
"dish":"",
"ingredients":[],
"stage":"",
"next_step":""
}

`
          },

          image && {
            type:"input_image",
            image_url:image
          }

        ].filter(Boolean)
      }]

    });

    const text = response.output_text;

    let parsed;

    try{
      parsed = JSON.parse(text);
    }catch{
      parsed = {
        dish:message,
        ingredients:[],
        stage:"unknown",
        next_step:text
      };
    }



    return Response.json({

      reply:parsed.next_step,

      session:{
        dish:parsed.dish,
        ingredients:parsed.ingredients,
        stage:parsed.stage,
        step:1,
        lastAdvice:parsed.next_step,
        lastMonitorNote:""
      }

    });

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

Ingredients: ${session?.ingredients?.join(", ")}

Cooking stage: ${session?.stage}

Elapsed cook time: ${session?.elapsedMinutes} minutes

Previous instruction: ${session?.lastAdvice}

Only respond if action is needed:
flip food
reduce heat
stir ingredients
remove from pan
food burning

If nothing changed return nothing.

`
          },

          image && {
            type:"input_image",
            image_url:image
          }

        ].filter(Boolean)
      }]

    });

    const reply = response.output_text;

    return Response.json({reply});

  }

}