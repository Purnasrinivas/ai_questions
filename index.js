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
    models: {
        claude: { id: "anthropic/claude-3-haiku" }, 
        gpt: { id: "openai/gpt-4o" }
    },
    // STRICTLY HONEST MODEL MAPPING
    arenaModels: [
        { id: "google/gemini-3.1-pro", name: "Gemini 3.1 Pro" },
        { id: "google/gemini-1.5-pro-latest", name: "Gemini 1.5 Pro" },
        { id: "openai/gpt-4o", name: "GPT-4o (Flagship)" },
        { id: "anthropic/claude-3-opus", name: "Claude 3 Opus (Flagship)" },
        { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku (Fast)" },
        { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3 70B" }
    ],
    systemPrompt: `You are taking a PhD-level multiple choice science exam (GPQA Diamond). You must respond in this EXACT JSON format and nothing else:
{
  "thinking": "Step 1...",
  "answer": "A",
  "reasoning": "..."
}`
};

function getStrictFallbacks() {
    return [
        { subject: "Physics", question: "In Quantum Chromodynamics (QCD), what happens to the strong coupling constant as the momentum transfer (Q^2) approaches infinity?", correct_letter: "C", explanation: "Asymptotic freedom.", options: {A: "It diverges to infinity", B: "It oscillates unpredictably", C: "It asymptotically approaches zero", D: "It stabilizes at the fine-structure constant"}},
        { subject: "Chemistry", question: "Which transition metal complex exhibits the strongest Jahn-Teller distortion?", correct_letter: "B", explanation: "High-spin d4 or d9 octahedral complexes exhibit the strongest Jahn-Teller distortions.", options: {A: "d3 octahedral", B: "d9 octahedral", C: "d5 high-spin octahedral", D: "d8 square planar"}},
        { subject: "Biology", question: "During CRISPR-Cas9 genome editing, what specific DNA repair mechanism is primarily responsible for generating gene knockouts via targeted indels?", correct_letter: "D", explanation: "NHEJ is error-prone and causes indels.", options: {A: "Homology-Directed Repair (HDR)", B: "Mismatch Repair (MMR)", C: "Base Excision Repair (BER)", D: "Non-Homologous End Joining (NHEJ)"}},
        { subject: "Physics", question: "According to the AdS/CFT correspondence, a theory of quantum gravity in Anti-de Sitter (AdS) space is dual to what type of theory on its boundary?", correct_letter: "A", explanation: "Conformal Field Theory.", options: {A: "A Conformal Field Theory (CFT) without gravity", B: "A String Theory with 11 dimensions", C: "A Loop Quantum Gravity (LQG) framework", D: "A classical thermodynamic system"}},
        { subject: "Chemistry", question: "In total synthesis, what is the primary purpose of a Sharpless asymmetric epoxidation?", correct_letter: "C", explanation: "It converts primary/secondary allylic alcohols into epoxy alcohols.", options: {A: "Cleavage of vicinal diols", B: "Reduction of alkynes to trans-alkenes", C: "Enantioselective epoxidation of allylic alcohols", D: "Coupling of aryl halides with boronic acids"}},
        { subject: "Biology", question: "Which class of transposable elements utilizes a 'copy and paste' mechanism requiring a reverse transcriptase intermediate?", correct_letter: "A", explanation: "Class I retrotransposons use RNA intermediates.", options: {A: "Class I (Retrotransposons)", B: "Class II (DNA Transposons)", C: "Insertion Sequences (IS)", D: "Miniature Inverted-repeat Transposable Elements (MITEs)"}}
    ];
}

function scoreAnswer(modelAnswerStr, correctLetter) {
    try {
        let clean = (modelAnswerStr || "{}").replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(clean);
        return {
            correct: parsed.answer?.trim().toUpperCase().charAt(0) === correctLetter,
            answer: parsed.answer || "N/A",
            thinking: parsed.thinking || "...",
            reasoning: parsed.reasoning || ""
        };
    } catch (e) {
        return { correct: false, answer: "ERR", thinking: "Parse Error", reasoning: "" };
    }
}

async function callOpenRouter(modelId, prompt) {
    try {
        const res = await fetch(config.openRouterUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'system', content: config.systemPrompt }, { role: 'user', content: prompt }]
            })
        });
        const data = await res.json();
        return data.choices[0].message.content;
    } catch (err) {
        return JSON.stringify({ answer: "ERR" });
    }
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/questions', (req, res) => {
    const topic = req.query.topic || 'Random';
    let bank = getStrictFallbacks();
    let filtered = topic === 'Random' ? bank : bank.filter(q => q.subject === topic);
    res.json({ success: true, questions: filtered.sort(() => Math.random() - 0.5) });
});

app.get('/api/models', (req, res) => res.json({ success: true, models: config.arenaModels }));

app.post('/api/ask-models', async (req, res) => {
    const { question } = req.body;
    const prompt = `Subject: ${question.subject}\nQuestion: ${question.question}\nA) ${question.options.A}\nB) ${question.options.B}\nC) ${question.options.C}\nD) ${question.options.D}`;
    const [claudeRes, gptRes] = await Promise.all([callOpenRouter(config.models.claude.id, prompt), callOpenRouter(config.models.gpt.id, prompt)]);
    res.json({ success: true, results: { claude: scoreAnswer(claudeRes, question.correct_letter), gpt: scoreAnswer(gptRes, question.correct_letter) }});
});

app.post('/api/battle', async (req, res) => {
    const { modelAId, modelBId, question } = req.body;
    const prompt = `Subject: ${question.subject}\nQuestion: ${question.question}\nA) ${question.options.A}\nB) ${question.options.B}\nC) ${question.options.C}\nD) ${question.options.D}`;
    const [resA, resB] = await Promise.all([callOpenRouter(modelAId, prompt), callOpenRouter(modelBId, prompt)]);
    res.json({ success: true, results: { modelA: scoreAnswer(resA, question.correct_letter), modelB: scoreAnswer(resB, question.correct_letter) }});
});

app.listen(3000, () => console.log(`🚀 Server on http://localhost:3000`));