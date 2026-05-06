import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    openRouterUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    hfToken: process.env.HF_TOKEN,
    models: {
        claude: { id: "anthropic/claude-3-haiku", color: "#e0844a" }, 
        gpt: { id: "openai/gpt-4o", color: "#74c69d" }
    },
    systemPrompt: `You are taking a PhD-level multiple choice science exam. You must respond in this EXACT JSON format and nothing else:
{
  "thinking": "Step 1...",
  "answer": "A",
  "confidence": 87,
  "reasoning": "..."
}`
};

function scoreAnswer(modelAnswerStr, correctLetter) {
    try {
        let clean = (modelAnswerStr || "{}").replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(clean);
        return {
            correct: parsed.answer?.trim().toUpperCase().charAt(0) === correctLetter,
            answer: parsed.answer || "N/A",
            confidence: parsed.confidence || 0,
            thinking: parsed.thinking || "...",
            reasoning: parsed.reasoning || ""
        };
    } catch (e) {
        return { correct: false, answer: "ERR", confidence: 0, thinking: "Parse Error", reasoning: "" };
    }
}

async function callOpenRouter(modelId, prompt, retries = 1) {
    if (!modelId) return JSON.stringify({ answer: "ERR" });
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(config.openRouterUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'PhD Showdown',
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'system', content: config.systemPrompt }, { role: 'user', content: prompt }]
            })
        });
        clearTimeout(id);
        const data = await res.json();
        return data.choices[0].message.content;
    } catch (err) {
        clearTimeout(id);
        if (retries > 0) return callOpenRouter(modelId, prompt, retries - 1);
        return JSON.stringify({ answer: "ERR" });
    }
}

async function runSingleQuestion(q) {
    const prompt = `Subject: ${q.subject}\nQuestion: ${q.question}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}`;
    const [claudeRes, gptRes] = await Promise.allSettled([
        callOpenRouter(config.models.claude.id, prompt),
        callOpenRouter(config.models.gpt.id, prompt)
    ]);
    return {
        claude: scoreAnswer(claudeRes.value, q.correct_letter),
        gpt: scoreAnswer(gptRes.value, q.correct_letter)
    };
}

function getStrictFallbacks() {
    return [
        { subject: "Physics", question: "What is the primary implication of Bell's Theorem?", correct_letter: "A", explanation: "Non-locality.", options: {A: "Non-local hidden variables", B: "Faster than light travel", C: "Cat states", D: "Measurement error"}},
        { subject: "Physics", question: "Hawking radiation is caused by?", correct_letter: "C", explanation: "Quantum effects near horizon.", options: {A: "Black hole explosion", B: "Nuclear fusion", C: "Quantum fluctuations at horizon", D: "Dark matter decay"}},
        { subject: "Physics", question: "The Casimir effect is a manifestation of?", correct_letter: "D", options: {A: "Gravity", B: "Strong force", C: "Relativity", D: "Vacuum energy"}},
        { subject: "Physics", question: "What defines a topological insulator?", correct_letter: "D", options: {A: "Vacuum", B: "Superconductor", C: "Metal", D: "Insulating bulk, conducting surface"}},
        { subject: "Chemistry", question: "Identify the strongest Bronsted acid.", correct_letter: "A", options: {A: "HClO4", B: "H2SO4", C: "HCl", D: "HNO3"}},
        { subject: "Chemistry", question: "What is the byproduct of the Haber process?", correct_letter: "B", options: {A: "Nitrogen", B: "Ammonia", C: "Nitric Acid", D: "Hydrogen"}},
        { subject: "Biology", question: "Which enzyme relieves torsional strain?", correct_letter: "C", options: {A: "Helicase", B: "Primase", C: "DNA Gyrase", D: "Ligase"}},
        { subject: "Biology", question: "What removes introns from pre-mRNA?", correct_letter: "B", options: {A: "Ribosome", B: "Spliceosome", C: "Polymerase", D: "Ligase"}},
        { subject: "Biology", question: "Function of CRISPR in bacteria?", correct_letter: "D", options: {A: "Respiration", B: "Division", C: "Folding", D: "Adaptive immunity"}},
        { subject: "Biology", question: "Reverse transcriptase creates?", correct_letter: "A", options: {A: "DNA from RNA", B: "RNA from DNA", C: "Protein", D: "Lipids"}}
    ];
}

async function fetchQuestions(topic, count) {
    let combined = getStrictFallbacks();
    let finalSelection = [];

    if (topic && topic !== 'Random') {
        finalSelection = combined.filter(q => q.subject.toLowerCase() === topic.toLowerCase());
    } else {
        finalSelection = combined;
    }

    return finalSelection.sort(() => Math.random() - 0.5).slice(0, count);
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/questions', async (req, res) => {
    try {
        const topic = req.query.topic || 'Random';
        // Battle Mode (Random) gets 10, Interactive gets 5
        const count = (topic === 'Random') ? 10 : 5;
        const questions = await fetchQuestions(topic, count);
        res.json({ success: true, questions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/ask-models', async (req, res) => {
    try {
        const { question } = req.body;
        const results = await runSingleQuestion(question);
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default app;