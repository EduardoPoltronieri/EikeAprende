const STATE = {
    username: '',
    totalScore: 0,
    coins: 0,
    equippedAccessory: '',
    islandCorrectAnswers: 0,
    currentIsland: null,
    currentQuestionIndex: 0,
    quizQuestions: [],
    timerInterval: null,
    timeLeft: 0,
    timePerQuestion: 30,
    logs: [],
    audioMuted: false,
    powerups: { freeze: 0, fifty: 0, shield: 0 },
    activeShield: false,
    achievements: new Set(),
    islandStars: {},
    customQuestions: [],
    isDailyChallenge: false
};

const ADMIN_PASSWORD = "admin";

// ================= SISTEMA DE ÁUDIO WEB AUDIO API =================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
    if (STATE.audioMuted) return;
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'buy') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'alert') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(400, now + 0.15);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        }
    } catch (e) {}
}

function toggleAudio() {
    STATE.audioMuted = !STATE.audioMuted;
    const icon = document.getElementById('sound-icon');
    if (icon) icon.className = STATE.audioMuted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

// ================= SISTEMA DE CONQUISTAS (BADGES) =================
function unlockAchievement(id, title, desc) {
    if (!STATE.achievements.has(id)) {
        STATE.achievements.add(id);
        playSound('buy');
        const toast = document.getElementById('toast-achievement');
        if (toast) {
            document.getElementById('toast-title').innerText = title;
            document.getElementById('toast-desc').innerText = desc;
            toast.style.display = 'flex';
            setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }
}

function islandLockedAlert(islandId) {
    alert(`⛔ A Ilha ${islandId} está INTERDITADA temporariamente pelo Professor! Por favor, escolha a partir da Ilha 7.`);
}

window.addEventListener('DOMContentLoaded', () => {
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
            updateCoinsUI();
            showScreen('screen-map');
            unlockAchievement('welcome', 'Primeiro Passo!', 'Você iniciou sua jornada nas Ilhas.');
        });
    }

    const btnOpenAdmin = document.getElementById('btn-open-admin');
    const btnAdminMap = document.getElementById('btn-admin-map');
    if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', authAdmin);
    if (btnAdminMap) btnAdminMap.addEventListener('click', authAdmin);

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
        btnResume.addEventListener('click', () => {
            document.getElementById('modal-warning').style.display = 'none';
            document.getElementById('crime-tape-overlay').style.display = 'none';
            requestFullScreen();
            startQuestionTimer();
        });
    }

    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            clearInterval(STATE.timerInterval);
            if (STATE.currentQuestionIndex < STATE.quizQuestions.length - 1) {
                STATE.currentQuestionIndex++;
                renderQuestion();
            } else {
                exitFullScreen();
                finishIsland();
            }
        });
    }

    const writtenInput = document.getElementById('written-input');
    if (writtenInput) {
        writtenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkWrittenAnswer();
            }
        });
    }
});

// ================= LOJA E POWER-UPS =================
function openShopModal() {
    document.getElementById('shop-coins-display').innerText = STATE.coins;
    updatePowerupInventoryUI();
    document.getElementById('modal-shop').style.display = 'flex';
}

function closeShopModal() {
    document.getElementById('modal-shop').style.display = 'none';
}

function buyAccessory(id, price, icon) {
    if (STATE.coins >= price) {
        STATE.coins -= price;
        STATE.equippedAccessory = icon;
        updateCoinsUI();
        playSound('buy');
        document.getElementById('shop-coins-display').innerText = STATE.coins;
        document.getElementById('avatar-accessory').innerText = icon;
        document.getElementById('map-avatar-accessory').innerText = icon;
        unlockAchievement('stylish', 'Estiloso!', 'Comprou um acessório na loja.');
        alert(`🎉 Você adquiriu e equipou seu novo acessório!`);
    } else {
        alert(`❌ Você precisa de mais ${price - STATE.coins} moedas para comprar este item!`);
    }
}

function buyPowerUp(type, price) {
    if (STATE.coins >= price) {
        STATE.coins -= price;
        STATE.powerups[type] = (STATE.powerups[type] || 0) + 1;
        updateCoinsUI();
        updatePowerupInventoryUI();
        playSound('buy');
        document.getElementById('shop-coins-display').innerText = STATE.coins;
        if (STATE.coins >= 500) unlockAchievement('rich', 'Economista!', 'Juntou muitas moedas!');
    } else {
        alert(`❌ Moedas insuficientes!`);
    }
}

function updatePowerupInventoryUI() {
    const f = document.getElementById('inv-freeze');
    const f50 = document.getElementById('inv-fifty');
    const s = document.getElementById('inv-shield');
    if (f) f.innerText = STATE.powerups.freeze;
    if (f50) f50.innerText = STATE.powerups.fifty;
    if (s) s.innerText = STATE.powerups.shield;

    const qf = document.getElementById('quiz-inv-freeze');
    const qf50 = document.getElementById('quiz-inv-fifty');
    const qs = document.getElementById('quiz-inv-shield');
    if (qf) qf.innerText = STATE.powerups.freeze;
    if (qf50) qf50.innerText = STATE.powerups.fifty;
    if (qs) qs.innerText = STATE.powerups.shield;
}

function usePowerUp(type) {
    if (STATE.powerups[type] <= 0) {
        alert("Você não possui este poder! Compre-o na Loja.");
        return;
    }

    if (type === 'freeze') {
        STATE.powerups.freeze--;
        STATE.timeLeft += 15;
        document.getElementById('timer-display').innerText = `${STATE.timeLeft}s`;
        playSound('buy');
    } else if (type === 'fifty') {
        const q = STATE.quizQuestions[STATE.currentQuestionIndex];
        if (q.type !== 'multiple') {
            alert("Este poder só funciona em questões de múltipla escolha!");
            return;
        }
        STATE.powerups.fifty--;
        playSound('buy');
        const btns = Array.from(document.querySelectorAll('.option-btn'));
        let removed = 0;
        btns.forEach(b => {
            if (String(b.innerText) !== String(q.answer) && removed < 2) {
                b.style.visibility = 'hidden';
                removed++;
            }
        });
    } else if (type === 'shield') {
        if (STATE.activeShield) {
            alert("O escudo já está ativado!");
            return;
        }
        STATE.powerups.shield--;
        STATE.activeShield = true;
        playSound('buy');
        alert("🛡️ Escudo Ativado! Seu próximo erro nesta questão não será penalizado.");
    }
    updatePowerupInventoryUI();
}

function getHint() {
    if (STATE.coins < 10) {
        alert("Você precisa de 10 moedas para pedir uma dica!");
        return;
    }
    STATE.coins -= 10;
    updateCoinsUI();
    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    alert(`💡 DICA: ${q.hint || 'Analise atentamente os valores e a ordem das operações!'}`);
}

function updateCoinsUI() {
    const mapCoins = document.getElementById('map-coins-display');
    if (mapCoins) mapCoins.innerText = STATE.coins;
}

// ================= MODAL RESULTADO E ESTRELAS =================
function finishIsland() {
    const totalQuestions = STATE.quizQuestions.length;
    const mult = STATE.isDailyChallenge ? 2 : 1;
    const earnedCoins = STATE.islandCorrectAnswers * 10 * mult;
    const earnedScore = STATE.islandCorrectAnswers * 20 * mult;
    const accuracy = Math.round((STATE.islandCorrectAnswers / totalQuestions) * 100);

    STATE.coins += earnedCoins;
    updateCoinsUI();

    // Cálculo de Estrelas
    let stars = 1;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 60) stars = 2;

    if (STATE.currentIsland && !STATE.isDailyChallenge) {
        STATE.islandStars[STATE.currentIsland] = Math.max(STATE.islandStars[STATE.currentIsland] || 0, stars);
        renderIslandStarsUI(STATE.currentIsland, STATE.islandStars[STATE.currentIsland]);
    }

    document.getElementById('res-score').innerText = `+${earnedScore}`;
    document.getElementById('res-coins').innerText = `+${earnedCoins}`;
    document.getElementById('res-accuracy').innerText = `${accuracy}%`;

    const resStarsContainer = document.getElementById('result-stars');
    if (resStarsContainer) {
        resStarsContainer.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            resStarsContainer.innerHTML += `<i class="${i <= stars ? 'fas' : 'far'} fa-star"></i>`;
        }
    }

    if (stars === 3) unlockAchievement('perfect', 'Perfeição!', 'Concluiu uma ilha com 3 estrelas.');

    document.getElementById('modal-island-result').style.display = 'flex';
    if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

function renderIslandStarsUI(islandId, starCount) {
    const container = document.getElementById(`stars-island-${islandId}`);
    if (container) {
        container.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            container.innerHTML += `<i class="${i <= starCount ? 'fas' : 'far'} fa-star" style="color:#facc15; font-size:0.8rem;"></i>`;
        }
    }
}

function closeResultModal() {
    document.getElementById('modal-island-result').style.display = 'none';
    showScreen('screen-map');
}

// ================= MODAL DE SELEÇÃO DO PDF =================
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

function generatePrintablePDF(islandId) {
    const questions = generateIslandQuestions(islandId, 8);
    const printContainer = document.getElementById('print-questions-list');
    const printStudent = document.getElementById('print-student-name');
    const printGrade = document.getElementById('print-grade-name');
    const printTitle = document.getElementById('print-exam-title');

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
            if (q.type === 'multiple') {
                q.options.slice(0, 5).forEach((opt, optIdx) => {
                    optionsHtml += `<div class="print-option-item"><strong>${labels[optIdx]})</strong> ${opt}</div>`;
                });
            } else {
                optionsHtml = `<div class="print-option-item" style="margin-top: 10px;"><strong>Resposta:</strong> __________________________________________________</div>`;
            }

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

// ================= RACHA-CUCA DIÁRIO & INÍCIO DE ILHA =================
function startDailyChallenge() {
    STATE.isDailyChallenge = true;
    STATE.currentIsland = "Racha-Cuca Diário";
    STATE.timePerQuestion = 20;
    STATE.currentQuestionIndex = 0;
    STATE.islandCorrectAnswers = 0;
    STATE.quizQuestions = generateIslandQuestions(21, 5); // 5 questões avançadas
    
    document.getElementById('current-island-title').innerText = "⚡ Desafio Diário (2x Moedas)";
    requestFullScreen();
    showScreen('screen-quiz');
    renderQuestion();
}

function startIsland(islandId) {
    STATE.isDailyChallenge = false;
    STATE.currentIsland = islandId;
    STATE.timePerQuestion = 30;
    STATE.currentQuestionIndex = 0;
    STATE.islandCorrectAnswers = 0;
    
    // Mescla questões nativas com customizadas cadastradas pelo professor
    let questions = generateIslandQuestions(islandId, 12);
    const custom = STATE.customQuestions.filter(q => parseInt(q.island) === islandId);
    if (custom.length > 0) {
        questions = [...custom, ...questions].slice(0, 12);
    }
    STATE.quizQuestions = questions;

    const titleElem = document.getElementById('current-island-title');
    if (titleElem) titleElem.innerText = `Ilha ${islandId}`;

    requestFullScreen();
    showScreen('screen-quiz');
    renderQuestion();
}

function generateIslandQuestions(islandId, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
        let ans, txt, exp = "", hnt = "";
        const isWritten = (i % 3 !== 0); 

        switch (islandId) {
            case 7: {
                let a = Math.floor(Math.random() * 9) + 2;
                let b = Math.floor(Math.random() * 9) + 2;
                ans = a * b; txt = `Calcule o produto das dezenas: ${a} × ${b} = ?`;
                exp = `Multiplique o fator ${a} pelo fator ${b} diretamente.`;
                hnt = "Lembre-se da tabuada básica!";
                break;
            }
            case 8: {
                let b = Math.floor(Math.random() * 8) + 2;
                let mult = Math.floor(Math.random() * 9) + 1;
                ans = mult; txt = `Determine o quociente da divisão: ${b * mult} ÷ ${b} = ?`;
                exp = `Dividir é descobrir quantas vezes o divisor cabe no dividendo.`;
                hnt = "Pense em qual número multiplicado pelo divisor resulta no total.";
                break;
            }
            case 9: {
                let a = Math.floor(Math.random() * 500) + 150;
                let b = Math.floor(Math.random() * a);
                ans = a - b; txt = `Resolva a subtração com empréstimo: ${a} - ${b} = ?`;
                exp = `Subtraia unidade por unidade, pedindo emprestado na dezena se necessário.`;
                hnt = "Se o algarismo superior for menor, peça emprestado.";
                break;
            }
            case 10: {
                let a = Math.floor(Math.random() * 8) + 2;
                let b = Math.floor(Math.random() * 5) + 1;
                let c = Math.floor(Math.random() * 15) + 5;
                ans = (a * b) + c; txt = `Considere a expressão numérica: (${a} × ${b}) + ${c}. O valor correto é:`;
                exp = `Resolva primeiro a multiplicação dentro dos parênteses (${a}×${b}) e depois some com ${c}.`;
                hnt = "A multiplicação tem prioridade sobre a soma.";
                break;
            }
            case 18: {
                let x = Math.floor(Math.random() * 10) + 2;
                let b = Math.floor(Math.random() * 15) + 1;
                ans = x; txt = `Dada a equação simples x + ${b} = ${x + b}, o valor da incógnita x é:`;
                exp = `Isole o x passando o ${b} para o outro lado subtraindo.`;
                hnt = "Faça a operação inversa da adição.";
                break;
            }
            case 21: {
                let mult = Math.floor(Math.random() * 3) + 1;
                let cat1 = 3 * mult;
                let cat2 = 4 * mult;
                ans = 5 * mult; txt = `Em um triângulo retângulo com catetos ${cat1} cm e ${cat2} cm, qual a medida da hipotenusa?`;
                exp = `Use a fórmula a² = b² + c²: (${cat1}² + ${cat2}² = ${cat1*cat1 + cat2*cat2}), cuja raiz é ${ans}.`;
                hnt = "A soma dos quadrados dos catetos equivale ao quadrado da hipotenusa.";
                break;
            }
            default: {
                let x = Math.floor(Math.random() * 8) + 2;
                ans = (2 * x) + 5; txt = `Dada a função f(x) = 2x + 5, determine o valor de f(${x}):`;
                exp = `Substitua o x por ${x}: 2(${x}) + 5 = ${2*x} + 5 = ${ans}.`;
                hnt = "Substitua o número dentro do parênteses no lugar de x.";
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
        list.push({ 
            text: txt, 
            answer: ans, 
            type: isWritten ? 'written' : 'multiple',
            explanation: exp,
            hint: hnt,
            options: Array.from(opts).sort(() => Math.random() - 0.5) 
        });
    }
    return list;
}

function renderQuestion() {
    clearInterval(STATE.timerInterval);
    STATE.activeShield = false;
    updatePowerupInventoryUI();

    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    document.getElementById('question-counter').innerText = `Questão ${STATE.currentQuestionIndex + 1}/${STATE.quizQuestions.length}`;
    document.getElementById('question-text').innerText = q.text;
    document.getElementById('feedback-message').innerText = '';
    document.getElementById('explanation-text').innerText = '';
    document.getElementById('btn-next').style.display = 'none';

    document.getElementById('progress-bar').style.width = `${((STATE.currentQuestionIndex) / STATE.quizQuestions.length) * 100}%`;

    const grid = document.getElementById('options-grid');
    const writtenBox = document.getElementById('written-container');
    const writtenInput = document.getElementById('written-input');

    if (q.type === 'written') {
        grid.style.display = 'none';
        writtenBox.style.display = 'flex';
        writtenInput.value = '';
        writtenInput.disabled = false;
        writtenInput.focus();
    } else {
        writtenBox.style.display = 'none';
        grid.style.display = 'grid';
        grid.innerHTML = '';
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.type = 'button';
            btn.innerText = opt;
            btn.onclick = () => checkMultipleAnswer(btn, opt, q.answer);
            grid.appendChild(btn);
        });
    }

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
    playSound('wrong');
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    const writtenInput = document.getElementById('written-input');
    if (writtenInput) writtenInput.disabled = true;

    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    document.getElementById('feedback-message').innerText = `⏰ TEMPO ESGOTADO! (Resposta: ${q.answer})`;
    document.getElementById('feedback-message').style.color = 'var(--error-color)';
    if (q.explanation) document.getElementById('explanation-text').innerText = `💡 Passo a passo: ${q.explanation}`;

    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'inline-block';
    btnNext.innerText = (STATE.currentQuestionIndex === STATE.quizQuestions.length - 1) ? 'Finalizar Ilha 🏆' : 'Próxima Questão ➡️';
}

function checkMultipleAnswer(btn, selected, correct) {
    clearInterval(STATE.timerInterval);
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

    if (String(selected) === String(correct)) {
        btn.classList.add('correct');
        handleCorrectAnswer();
    } else {
        if (STATE.activeShield) {
            alert("🛡️ Escudo Protegeu! Você não perdeu o ponto nesta tentativa.");
            STATE.activeShield = false;
            updatePowerupInventoryUI();
            btn.classList.add('wrong');
            handleCorrectAnswer(); // Considera protegido
            return;
        }
        btn.classList.add('wrong');
        handleWrongAnswer(correct);
    }
}

function checkWrittenAnswer() {
    const input = document.getElementById('written-input');
    if (!input || input.disabled) return;

    const userAns = input.value.trim().replace(',', '.');
    if (userAns === '') {
        alert('Digite uma resposta para enviar!');
        return;
    }

    clearInterval(STATE.timerInterval);
    input.disabled = true;

    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    if (String(userAns) === String(q.answer)) {
        input.style.borderColor = 'var(--success-color)';
        handleCorrectAnswer();
    } else {
        if (STATE.activeShield) {
            alert("🛡️ Escudo Protegeu! Tentativa errada perdoada.");
            STATE.activeShield = false;
            updatePowerupInventoryUI();
            handleCorrectAnswer();
            return;
        }
        input.style.borderColor = 'var(--error-color)';
        handleWrongAnswer(q.answer);
    }
}

function handleCorrectAnswer() {
    playSound('correct');
    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    document.getElementById('feedback-message').innerText = '✨ Resposta Correta! Mandou Bem!';
    document.getElementById('feedback-message').style.color = 'var(--success-color)';
    if (q.explanation) document.getElementById('explanation-text').innerText = `💡 Explicação: ${q.explanation}`;

    STATE.totalScore += 20;
    STATE.islandCorrectAnswers++;
    if (typeof confetti === 'function') confetti({ particleCount: 35 });

    document.getElementById('quiz-score').innerText = STATE.totalScore;
    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'inline-block';
    btnNext.innerText = (STATE.currentQuestionIndex === STATE.quizQuestions.length - 1) ? 'Finalizar Ilha 🏆' : 'Próxima Questão ➡️';
}

function handleWrongAnswer(correct) {
    playSound('wrong');
    const q = STATE.quizQuestions[STATE.currentQuestionIndex];
    document.getElementById('feedback-message').innerText = `❌ RESPOSTA INCORRETA! (Certa: ${correct})`;
    document.getElementById('feedback-message').style.color = 'var(--error-color)';
    if (q.explanation) document.getElementById('explanation-text').innerText = `💡 Passo a passo: ${q.explanation}`;

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
    playSound('alert');
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

// ================= ADMIN: EXPORTAR CSV E ADICIONAR QUESTÃO =================
function exportLogsCSV() {
    if (STATE.logs.length === 0) {
        alert("Não há registros de infração para exportar.");
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Hora,Aluno,Tipo,Detalhes\n";
    STATE.logs.forEach(l => {
        csvContent += `"${l.time}","${l.username}","${l.event_type}","${l.details}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_antifraude_${STATE.username}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function addCustomQuestion(e) {
    e.preventDefault();
    const txt = document.getElementById('cust-text').value;
    const island = document.getElementById('cust-island').value;
    const ans = document.getElementById('cust-ans').value;
    const exp = document.getElementById('cust-explanation').value;

    STATE.customQuestions.push({
        text: txt,
        island: island,
        answer: ans,
        type: 'written',
        explanation: exp,
        hint: 'Questão cadastrada pelo professor.'
    });

    alert("🎉 Questão gravada com sucesso! Ela aparecerá para os alunos nas próximas tentativas.");
    document.getElementById('custom-question-form').reset();
}

function requestFullScreen() {
    const doc = document.documentElement;
    if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
}

function exitFullScreen() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}