document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 0. CAPTCHA SECURITY GATEWAY (MAX DIFFICULTY)
    // ==========================================
    const canvas = document.getElementById('captchaCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const input = document.getElementById('captchaInput');
    const msg = document.getElementById('captchaMessage');
    let currentCaptchaText = "";
    let captchaAttempts = 0;

    function generateCaptcha() {
        if (!ctx) return; 
        
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; 
        currentCaptchaText = "";
        
        // 1. Clear Canvas to dark background
        ctx.fillStyle = "#090c10";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Heavy Background Noise (Static Dots)
        for (let i = 0; i < 150; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Curving Interference Lines (Bezier Curves)
        for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`;
            ctx.lineWidth = Math.random() * 2.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.bezierCurveTo(
                Math.random() * canvas.width, Math.random() * canvas.height,
                Math.random() * canvas.width, Math.random() * canvas.height,
                Math.random() * canvas.width, Math.random() * canvas.height
            );
            ctx.stroke();
        }

        // 4. Distorted, Overlapping Text
        const fonts = ["sans-serif", "serif", "monospace", "Georgia", "Courier New"];
        ctx.textBaseline = "middle";

        for (let i = 0; i < 6; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            currentCaptchaText += char;
            
            // Randomize font family and size for every single letter
            const fontSize = Math.floor(Math.random() * 15 + 35); 
            ctx.font = `bold ${fontSize}px ${fonts[Math.floor(Math.random() * fonts.length)]}`;
            ctx.fillStyle = `hsl(${Math.random() * 360}, 80%, 65%)`;
            
            ctx.save();
            
            // Tighter X spacing to force characters to overlap slightly
            const x = 35 + (i * 32);
            const y = 40 + (Math.random() * 10 - 5);
            ctx.translate(x, y);
            
            // Skew / Shear Effect (Makes OCR software cry)
            const skewX = (Math.random() - 0.5) * 0.5;
            const skewY = (Math.random() - 0.5) * 0.1;
            ctx.transform(1, skewY, skewX, 1, 0, 0);

            // Aggressive Rotation
            ctx.rotate((Math.random() - 0.5) * 0.9); 
            
            ctx.fillText(char, -15, 0);
            
            // Randomly draw an outline instead of a solid fill for extra confusion
            if (Math.random() > 0.7) {
                ctx.strokeStyle = "rgba(255,255,255,0.8)";
                ctx.lineWidth = 1;
                ctx.strokeText(char, -15, 0);
            }

            ctx.restore();
        }
        
        input.value = "";
    }

    const refreshBtn = document.getElementById('refreshCaptcha');
    if (refreshBtn) refreshBtn.addEventListener('click', generateCaptcha);

    const verifyBtn = document.getElementById('verifyCaptchaBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            // Strict case-sensitive comparison
            const userValue = input.value.trim();
            
            if (userValue === currentCaptchaText) {
                msg.classList.remove('hidden');
                msg.style.color = "var(--success)";
                input.style.borderColor = "var(--success)";
                
                if (captchaAttempts === 0) {
                    msg.innerText = "Yeah, you're really genius. I'm looking forward to your test.";
                } else {
                    msg.innerText = "Humanity verified. Access granted.";
                }

                setTimeout(() => {
                    document.getElementById('view-captcha').classList.add('hidden');
                    document.getElementById('main-menu').classList.remove('hidden');
                    initModels(); 
                }, 1500);

            } else {
                captchaAttempts++;
                msg.classList.remove('hidden');
                msg.style.color = "var(--error)";
                input.style.borderColor = "var(--error)";
                
                input.classList.remove('jiggle');
                void input.offsetWidth; 
                input.classList.add('jiggle');

                if (captchaAttempts >= 3) {
                    msg.innerText = "I started to doubt that you're human. Try again.";
                } else {
                    msg.innerText = "Incorrect code. Humans only.";
                }
                
                generateCaptcha(); 
            }
        });
    }

    generateCaptcha();


    // ==========================================
    // 1. LOAD MODELS
    // ==========================================
    async function initModels() {
        try {
            const res = await fetch('/api/models');
            const data = await res.json();
            const selA = document.getElementById('selA');
            const selB = document.getElementById('selB');
            
            selA.innerHTML = ''; selB.innerHTML = '';

            data.models.forEach((m) => {
                const isGemini31 = m.name === "Gemini 3.1 Pro";
                const isGPT = m.name.includes("GPT-4o");
                selA.innerHTML += `<option value="${m.id}" ${isGemini31 ? 'selected' : ''}>${m.name}</option>`;
                selB.innerHTML += `<option value="${m.id}" ${isGPT ? 'selected' : ''}>${m.name}</option>`;
            });
        } catch(e) { console.error("Failed to load models"); }
    }


    // ==========================================
    // 2. TEST YOUR KNOWLEDGE (HUMAN VS AI)
    // ==========================================
    let benchQ = [], benchIdx = 0, benchScores = { h: 0, c: 0, g: 0 };

    document.getElementById('startBenchBtn').addEventListener('click', async () => {
        const sub = document.getElementById('subjectSelect').value;
        const btn = document.getElementById('startBenchBtn');
        btn.innerText = "Loading Questions..."; btn.disabled = true;

        try {
            const res = await fetch(`/api/questions?topic=${sub}`);
            const data = await res.json();
            benchQ = data.questions; benchIdx = 0; benchScores = { h: 0, c: 0, g: 0 };
            
            document.getElementById('score-h').innerText = 0; 
            document.getElementById('score-c').innerText = 0; 
            document.getElementById('score-g').innerText = 0;
            
            document.getElementById('main-menu').classList.add('hidden'); 
            document.getElementById('bench-active').classList.remove('hidden');
            renderQuestion();
        } catch(e) { alert("Error loading questions. Check your terminal."); }
        
        btn.innerText = "Start Quiz"; btn.disabled = false;
    });

    function renderQuestion() {
        const q = benchQ[benchIdx];
        document.getElementById('progressFill').style.width = `${(benchIdx/benchQ.length)*100}%`;
        document.getElementById('q-container').innerHTML = `
            <div class="question-header"><h3>${q.subject}</h3><h3 style="color:#8b949e">Q ${benchIdx+1}/${benchQ.length}</h3></div>
            <h2>${q.question}</h2>
            <div class="interactive-options">
                ${['A','B','C','D'].filter(l => q.options[l]).map(l => `<button class="option-btn" data-ans="${l}">${l}) ${q.options[l]}</button>`).join('')}
            </div>
        `;
        document.getElementById('feedback-area').classList.add('hidden');

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', function() { submitBench(this.getAttribute('data-ans'), this); });
        });
    }

    async function submitBench(ans, clickedBtn) {
        document.querySelectorAll('#bench-active .option-btn').forEach(b => { 
            b.disabled = true; if (b !== clickedBtn) b.style.opacity = '0.5'; 
        });
        clickedBtn.classList.add('selected');

        const feedbackArea = document.getElementById('feedback-area');
        feedbackArea.innerHTML = '<div class="status-text" style="text-align:center; margin-top:20px;">AI Models are thinking... Please wait.</div>';
        feedbackArea.classList.remove('hidden');

        const q = benchQ[benchIdx];
        const res = await fetch('/api/ask-models', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ question: q }) });
        const data = await res.json();
        const r = data.results;

        const isH = ans === q.correct_letter;
        if (isH) benchScores.h++; if (r.claude.correct) benchScores.c++; if (r.gpt.correct) benchScores.g++;
        
        document.getElementById('score-h').innerText = benchScores.h; 
        document.getElementById('score-c').innerText = benchScores.c; 
        document.getElementById('score-g').innerText = benchScores.g;

        feedbackArea.innerHTML = `
            <div class="human-feedback ${isH ? 'correct' : 'wrong'}">${isH ? '✅ Correct!' : `❌ Incorrect. You chose ${ans}.`}</div>
            <div class="truth-box"><h2 style="color:var(--success); margin-top:0;">The Truth</h2><p style="color:#c9d1d9; margin:0;">Answer: ${q.correct_letter}) ${q.options[q.correct_letter]}<br><br>${q.explanation || ''}</p></div>
            <div class="model-grid">
                <div class="model-card claude"><h3>Claude</h3><div class="big-answer" style="color: ${r.claude.correct ? 'var(--success)' : 'var(--error)'}">${r.claude.correct ? '✅' : '❌'} Chose ${r.claude.answer}</div><button class="think-btn" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Logic</button><div class="thinking-box hidden">${r.claude.reasoning}</div></div>
                <div class="model-card gpt"><h3>GPT-4o</h3><div class="big-answer" style="color: ${r.gpt.correct ? 'var(--success)' : 'var(--error)'}">${r.gpt.correct ? '✅' : '❌'} Chose ${r.gpt.answer}</div><button class="think-btn" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Logic</button><div class="thinking-box hidden">${r.gpt.reasoning}</div></div>
            </div>
            <button id="nextBtn" class="action-btn" style="margin-top: 30px;">Next Question ▶</button>
        `;

        document.getElementById('nextBtn').addEventListener('click', () => {
            benchIdx++;
            if (benchIdx < benchQ.length) renderQuestion();
            else document.getElementById('bench-active').innerHTML = `<div class="verdict-box"><h2>Quiz Complete!</h2><p>Final Score: You (${benchScores.h}) | Claude (${benchScores.c}) | GPT-4o (${benchScores.g})</p><button class="primary-btn" onclick="location.reload()" style="margin-top:20px;">Return to Main Menu</button></div>`;
        });
    }

    // ==========================================
    // 3. SEE WHICH MODEL IS BEST (AI VS AI)
    // ==========================================
    let arenaQ = [], arenaScores = { A: 0, B: 0 };

    document.getElementById('startDebateBtn').addEventListener('click', async () => {
        const btn = document.getElementById('startDebateBtn');
        btn.innerText = "Initializing Battle..."; btn.disabled = true;

        try {
            const res = await fetch(`/api/questions?topic=Random`);
            const data = await res.json();
            arenaQ = data.questions;
            arenaScores = { A: 0, B: 0 };

            const selA = document.getElementById('selA');
            const selB = document.getElementById('selB');
            const nameA = selA.options[selA.selectedIndex].text;
            const nameB = selB.options[selB.selectedIndex].text;

            document.getElementById('arena-name-A').innerText = nameA;
            document.getElementById('arena-name-B').innerText = nameB;
            document.getElementById('arena-score-A').innerText = 0;
            document.getElementById('arena-score-B').innerText = 0;

            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('arena-active').classList.remove('hidden');

            runAutoDebate(nameA, nameB);
        } catch(e) { alert("Error starting battle. Check terminal."); }

        btn.innerText = "⚔️ Watch Battle"; btn.disabled = false;
    });

    async function runAutoDebate(nameA, nameB) {
        for (let i = 0; i < arenaQ.length; i++) {
            await runArenaRound(i, nameA, nameB);
            if (i < arenaQ.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }

        document.getElementById('arena-active').innerHTML += `
            <div class="verdict-box fade-in-delayed" style="margin-top: 30px;">
                <h2>Battle Complete!</h2>
                <p style="font-size: 1.2em; color: white;">Final Score:</p>
                <p style="color: #8b949e; font-size: 1.1em;">${nameA} (${arenaScores.A}) VS ${nameB} (${arenaScores.B})</p>
                <button class="primary-btn" onclick="location.reload()" style="margin-top: 20px;">Return to Main Menu</button>
            </div>
        `;
    }

    async function runArenaRound(idx, nameA, nameB) {
        const q = arenaQ[idx];
        document.getElementById('arenaProgressFill').style.width = `${((idx+1)/arenaQ.length)*100}%`;
        document.getElementById('arena-q-container').innerHTML = `
            <div class="question-header"><h3>${q.subject}</h3><h3 style="color:#8b949e">Round ${idx+1}/${arenaQ.length}</h3></div>
            <h2>${q.question}</h2>
            <p style="color:#8b949e; margin-top:15px; font-size: 1.1em; line-height: 1.6;">
                A) ${q.options.A} <br> B) ${q.options.B} <br> C) ${q.options.C} <br> D) ${q.options.D}
            </p>
        `;

        const resultsDiv = document.getElementById('arena-results');
        resultsDiv.innerHTML = `<p style="text-align:center; width:100%; color:#8b949e; font-style: italic;">Models are computing answers...</p>`;
        resultsDiv.classList.remove('hidden');

        const res = await fetch('/api/battle', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ modelAId: document.getElementById('selA').value, modelBId: document.getElementById('selB').value, question: q })
        });
        const data = await res.json();
        const r = data.results;

        if (r.modelA.correct) arenaScores.A++;
        if (r.modelB.correct) arenaScores.B++;

        document.getElementById('arena-score-A').innerText = arenaScores.A;
        document.getElementById('arena-score-B').innerText = arenaScores.B;

        resultsDiv.innerHTML = `
            <div class="model-card ${r.modelA.correct ? 'gpt' : 'claude'}" style="border-top-color: ${r.modelA.correct ? 'var(--success)' : 'var(--error)'}">
                <h3>${nameA}</h3>
                <div class="big-answer" style="color: ${r.modelA.correct ? 'var(--success)' : 'var(--error)'}">${r.modelA.correct ? '✅' : '❌'} Chose ${r.modelA.answer}</div>
                <div class="reason" style="margin-top:15px; font-size:0.9em; color:#8b949e;">${r.modelA.reasoning}</div>
            </div>
            <div class="model-card ${r.modelB.correct ? 'gpt' : 'claude'}" style="border-top-color: ${r.modelB.correct ? 'var(--success)' : 'var(--error)'}">
                <h3>${nameB}</h3>
                <div class="big-answer" style="color: ${r.modelB.correct ? 'var(--success)' : 'var(--error)'}">${r.modelB.correct ? '✅' : '❌'} Chose ${r.modelB.answer}</div>
                <div class="reason" style="margin-top:15px; font-size:0.9em; color:#8b949e;">${r.modelB.reasoning}</div>
            </div>
        `;
    }
});