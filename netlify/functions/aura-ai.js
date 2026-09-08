exports.handler = async function (event, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 1. Handle CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ reply: "Method Not Allowed" }),
    };
  }

  try {
    const { prompt, history } = JSON.parse(event.body || "{}");
    
    // Accepts either GROQ_API_KEY or DEEPSEEK_API_KEY from Netlify environment variables
    const apiKey = process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: "API Key is missing in Netlify environment variables.",
        }),
      };
    }

    // 2. Build conversation history
    const messages = [
      {
        role: "system",
        content:
          "You are Aura AI, the official cheerful, helpful, and witty companion of Aura Social created by Ashutosh Pandey. Keep replies engaging, concise, and helpful. Use emojis!",
      },
    ];

    if (Array.isArray(history)) {
      history.forEach((item) => {
        const text = item.content || item.parts?.[0]?.text || "";
        if (text) {
          messages.push({
            role: item.role === "assistant" || item.role === "model" ? "assistant" : "user",
            content: text,
          });
        }
      });
    }

    messages.push({
      role: "user",
      content: prompt || "Hello!",
    });

    // 3. Send request to Groq API using the guaranteed active free-tier model
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || "Error communicating with Groq.";
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: `Groq Error: ${errorMsg}` }),
      };
    }

    const reply = data.choices?.[0]?.message?.content || "I am thinking...";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ reply: `Netlify Function Error: ${err.message}` }),
    };
  }
};
