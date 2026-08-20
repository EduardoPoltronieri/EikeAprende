// ESTADO DO JOGO E TIMERS
const STATE = {
    username: '',
    totalScore: 0,
    currentIsland: null,
    currentQuestionIndex: 0,
    quizQuestions: [],
    timerInterval: null,
    timeLeft: 0,
    timePerQuestion: 30,
    logs: []
};

const ADMIN_PASSWORD = "admin";

const ISLAND_TIMES = {
    1: 30, 2: 30, 3: 35, 4: 35, 5: 35, 6: 35
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => {
    
    // BOTÃO ENTRAR / EXPLORAR
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.getElementById('username');
            const name = input ? input.value.trim() : '';

            if (name === '') {
                alert('Por favor, digite seu nome de explorador!');
                return;
            }

            STATE.username = name;
            document.getElementById('display-username').innerText = STATE.username;
            
            const printName = document.getElementById('print-student-name');
            if (printName) printName.innerText = STATE.username;

            showScreen('screen-map');
        });
    }

    // ADMIN
    const btnOpenAdmin = document.getElementById('btn-open-admin');
    const btnAdminMap = document.getElementById('btn-admin-map');
    if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', authAdmin);
    if (btnAdminMap) btnAdminMap.addEventListener('click', authAdmin);

    // RESUMIR PROVA
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
        btnResume.addEventListener('click', () => {
            document.getElementById('modal-warning').style.display = 'none';
            document.getElementById('crime-tape-overlay').style.display = 'none';
            requestFullScreen();
            startQuestionTimer();
        });
    }

    // PRÓXIMA QUESTÃO
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            clearInterval(STATE.timerInterval);
            if (STATE.currentQuestionIndex < STATE.quizQuestions.length - 1) {
                STATE.currentQuestionIndex++;
                renderQuestion();
            } else {
                exitFullScreen();
                showScreen('screen-map');
            }
        });
    }

    // IMPRESSÃO PDF
    const btnPrint = document.getElementById('btn-print-map');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            const printList = document.getElementById('print-questions-list');
            if (printList) {
                printList.innerHTML = '';
                for (let i = 0; i < 20; i++) {
                    const q = generateIslandQuestions(Math.floor(Math.random() * 6) + 1, 1)[0];
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${q.text.replace('?', '_____')}</strong>`;
                    printList.appendChild(li);
                }
                window.print();
            }
        });
    }
});

function authAdmin() {
    const pass = prompt("Digite a senha do Administrador/Professor:");
    if (pass === ADMIN_PASSWORD) {
        showScreen('screen-admin');
        renderLocalLogs();
    } else if (pass !== null) {
        alert("Senha incorreta!");
    }
}

function startIsland(islandId) {
    STATE.currentIsland = islandId;
    STATE.timePerQuestion = ISLAND_TIMES[islandId] || 30;
    STATE.currentQuestionIndex = 0;
    STATE.quizQuestions = generateIslandQuestions(islandId, 12);
    
    const titleElem = document.getElementById('current-island-title');
    if (titleElem) titleElem.innerText = `Ilha ${islandId}`;

    requestFullScreen();
    showScreen('screen-quiz');
    renderQuestion();
}

function generateIslandQuestions(islandId, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
        let ans, txt;

        if (islandId === 1) {
            let n1 = Math.floor(Math.random() * 9) + 2;
            let n2 = Math.floor(Math.random() * 9) + 2;
            ans = n1 * n2; txt = `${n1} × ${n2} = ?`;
        } else if (islandId === 2) {
            let n2 = Math.floor(Math.random() * 8) + 2;
            let mult = Math.floor(Math.random() * 10) + 1;
            ans = mult; txt = `${n2 * mult} ÷ ${n2} = ?`;
        } else if (islandId === 3) {
            let n1 = Math.floor(Math.random() * 400) + 100;
            let n2 = Math.floor(Math.random() * n1);
            ans = n1 - n2; txt = `${n1} - ${n2} = ?`;
        } else if (islandId === 4) {
            let a = Math.floor(Math.random() * 10) + 1;
            let b = Math.floor(Math.random() * 5) + 1;
            let c = Math.floor(Math.random() * 20) + 5;
            ans = (a * b) + c; txt = `(${a} × ${b}) + ${c} = ?`;
        } else if (islandId === 5) {
            let perc = [10, 20, 50][Math.floor(Math.random() * 3)];
            let val = (Math.floor(Math.random() * 10) + 1) * 10;
            ans = (perc / 100) * val; txt = `${perc}% de ${val} = ?`;
        } else {
            let n1 = Math.floor(Math.random() * 50) + 10;
            let n2 = Math.floor(Math.random() * 50) + 10;
            let n3 = Math.floor(Math.random() * 20) + 1;
            ans = n1 + n2 - n3; txt = `${n1} + ${n2} - ${n3} = ?`;
        }

        const opts = new Set([ans]);
        while (opts.size < 4) {
            let fake = ans + (Math.floor(Math.random() * 6) + 1) * (Math.random() > 0.5 ? 1 : -1);
            if (fake >= 0) opts.add(fake);
        }
        list.push({ text: txt, answer: ans, options: Array.from(opts).sort(() => Math.random() - 0.5) });
    }
    return list;
}

function renderQuestion() {
    clearInterval(STATE.timerInterval);
    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    document.getElementById('question-counter').innerText = `Questão ${STATE.currentQuestionIndex + 1}/${STATE.quizQuestions.length}`;
    document.getElementById('question-text').innerText = q.text;
    document.getElementById('feedback-message').innerText = '';
    document.getElementById('btn-next').style.display = 'none';

    document.getElementById('progress-bar').style.width = `${((STATE.currentQuestionIndex) / STATE.quizQuestions.length) * 100}%`;

    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.type = 'button';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(btn, opt, q.answer);
        grid.appendChild(btn);
    });

    startQuestionTimer();
}

function startQuestionTimer() {
    clearInterval(STATE.timerInterval);
    STATE.timeLeft = STATE.timePerQuestion;
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = `${STATE.timeLeft}s`;

    STATE.timerInterval = setInterval(() => {
        STATE.timeLeft--;
        if (timerDisplay) timerDisplay.innerText = `${STATE.timeLeft}s`;

        if (STATE.timeLeft <= 0) {
            clearInterval(STATE.timerInterval);
            handleTimeOut();
        }
    }, 1000);
}

function handleTimeOut() {
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    document.getElementById('feedback-message').innerText = `⏰ TEMPO ESGOTADO! SEU BURRO, SEU POHA! (Resposta: ${q.answer})`;
    document.getElementById('feedback-message').style.color = 'var(--error-color)';

    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'inline-block';
    btnNext.innerText = (STATE.currentQuestionIndex === STATE.quizQuestions.length - 1) ? 'Finalizar Ilha 🏆' : 'Próxima Questão ➡️';
}

function checkAnswer(btn, selected, correct) {
    clearInterval(STATE.timerInterval);
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        document.getElementById('feedback-message').innerText = '✨ Resposta Correta! Mandou Bem!';
        document.getElementById('feedback-message').style.color = 'var(--success-color)';
        STATE.totalScore += 20;
        if (typeof confetti === 'function') confetti({ particleCount: 35 });
    } else {
        btn.classList.add('wrong');
        document.getElementById('feedback-message').innerText = `❌ SEU BURRO, SEU POHA! (Certa: ${correct})`;
        document.getElementById('feedback-message').style.color = 'var(--error-color)';
    }

    document.getElementById('quiz-score').innerText = STATE.totalScore;
    const mapScore = document.getElementById('map-score');
    if (mapScore) mapScore.innerText = STATE.totalScore;

    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'inline-block';
    btnNext.innerText = (STATE.currentQuestionIndex === STATE.quizQuestions.length - 1) ? 'Finalizar Ilha 🏆' : 'Próxima Questão ➡️';
}

// SISTEMA ANTIFRAUDE LOCAL
function logFraudEvent(eventType, details) {
    const entry = {
        time: new Date().toLocaleTimeString('pt-BR'),
        username: STATE.username || 'Aluno Anônimo',
        event_type: eventType,
        details: details
    };
    STATE.logs.unshift(entry);
}

function triggerAntiCheatAlert(message, type) {
    clearInterval(STATE.timerInterval);
    logFraudEvent(type, message);
    
    const tapeOverlay = document.getElementById('crime-tape-overlay');
    const modal = document.getElementById('modal-warning');
    const warningText = document.getElementById('warning-text');
    
    if (warningText) warningText.innerText = message;
    if (tapeOverlay) tapeOverlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
}

// DETECÇÃO DE SAÍDA E ATALHOS
document.addEventListener('fullscreenchange', () => {
    const isQuizActive = document.getElementById('screen-quiz').classList.contains('active');
    if (!document.fullscreenElement && isQuizActive) {
        triggerAntiCheatAlert("Saída do Modo Tela Cheia (Pressionou ESC/F11)", "SAIDA_TELA_CHEIA");
    }
});

document.addEventListener('visibilitychange', () => {
    const isQuizActive = document.getElementById('screen-quiz').classList.contains('active');
    if (document.hidden && isQuizActive) {
        triggerAntiCheatAlert("Troca de Aba / Minimizar ou uso de Google Lens", "TROCA_DE_ABA");
    }
});

document.addEventListener('contextmenu', (e) => {
    if (document.getElementById('screen-quiz').classList.contains('active')) {
        e.preventDefault();
        triggerAntiCheatAlert("Uso do Botão Direito do Mouse", "BOTAO_DIREITO");
    }
});

document.addEventListener('keydown', (e) => {
    if (document.getElementById('screen-quiz').classList.contains('active')) {
        if (e.key === 'F12' || (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 'i' || e.key === 's'))) {
            e.preventDefault();
            triggerAntiCheatAlert(`Tentativa do atalho: ${e.key.toUpperCase()}`, "TECLA_ATALHO");
        }
    }
});

// EXIBE LOGS NO PAINEL ADMIN SEM PRECISAR DE BANCO
function renderLocalLogs() {
    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;

    if (STATE.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma infração registrada nesta sessão.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    STATE.logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.time}</td>
            <td><strong>${log.username}</strong></td>
            <td><span class="tag-cheat">${log.event_type}</span></td>
            <td>${log.details}</td>
        `;
        tbody.appendChild(tr);
    });
}

function requestFullScreen() {
    const doc = document.documentElement;
    if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
}

function exitFullScreen() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}