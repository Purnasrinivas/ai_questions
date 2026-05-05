import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchQuestions } from './fetcher.js';
import { runSingleQuestion } from './experiment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, '../ui')));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Interactive Showdown running at http://localhost:${PORT}`));