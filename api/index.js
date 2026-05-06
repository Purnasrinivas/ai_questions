import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// --- 1. CONFIGURATION ---
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

// --- 2. SCORER LOGIC ---
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

// --- 3. AI EXPERIMENT LOGIC ---
async function callOpenRouter(modelId, prompt, retries = 1) {
    if (!modelId) return JSON.stringify({ answer: "ERR", confidence: 0, thinking: "Model ID missing in config.", reasoning: "Backend error." });
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
        return JSON.stringify({ answer: "ERR", confidence: 0, thinking: "Request timed out.", reasoning: err.message });
    }
}

async function runSingleQuestion(q) {
    const prompt = `Subject: ${q.subject}\nQuestion: ${q.question}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\nRespond only in the specified JSON format.`;
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

// --- 4. QUESTION FETCHER LOGIC ---
function getStrictFallbacks() {
    return [
        { subject: "Physics", question: "What is the primary implication of Bell's Theorem?", correct_letter: "A", explanation: "It proves quantum mechanics relies on non-locality.", options: {A: "Non-local hidden variables", B: "Faster than light travel", C: "Cat states", D: "Measurement error"}},
        { subject: "Physics", question: "Hawking radiation is primarily caused by?", correct_letter: "C", explanation: "Quantum fluctuations at the event horizon.", options: {A: "Black hole explosions", B: "Nuclear fusion", C: "Quantum fluctuations at the horizon", D: "Dark matter decay"}},
        { subject: "Physics", question: "What defines a topological insulator?", correct_letter: "D", explanation: "It behaves as an insulator in its interior but conducts on its surface.", options: {A: "Total vacuum", B: "Superconductivity", C: "Metallic bulk", D: "Insulating bulk, conducting surface"}},
        { subject: "Physics", question: "What is a characteristic of the Zeeman effect?", correct_letter: "A", explanation: "The splitting of a spectral line into several components in the presence of a static magnetic field.", options: {A: "Spectral line splitting in a B-field", B: "Color change", C: "Mass increase", D: "Velocity shift"}},
        { subject: "Physics", question: "In Compton scattering, what happens to the scattered photon?", correct_letter: "B", explanation: "It loses energy and its wavelength increases.", options: {A: "Wavelength decreases", B: "Wavelength increases", C: "It converts to an electron", D: "It travels faster"}},
        { subject: "Physics", question: "The Aharonov-Bohm effect demonstrates the physical significance of?", correct_letter: "C", explanation: "Electromagnetic potentials over fields in quantum mechanics.", options: {A: "Gravity", B: "Strong force", C: "Electromagnetic potentials", D: "Dark energy"}},
        { subject: "Physics", question: "Noether's theorem states that every differentiable symmetry of the action of a physical system generates:", correct_letter: "A", explanation: "A corresponding conservation law.", options: {A: "A conservation law", B: "A new particle", C: "A singularity", D: "Time dilation"}},
        { subject: "Chemistry", question: "What is the thermodynamic consequence of the Jahn-Teller effect?", correct_letter: "B", explanation: "Geometric distortion to lower the symmetry and energy.", options: {A: "Spin pairing", B: "Geometric distortion", C: "Symmetry stability", D: "d-d suppression"}},
        { subject: "Chemistry", question: "Identify the strongest Bronsted acid among the following.", correct_letter: "A", explanation: "HClO4 is the strongest due to resonance stabilization of its conjugate base.", options: {A: "HClO4", B: "H2SO4", C: "HCl", D: "HNO3"}},
        { subject: "Chemistry", question: "The primary chemical byproduct of the Haber process is?", correct_letter: "B", explanation: "The process combines nitrogen and hydrogen to produce ammonia.", options: {A: "Nitrogen", B: "Ammonia", C: "Nitric Acid", D: "Hydrogen"}},
        { subject: "Chemistry", question: "What does Le Chatelier's Principle predict?", correct_letter: "C", explanation: "A system at equilibrium will shift to counteract a change.", options: {A: "Energy conservation", B: "Electron spin", C: "System opposes change", D: "Gas expansion"}},
        { subject: "Biology", question: "Which enzyme relieves torsional strain ahead of the replication fork?", correct_letter: "C", explanation: "DNA Gyrase reduces supercoiling.", options: {A: "Helicase", B: "Primase", C: "DNA Gyrase", D: "Ligase"}},
        { subject: "Biology", question: "What is the primary function of the spliceosome?", correct_letter: "B", explanation: "It removes introns from pre-mRNA.", options: {A: "Protein translation", B: "Intron removal", C: "5' Capping", D: "Polyadenylation"}},
        { subject: "Biology", question: "What is the biochemical role of reverse transcriptase?", correct_letter: "A", explanation: "It synthesizes DNA from an RNA template.", options: {A: "RNA to DNA transcription", B: "DNA to RNA transcription", C: "Protein synthesis", D: "Lipid breakdown"}},
        { subject: "Biology", question: "In its native bacterial environment, what is the function of CRISPR?", correct_letter: "D", explanation: "It acts as an adaptive immune system against phages.", options: {A: "Photosynthesis regulation", B: "Meiotic cell division", C: "Protein folding", D: "Adaptive viral defense"}}
    ];
}

async function fetchQuestions(topic) {
    let apiQuestions = [];
    try {
        const randomOffset = Math.floor(Math.random() * 50);
        const url = `https://datasets-server.huggingface.co/rows?dataset=Idavidrein%2Fgpqa&config=gpqa_diamond&split=train&offset=${randomOffset}&length=100`;
        const res = await fetch(url, { headers: { "Authorization": `Bearer ${config.hfToken}` } });
        if (res.ok) {
            const data = await res.json();
            apiQuestions = data.rows.map(item => {
                const row = item.row;
                const options = [row['Correct Answer'], row['Incorrect Answer 1'], row['Incorrect Answer 2'], row['Incorrect Answer 3']].sort(() => Math.random() - 0.5);
                return {
                    id: item.row_idx,
                    question: row['Question'],
                    subject: row['Subdomain'] || "Science",
                    emoji: "🔬",
                    options: { A: options[0], B: options[1], C: options[2], D: options[3] },
                    correct_letter: String.fromCharCode(65 + options.indexOf(row['Correct Answer'])),
                    explanation: row['Explanation']
                };
            });
        }
    } catch (err) {
        console.warn("API unreachable. Using fallbacks.");
    }

    let combined = [...apiQuestions, ...getStrictFallbacks()];
    let finalSelection = [];

    if (topic && topic !== 'Random') {
        let strictFiltered = combined.filter(q => q.subject.toLowerCase().includes(topic.toLowerCase()));
        let uniqueFiltered = Array.from(new Set(strictFiltered.map(q => q.question))).map(question => strictFiltered.find(q => q.question === question));
        finalSelection = uniqueFiltered.sort(() => Math.random() - 0.5).slice(0, 10);
    } else {
        let uniqueAll = Array.from(new Set(combined.map(q => q.question))).map(question => combined.find(q => q.question === question));
        finalSelection = uniqueAll.sort(() => Math.random() - 0.5).slice(0, 10);
    }
    return finalSelection;
}

// --- 5. EXPRESS ROUTING ---
const app = express();
app.use(express.json());

app.get('/api/questions', async (req, res) => {
    try {
        const topic = req.query.topic || 'Random';
        const questions = await fetchQuestions(topic);
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

// Vercel requires exporting the app directly
export default app;