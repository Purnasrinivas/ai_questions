import dotenv from 'dotenv';
dotenv.config();

export const config = {
    openRouterUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    hfToken: process.env.HF_TOKEN,
    models: {
        claude: { id: "anthropic/claude-3-haiku", color: "#e0844a" }, 
        gpt: { id: "openai/gpt-4o", color: "#74c69d" }
    },
    systemPrompt: `You are taking a PhD-level multiple choice science exam. You must respond in this EXACT JSON format and nothing else:
{
  "thinking": "Step 1: Analyze the core concept... Step 2: Evaluate options...",
  "answer": "A",
  "confidence": 87,
  "reasoning": "One sentence summary of why you chose this answer"
}
Rules:
- "thinking" must contain your step-by-step logical deduction.
- "answer" must be exactly one letter: A, B, C, or D
- "confidence" must be a number between 0 and 100
- "reasoning" must be one sentence only
- Do not add any markdown formatting or text outside the JSON.`
};