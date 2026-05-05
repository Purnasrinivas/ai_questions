import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function aggregateResults(results) {
    const finalScores = {};
    let winner = { name: '', score: -1 };

    for (const [model, data] of Object.entries(results)) {
        const correctCount = data.answers.filter(a => a.correct).length;
        const percentage = (correctCount / 10) * 100;
        
        finalScores[model] = { correct: correctCount, percentage };

        if (percentage > winner.score) {
            winner = { name: model, score: percentage };
        }
    }

    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify({ scores: finalScores, winner }, null, 2));
    
    return { scores: finalScores, winner };
}