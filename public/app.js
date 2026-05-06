let currentCaptchaStr = "";
let failedAttempts = 0; 

document.addEventListener('DOMContentLoaded', () => {
    initCaptcha();

    document.getElementById('refreshCaptcha').addEventListener('click', () => {
        initCaptcha();
    });
    
    document.getElementById('verifyCaptchaBtn').addEventListener('click', verifyCaptcha);
    
    document.getElementById('captchaInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') verifyCaptcha();
    });

    // Reset input style on type
    document.getElementById('captchaInput').addEventListener('input', function() {
        this.classList.remove('jiggle');
        document.getElementById('captchaError').classList.add('hidden');
    });
});

function initCaptcha() {
    const canvas = document.getElementById('captchaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mixed case charset
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    currentCaptchaStr = "";
    const captchaLength = 7; 
    for (let i = 0; i < captchaLength; i++) {
        currentCaptchaStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Background Distortions
    for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(${Math.random()*100}, ${Math.random()*150}, 255, ${Math.random() * 0.2})`;
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    const fonts = ["Courier New", "Georgia", "Impact", "Verdana"];
    for (let i = 0; i < currentCaptchaStr.length; i++) {
        const char = currentCaptchaStr[i];
        ctx.save();
        const xPos = 40 + (i * 38);
        const yPos = 50 + (Math.random() * 20 - 10); 
        ctx.translate(xPos, yPos);
        ctx.rotate((Math.random() - 0.5) * 0.9);
        
        // Random scale for extra difficulty
        const scale = 0.8 + Math.random() * 0.4;
        ctx.scale(scale, scale);

        ctx.font = `bold 36px ${fonts[Math.floor(Math.random() * fonts.length)]}`;
        ctx.fillStyle = i % 2 === 0 ? '#58a6ff' : '#ffffff';
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        
        ctx.fillText(char, -15, 0); 
        ctx.restore();
    }

    const inputField = document.getElementById('captchaInput');
    inputField.value = "";
    inputField.style.textTransform = "none"; // Ensure CSS doesn't override the look
}

function verifyCaptcha() {
    const inputField = document.getElementById('captchaInput');
    const input = inputField.value.trim();
    const box = document.getElementById('captchaBox');
    const errorTxt = document.getElementById('captchaError');
    const btn = document.getElementById('verifyCaptchaBtn');

    // Case-sensitive check
    if (input === currentCaptchaStr) {
        failedAttempts = 0;
        if (failedAttempts === 0) {
            btn.innerText = "Access Granted. You're remarkably sharp!";
            btn.style.background = "#238636";
        }
        
        btn.classList.add('verified');
        setTimeout(() => {
            document.getElementById('captchaScreen').classList.add('hidden');
            document.getElementById('landingPage').classList.remove('hidden');
        }, 800);
    } else {
        failedAttempts++;
        errorTxt.classList.remove('hidden');
        
        if (failedAttempts >= 3) {
            errorTxt.innerText = "⚠️ Protocol Error: I'm beginning to doubt your biological origin...";
            errorTxt.style.color = "#ff7b72";
        } else {
            errorTxt.innerText = "Cognition mismatch. Check your case and try again.";
        }

        // Visual feedback for error
        inputField.classList.add('jiggle');
        initCaptcha(); 
    }
}

// --- CORE APP LOGIC ---
let questions = [];
let currentQIndex = 0;
let scores = { human: 0, claude: 0, gpt: 0 };
let appMode = 'interactive';
let isLocked = false;
let humanSelection = null;

window.updateThinkVisibility = (m) => {
    const mCap = m.charAt(0).toUpperCase() + m.slice(1);
    const isChecked = document.getElementById(`toggle${mCap}`)?.checked;
    const thinkBox = document.getElementById(`thinkBox${mCap}`);
    if (thinkBox) {
        isChecked ? thinkBox.classList.remove('hidden') : thinkBox.classList.add('hidden');
    }
};

async function initApp(mode) {
    appMode = mode;
    currentQIndex = 0;
    scores = { human: 0, claude: 0, gpt: 0 };
    humanSelection = null;
    isLocked = false;

    const selectedTopic = (mode === 'interactive') ? document.getElementById('topicDropdown').value : 'Random';

    document.getElementById('landingPage')?.classList.add('hidden');
    document.getElementById('mainApp')?.classList.remove('hidden');
    document.getElementById('verdictSection')?.classList.add('hidden');
    
    if (document.getElementById('scoreHuman')) document.getElementById('scoreHuman').innerText = '0';
    if (document.getElementById('scoreClaude')) document.getElementById('scoreClaude').innerText = '0';
    if (document.getElementById('scoreGpt')) document.getElementById('scoreGpt').innerText = '0';

    document.getElementById('humanScoreCard')?.classList.toggle('hidden', mode === 'battle');

    try {
        const res = await fetch(`/api/questions?topic=${selectedTopic}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to load questions");
        questions = data.questions;
        loadQuestion();
    } catch (err) { alert("Data Fetch Error: " + err.message); }
}

function loadQuestion() {
    isLocked = false;
    humanSelection = null;
    const q = questions[currentQIndex];
    
    document.getElementById('truthSection')?.classList.add('hidden');
    document.getElementById('humanResult')?.classList.add('hidden');
    document.getElementById('nextBtn')?.classList.add('hidden');
    
    ['claude', 'gpt'].forEach(m => {
        const mCap = m.charAt(0).toUpperCase() + m.slice(1);
        const statusEl = document.getElementById(`status${mCap}`);
        if (statusEl) statusEl.innerText = appMode === 'battle' ? "⚡ Racing..." : "⏳ Awaiting Input...";
        
        document.getElementById(`status${mCap}`)?.classList.remove('hidden');
        document.getElementById(`data${mCap}`)?.classList.add('hidden');
        document.getElementById(`thinkBox${mCap}`)?.classList.add('hidden');
    });

    if (document.getElementById('questionTracker')) {
        document.getElementById('questionTracker').innerText = `Question ${currentQIndex + 1} of ${questions.length} · ${q.subject}`;
    }
    if (document.getElementById('qText')) document.getElementById('qText').innerText = q.question;
    if (document.getElementById('progressFill')) {
        document.getElementById('progressFill').style.width = `${(currentQIndex / questions.length) * 100}%`;
    }
    
    const optsDiv = document.getElementById('qOptions');
    if (optsDiv) {
        optsDiv.innerHTML = '';
        ['A', 'B', 'C', 'D'].forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<strong>${letter})</strong> ${q.options[letter]}`;
            
            if (appMode === 'interactive') {
                btn.onclick = () => {
                    if (isLocked) return;
                    humanSelection = letter;
                    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    const nextBtn = document.getElementById('nextBtn');
                    if (nextBtn) {
                        nextBtn.classList.remove('hidden');
                        nextBtn.innerText = "Submit Answer & Evaluate AI ▶";
                        nextBtn.onclick = runEvaluation;
                    }
                };
            } else {
                btn.style.cursor = "default";
            }
            optsDiv.appendChild(btn);
        });
    }

    if (appMode === 'battle') {
        setTimeout(runEvaluation, 1000);
    }
}

async function runEvaluation() {
    if (isLocked) return;
    isLocked = true;

    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    document.getElementById('nextBtn')?.classList.add('hidden');

    ['claude', 'gpt'].forEach(m => {
        const mCap = m.charAt(0).toUpperCase() + m.slice(1);
        if (document.getElementById(`status${mCap}`)) {
            document.getElementById(`status${mCap}`).innerText = "🧠 Analyzing logic...";
        }
    });

    try {
        const res = await fetch('/api/ask-models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: questions[currentQIndex] })
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message || "Unknown backend error");
        revealResults(data.results);
    } catch (err) {
        console.error("Evaluation error", err);
        isLocked = false;
        alert("Model evaluation failed: " + err.message);
    }
}

function revealResults(results) {
    const q = questions[currentQIndex];

    ['claude', 'gpt'].forEach(m => {
        const res = results[m];
        const mCap = m.charAt(0).toUpperCase() + m.slice(1);
        
        document.getElementById(`status${mCap}`)?.classList.add('hidden');
        document.getElementById(`data${mCap}`)?.classList.remove('hidden');
        
        const thinkBox = document.getElementById(`thinkBox${mCap}`);
        if (thinkBox) {
            thinkBox.innerText = res.thinking;
            if (document.getElementById(`toggle${mCap}`)?.checked) thinkBox.classList.remove('hidden');
        }
        
        let ansHTML = `${res.answer} ${res.correct ? '✅' : '❌'}`;
        if (!res.correct && res.confidence >= 80) ansHTML += ` <span class="hallucination-tag">Hallucination</span>`;
        
        if (document.getElementById(`ans${mCap}`)) document.getElementById(`ans${mCap}`).innerHTML = ansHTML;
        if (document.getElementById(`conf${mCap}`)) document.getElementById(`conf${mCap}`).innerText = res.confidence;
        if (document.getElementById(`reason${mCap}`)) document.getElementById(`reason${mCap}`).innerText = res.reasoning;

        if (res.correct) {
            scores[m]++;
            if (document.getElementById(`score${mCap}`)) document.getElementById(`score${mCap}`).innerText = scores[m];
        }
    });

    document.getElementById('truthSection')?.classList.remove('hidden');
    if (document.getElementById('correctLetter')) document.getElementById('correctLetter').innerText = q.correct_letter;
    if (document.getElementById('explanationText')) document.getElementById('explanationText').innerText = q.explanation;
    
    const searchQuery = encodeURIComponent(q.question);
    if (document.getElementById('learnMoreLink')) document.getElementById('learnMoreLink').href = `https://www.google.com/search?q=${searchQuery}`;

    if (appMode === 'interactive') {
        const isCorrect = (humanSelection === q.correct_letter);
        if (isCorrect) scores.human++;
        if (document.getElementById('scoreHuman')) document.getElementById('scoreHuman').innerText = scores.human;
        
        const hRes = document.getElementById('humanResult');
        if (hRes) {
            hRes.classList.remove('hidden');
            hRes.className = `human-feedback ${isCorrect ? 'correct' : 'wrong'}`;
            hRes.innerHTML = isCorrect ? `🎉 Correct! You matched the PhD standard.` : `❌ Incorrect. The correct answer was ${q.correct_letter}.`;
        }
        
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.classList.remove('hidden');
            nextBtn.innerText = "Next Question ▶";
            nextBtn.onclick = nextStep;
        }
    } else {
        setTimeout(nextStep, 2500); 
    }

    if (document.getElementById('progressFill')) {
        document.getElementById('progressFill').style.width = `${((currentQIndex + 1) / questions.length) * 100}%`;
    }
}

function nextStep() {
    currentQIndex++;
    if (currentQIndex < questions.length) {
        loadQuestion();
    } else {
        showFinalVerdict();
    }
}

function showFinalVerdict() {
    document.getElementById('activeSection')?.classList.add('hidden');
    document.getElementById('verdictSection')?.classList.remove('hidden');
    if (document.getElementById('verdictText')) {
        document.getElementById('verdictText').innerText = `Tournament Complete! \n Claude: ${scores.claude}/${questions.length} | GPT: ${scores.gpt}/${questions.length} ${appMode === 'interactive' ? `| You: ${scores.human}/${questions.length}` : ''}`;
    }
}