import { config } from './config.js';
import { scoreAnswer } from './scorer.js';

async function callOpenRouter(modelId, prompt, retries = 1) {
    // Safety check: Prevent crash if config.js is missing the model
    if (!modelId) return JSON.stringify({ answer: "ERR", confidence: 0, thinking: "Model ID missing in config.", reasoning: "Backend configuration error." });

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15s Timeout

    try {
        const res = await fetch(config.openRouterUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'PhD Science Showdown',
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: config.systemPrompt },
                    { role: 'user', content: prompt }
                ]
            })
        });
        clearTimeout(id);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.choices[0].message.content;
    } catch (err) {
        clearTimeout(id);
        if (retries > 0 && err.name !== 'AbortError') return callOpenRouter(modelId, prompt, retries - 1);
        return JSON.stringify({ answer: "ERR", confidence: 0, thinking: "Request timed out or failed.", reasoning: err.message });
    }
}

export async function runSingleQuestion(q) {
    const prompt = `Subject: ${q.subject}\nQuestion: ${q.question}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\nRespond only in the specified JSON format.`;

    // The '?.' safely attempts to read the ID. If it doesn't exist, it passes undefined safely.
    const claudeId = config.models?.claude?.id;
    const gptId = config.models?.gpt?.id;

    const [claudeRes, gptRes] = await Promise.allSettled([
        callOpenRouter(claudeId, prompt),
        callOpenRouter(gptId, prompt)
    ]);

    return {
        claude: scoreAnswer(claudeRes.value, q.correct_letter),
        gpt: scoreAnswer(gptRes.value, q.correct_letter)
    };
}