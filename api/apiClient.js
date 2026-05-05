const { openRouterKey } = require('./config');
const { performance } = require('perf_hooks'); // Built into Node.js

async function fetchModelResponse(model, prompt) {
    if (!openRouterKey) return { text: "ERROR", latency: 0 };

    const startTime = performance.now();

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model.id,
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        const endTime = performance.now();
        const latencyMs = Math.round(endTime - startTime);
        
        if (data.error) {
            console.error(`API Error (${model.name}):`, data.error.message);
            return { text: "API Error", latency: latencyMs };
        }

        return { 
            text: data.choices?.[0]?.message?.content || "API Error", 
            latency: latencyMs 
        };
    } catch (e) {
        return { text: "Connection Error", latency: 0 };
    }
}

module.exports = { fetchModelResponse };