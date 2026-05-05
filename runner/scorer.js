export function scoreAnswer(modelAnswerStr, correctLetter) {
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