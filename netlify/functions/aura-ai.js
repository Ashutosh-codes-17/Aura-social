exports.handler = async function (event, context) {
  // 1. Handle CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ reply: "Method Not Allowed" }),
    };
  }

  try {
    const { prompt, history } = JSON.parse(event.body || "{}");
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: "DEEPSEEK_API_KEY is not set in Netlify environment variables.",
        }),
      };
    }

    // 2. Build conversation history for DeepSeek
    const messages = [
      {
        role: "system",
        content:
          "You are Aura AI, the official cheerful and witty companion of Aura Social created by Ashutosh Pandey. Keep replies engaging, concise, and helpful. Use emojis!",
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

    // 3. Request completion from DeepSeek API
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || "Please check your DeepSeek API key balance.";
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: `DeepSeek Error: ${errorMsg}` }),
      };
    }

    const reply = data.choices?.[0]?.message?.content || "I am thinking...";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: `Netlify Function Error: ${err.message}` }),
    };
  }
};
