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

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

// AVISO DE ILHA BLOQUEADA / INTERDITADA
function islandLockedAlert(islandId) {
    alert(`⛔ A Ilha ${islandId} está INTERDITADA temporariamente pelo Professor! Por favor, escolha a partir da Ilha 7.`);
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
});

// MODAL DE SELEÇÃO DO PDF
function openPdfModal() {
    document.getElementById('modal-pdf-select').style.display = 'flex';
}

function closePdfModal() {
    document.getElementById('modal-pdf-select').style.display = 'none';
}

function confirmGeneratePDF() {
    const select = document.getElementById('pdf-island-select');
    const islandId = parseInt(select.value, 10);
    closePdfModal();
    generatePrintablePDF(islandId);
}

// INJETA AS QUESTÕES FORMATADAS E IMPRIME O PDF
function generatePrintablePDF(islandId) {
    const questions = generateIslandQuestions(islandId, 8); // 8 Questões por folha estilo prova
    const printContainer = document.getElementById('print-questions-list');
    const printStudent = document.getElementById('print-student-name');
    const printGrade = document.getElementById('print-grade-name');
    const printTitle = document.getElementById('print-exam-title');

    // Determina o Ano com base na Ilha
    let gradeName = "1º Ano";
    if (islandId >= 4 && islandId <= 6) gradeName = "2º Ano";
    else if (islandId >= 7 && islandId <= 9) gradeName = "3º Ano";
    else if (islandId >= 10 && islandId <= 12) gradeName = "4º Ano";
    else if (islandId >= 13 && islandId <= 15) gradeName = "5º Ano";
    else if (islandId >= 16 && islandId <= 18) gradeName = "6º Ano";
    else if (islandId >= 19) gradeName = "Avançado";

    if (printStudent) printStudent.innerText = STATE.username ? STATE.username : "_____________________________________________";
    if (printGrade) printGrade.innerText = gradeName;
    if (printTitle) printTitle.innerText = `AVALIAÇÃO BIMESTRAL – MATEMÁTICA – ILHA ${islandId}`;

    if (printContainer) {
        printContainer.innerHTML = '';
        const labels = ['a', 'b', 'c', 'd', 'e'];

        questions.forEach((q, index) => {
            const item = document.createElement('div');
            item.className = 'print-question-item';

            let optionsHtml = '';
            q.options.slice(0, 5).forEach((opt, optIdx) => {
                optionsHtml += `<div class="print-option-item"><strong>${labels[optIdx]})</strong> ${opt}</div>`;
            });

            item.innerHTML = `
                <div class="print-question-header">
                    <strong>${index + 1}. (1,25)</strong> ${q.text}
                </div>
                <div class="print-options-grid">
                    ${optionsHtml}
                </div>
            `;
            printContainer.appendChild(item);
        });
    }

    // Executa a caixa de impressão/PDF do navegador
    setTimeout(() => {
        window.print();
    }, 300);
}

function openVideo(title, url) {
    document.getElementById('video-title').innerText = title;
    document.getElementById('youtube-player').src = url + "?autoplay=1";
    document.getElementById('modal-video').style.display = 'flex';
}

function closeVideoModal() {
    document.getElementById('youtube-player').src = "";
    document.getElementById('modal-video').style.display = 'none';
}

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
    STATE.timePerQuestion = 30;
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

        switch (islandId) {
            case 1: {
                let a = Math.floor(Math.random() * 10) + 1;
                let b = Math.floor(Math.random() * 10) + 1;
                ans = a + b; txt = `Resolva a operação de adição: ${a} + ${b} = ?`;
                break;
            }
            case 2: {
                let a = Math.floor(Math.random() * 10) + 10;
                let b = Math.floor(Math.random() * 9) + 1;
                ans = a - b; txt = `Calcule a diferença: ${a} - ${b} = ?`;
                break;
            }
            case 3: {
                let a = Math.floor(Math.random() * 10) + 1;
                ans = a + a; txt = `Qual é o valor do dobro do número ${a}?`;
                break;
            }
            case 4: {
                let a = Math.floor(Math.random() * 50) + 20;
                let b = Math.floor(Math.random() * 30) + 10;
                ans = a + b; txt = `Determine o resultado da soma: ${a} + ${b} = ?`;
                break;
            }
            case 5: {
                let base = [2, 3, 5][Math.floor(Math.random() * 3)];
                let mult = Math.floor(Math.random() * 9) + 1;
                ans = base * mult; txt = `Calcule o valor da multiplicação: ${base} × ${mult} = ?`;
                break;
            }
            case 6: {
                let mult = Math.floor(Math.random() * 20) + 1;
                let total = mult * 2;
                ans = mult; txt = `Qual é a metade exata do número ${total}?`;
                break;
            }
            case 7: {
                let a = Math.floor(Math.random() * 9) + 2;
                let b = Math.floor(Math.random() * 9) + 2;
                ans = a * b; txt = `Calcule o produto das dezenas: ${a} × ${b} = ?`;
                break;
            }
            case 8: {
                let b = Math.floor(Math.random() * 8) + 2;
                let mult = Math.floor(Math.random() * 9) + 1;
                ans = mult; txt = `Determine o quociente da divisão: ${b * mult} ÷ ${b} = ?`;
                break;
            }
            case 9: {
                let a = Math.floor(Math.random() * 500) + 150;
                let b = Math.floor(Math.random() * a);
                ans = a - b; txt = `Resolva a subtração com empréstimo: ${a} - ${b} = ?`;
                break;
            }
            case 10: {
                let a = Math.floor(Math.random() * 8) + 2;
                let b = Math.floor(Math.random() * 5) + 1;
                let c = Math.floor(Math.random() * 15) + 5;
                ans = (a * b) + c; txt = `Considere a expressão numérica: (${a} × ${b}) + ${c}. O valor correto é:`;
                break;
            }
            case 11: {
                let num = Math.floor(Math.random() * 3) + 1;
                let den = num + Math.floor(Math.random() * 3) + 1;
                ans = `${num}/${den}`; txt = `Qual fração representa ${num} partes tomadas de um total de ${den}?`;
                break;
            }
            case 12: {
                let v1 = (Math.floor(Math.random() * 20) + 1) * 0.5;
                let v2 = (Math.floor(Math.random() * 10) + 1) * 0.5;
                ans = (v1 + v2).toFixed(2); txt = `Somando os valores monetários de R$ ${v1.toFixed(2)} + R$ ${v2.toFixed(2)}, obtemos:`;
                break;
            }
            case 13: {
                let perc = [10, 25, 50, 75][Math.floor(Math.random() * 4)];
                let val = (Math.floor(Math.random() * 8) + 1) * 20;
                ans = (perc / 100) * val; txt = `Calcule a porcentagem indicada: ${perc}% de R$ ${val} é igual a:`;
                break;
            }
            case 14: {
                let div = Math.floor(Math.random() * 5) + 2;
                let mult = Math.floor(Math.random() * 10) + 2;
                let resto = Math.floor(Math.random() * (div - 1)) + 1;
                let total = (div * mult) + resto;
                ans = resto; txt = `O valor exato do resto da divisão de ${total} por ${div} é igual a:`;
                break;
            }
            case 15: {
                let lado = Math.floor(Math.random() * 12) + 2;
                ans = lado * 4; txt = `Determine o perímetro de um quadrado que possui lados medindo ${lado} cm:`;
                break;
            }
            case 16: {
                let base = Math.floor(Math.random() * 7) + 2;
                ans = base * base; txt = `O valor numérico correspondente à potência de ${base}² é igual a:`;
                break;
            }
            case 17: {
                ans = 12; txt = `Determine o Menor Múltiplo Comum (MMC) entre os números 4 e 6:`;
                break;
            }
            case 18: {
                let x = Math.floor(Math.random() * 10) + 2;
                let b = Math.floor(Math.random() * 15) + 1;
                ans = x; txt = `Dada a equação simples x + ${b} = ${x + b}, o valor da incógnita x é:`;
                break;
            }
            case 19: {
                let a = Math.floor(Math.random() * 80) + 10;
                ans = 90 - a; txt = `Qual é o ângulo complementar de ${a}°? (A soma de ângulos complementares é 90°)`;
                break;
            }
            case 20: {
                let n1 = Math.floor(Math.random() * 10) + 1;
                let n2 = Math.floor(Math.random() * 10) + 1;
                let n3 = Math.floor(Math.random() * 10) + 1;
                ans = Math.round((n1 + n2 + n3) / 3); txt = `Calcule a Média Aritmética aproximada dos números: ${n1}, ${n2} e ${n3}`;
                break;
            }
            case 21: {
                let mult = Math.floor(Math.random() * 3) + 1;
                let cat1 = 3 * mult;
                let cat2 = 4 * mult;
                ans = 5 * mult; txt = `Em um triângulo retângulo com catetos ${cat1} cm e ${cat2} cm, qual a medida da hipotenusa?`;
                break;
            }
            case 22: {
                let x1 = Math.floor(Math.random() * 5) + 1;
                ans = x1; txt = `Dada a equação x² - ${x1 * x1} = 0, qual o valor positivo de x?`;
                break;
            }
            case 23: {
                ans = "0.5"; txt = `Em um triângulo retângulo, o cateto oposto mede 5 e a hipotenusa mede 10. Qual o valor do Seno deste ângulo?`;
                break;
            }
            case 24: default: {
                let x = Math.floor(Math.random() * 8) + 2;
                ans = (2 * x) + 5; txt = `Dada a função f(x) = 2x + 5, determine o valor de f(${x}):`;
                break;
            }
        }

        const opts = new Set([ans]);
        while (opts.size < 5) {
            let fake;
            if (typeof ans === 'number') {
                fake = ans + (Math.floor(Math.random() * 6) + 1) * (Math.random() > 0.5 ? 1 : -1);
                if (fake >= 0) opts.add(fake);
            } else {
                fake = `${Math.floor(Math.random() * 4) + 1}/${Math.floor(Math.random() * 6) + 5}`;
                opts.add(fake);
            }
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
    document.getElementById('feedback-message').innerText = `⏰ TEMPO ESGOTADO! (Resposta: ${q.answer})`;
    document.getElementById('feedback-message').style.color = 'var(--error-color)';

    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'inline-block';
    btnNext.innerText = (STATE.currentQuestionIndex === STATE.quizQuestions.length - 1) ? 'Finalizar Ilha 🏆' : 'Próxima Questão ➡️';
}

function checkAnswer(btn, selected, correct) {
    clearInterval(STATE.timerInterval);
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

    if (String(selected) === String(correct)) {
        btn.classList.add('correct');
        document.getElementById('feedback-message').innerText = '✨ Resposta Correta! Mandou Bem!';
        document.getElementById('feedback-message').style.color = 'var(--success-color)';
        STATE.totalScore += 20;
        if (typeof confetti === 'function') confetti({ particleCount: 35 });
    } else {
        btn.classList.add('wrong');
        document.getElementById('feedback-message').innerText = `❌ RESPOSTA INCORRETA! (Certa: ${correct})`;
        document.getElementById('feedback-message').style.color = 'var(--error-color)';
    }

    document.getElementById('quiz-score').innerText = STATE.totalScore;
    const mapScore = document.getElementById('map-score');
    if (mapScore) mapScore.innerText = STATE.totalScore;

    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'inline-block';
    btnNext.innerText = (STATE.currentQuestionIndex === STATE.quizQuestions.length - 1) ? 'Finalizar Ilha 🏆' : 'Próxima Questão ➡️';
}

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