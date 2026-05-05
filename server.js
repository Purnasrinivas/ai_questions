import express from 'express';
import { fetchQuestions } from './fetcher.js';
import { runSingleQuestion } from './experiment.js';

const app = express();

// Allow server to parse JSON bodies
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
        console.error(`❌ Backend Error:`, err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// CRITICAL FOR VERCEL: Export the app instead of using app.listen()
export default app;