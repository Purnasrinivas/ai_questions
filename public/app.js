// --- EXTREME CANVAS CAPTCHA LOGIC ---
let currentCaptchaStr = "";

document.addEventListener('DOMContentLoaded', () => {
    initCaptcha();

    document.getElementById('refreshCaptcha').addEventListener('click', initCaptcha);
    document.getElementById('verifyCaptchaBtn').addEventListener('click', verifyCaptcha);
    
    document.getElementById('captchaInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') verifyCaptcha();
    });
});

function initCaptcha() {
    const canvas = document.getElementById('captchaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mixed case charset (removed look-alikes like I, l, 1, 0, O)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    currentCaptchaStr = "";
    const captchaLength = 7; // 7 characters for brutal difficulty
    for (let i = 0; i < captchaLength; i++) {
        currentCaptchaStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 1. Heavy Noise Dots
    for (let i = 0; i < 150; i++) {
        ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, 255, ${Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. Swirling Bezier Curve Interference
    for (let i = 0; i < 12; i++) {
        ctx.strokeStyle = `rgba(${100 + Math.random()*155}, ${100 + Math.random()*155}, 255, 0.6)`;
        ctx.lineWidth = 1 + Math.random() * 4;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.bezierCurveTo(
            Math.random() * canvas.width, Math.random() * canvas.height,
            Math.random() * canvas.width, Math.random() * canvas.height,
            Math.random() * canvas.width, Math.random() * canvas.height
        );
        ctx.stroke();
    }

    // 3. Extreme Distorted Text Rendering
    const fonts = ["Courier New", "Georgia", "Impact", "Times New Roman", "Verdana"];
    
    for (let i = 0; i < currentCaptchaStr.length; i++) {
        const char = currentCaptchaStr[i];
        ctx.save();
        
        // Tighter spacing to force overlap
        const xPos = 35 + (i * 35) + (Math.random() * 15 - 7.5);
        const yPos = 50 + (Math.random() * 20 - 10); 
        ctx.translate(xPos, yPos);
        
        // Extreme Rotation (up to ~45 degrees)
        const rotAngle = (Math.random() - 0.5) * 1.5; 
        ctx.rotate(rotAngle);
        
        // Random Squishing/Stretching
        const scaleX = 0.7 + Math.random() * 0.6;
        const scaleY = 0.7 + Math.random() * 0.6;
        ctx.scale(scaleX, scaleY);
        
        // Random Font and Size per character
        const fontSize = 35 + Math.random() * 20;
        ctx.font = `bold ${fontSize}px ${fonts[Math.floor(Math.random() * fonts.length)]}`;
        
        // Colors that bleed into the background lines
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(88, 166, 255, 0.85)';
        
        // Confusing drop shadows
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = Math.random() * 6;
        ctx.shadowOffsetX = Math.random() * 4 - 2;
        ctx.shadowOffsetY = Math.random() * 4 - 2;

        ctx.fillText(char, -15, 0); 
        ctx.restore();
    }

    // Notice we DO NOT use text-transform uppercase in CSS anymore.
    document.getElementById('captchaInput').value = "";
    document.getElementById('captchaInput').style.textTransform = "none";
    document.getElementById('captchaError').classList.add('hidden');
    document.getElementById('captchaBox').classList.remove('jiggle');
}

function verifyCaptcha() {
    // REMOVED .toUpperCase(). The user must match exactly.
    const input = document.getElementById('captchaInput').value.trim();
    const box = document.getElementById('captchaBox');
    const errorTxt = document.getElementById('captchaError');

    if (input === currentCaptchaStr) {
        const btn = document.getElementById('verifyCaptchaBtn');
        btn.classList.add('verified');
        btn.innerText = "Access Granted";
        btn.style.background = "#3fb950";
        
        setTimeout(() => {
            document.getElementById('captchaScreen').classList.add('hidden');
            document.getElementById('landingPage').classList.remove('hidden');
        }, 600);
    } else {
        errorTxt.classList.remove('hidden');
        box.classList.remove('jiggle');
        void box.offsetWidth; 
        box.classList.add('jiggle');
        initCaptcha(); // Generate new hard one on failure
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
        document.getElementById('verdictText').innerText = `Tournament Complete! \n Claude: ${scores.claude}/10 | GPT: ${scores.gpt}/10 ${appMode === 'interactive' ? `| You: ${scores.human}/10` : ''}`;
    }
}