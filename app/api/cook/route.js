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

You are RUE, an AI sous chef guiding someone cooking.

User question:
${message}

Create a cooking plan and the next action.

Respond briefly.
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

    return Response.json({

      reply,

      session:{
        dish:message,
        step:1,
        lastAdvice:reply
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

You are monitoring a cooking session.

Dish: ${session?.dish}

Previous advice:
${session?.lastAdvice}

If the food needs attention, warn the cook.

Otherwise return nothing.
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

    return Response.json({ reply });

  }

}