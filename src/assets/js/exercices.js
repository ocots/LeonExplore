// ======================================================
// ===============   NORMALIZATION & UTILS   ============
// ======================================================

window.answeredQuestions = window.answeredQuestions || {};

function normalizeAnswer(answer) {
    if (!answer) return '';
    // console.log('🔹 Raw input:', JSON.stringify(answer));

    let normalized = answer
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        // ✅ uniformiser tous les types d’apostrophes
        .replace(/[’‘`]/g, "'");

    // console.log('🔸 After apostrophe normalization:', JSON.stringify(normalized));

    // ✅ Remplacement des contractions courantes
    const contractions = [
        { from: /\bcan't\b/g, to: 'cannot' },
        { from: /\bwon't\b/g, to: 'will not' },
        { from: /\bshan't\b/g, to: 'shall not' },
        { from: /\b(\w*?)n['’]t\b/g, to: '$1 not' },
        { from: /\b(\w+)'d\b/g, to: '$1 would' },
        { from: /\b(\w+)'ll\b/g, to: '$1 will' },
        { from: /\b(\w+)'ve\b/g, to: '$1 have' },
        { from: /\b(\w+)'re\b/g, to: '$1 are' },
        { from: /\b(\w+)'m\b/g, to: '$1 am' },
        { from: /\b(\w+)'s\b/g, to: '$1 is' }
    ];    

    contractions.forEach(c => {
        const before = normalized;
        normalized = normalized.replace(c.from, c.to);
        if (before !== normalized) {
            // console.log(`🔁 Applied rule: ${c.from} → ${c.to}`);
            // console.log('    Result:', JSON.stringify(normalized));
        }
    });

    // Nettoyage final
    normalized = normalized
        .replace(/[.,!?;:]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // console.log('✅ Final normalized:', JSON.stringify(normalized));
    // console.log('-------------------------------------------');

    return normalized;
}

function levenshteinDistance(str1, str2) {
    const len1 = str1.length, len2 = str2.length;
    const matrix = Array.from({ length: len1 + 1 }, (_, i) => [i]);
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[len1][len2];
}

function isAnswerCorrect(userAnswer, correctAnswer) {
    const norm = normalizeAnswer(userAnswer);
    const expected = normalizeAnswer(correctAnswer);

    if (norm === expected) return true;

    const expWords = expected.split(/\s+/);
    const usrWords = norm.split(/\s+/);

    // Si le nombre de mots diffère, ce n’est pas correct
    if (expWords.length !== usrWords.length) return false;

    // Vérifie chaque mot individuellement
    for (let i = 0; i < expWords.length; i++) {
        const expWord = expWords[i];
        const usrWord = usrWords[i];

        // Vérifie que le mot existe et n'est pas vide
        if (!usrWord) return false;

        // Vérifie première et dernière lettre
        if (usrWord[0] !== expWord[0] || usrWord[usrWord.length - 1] !== expWord[expWord.length - 1]) {
            return false;
        }

        // Tolérance interne (petite faute autorisée pour les mots longs)
        const d = levenshteinDistance(usrWord, expWord);
        if (d > (expWord.length < 5 ? 0 : 1)) return false;
    }

    return true;
}

// ======================================================
// ==================== QUIZ LOGIC ======================
// ======================================================

function selectOption(element, inputId, value) {
    const parent = element.parentElement;
    parent.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById(inputId).value = value;
}

function createStatusElement(inputId) {
    const statusElement = document.createElement('span');
    statusElement.id = `${inputId}-status`;
    statusElement.style.marginLeft = '5px';
    document.getElementById(inputId).insertAdjacentElement('afterend', statusElement);
    return statusElement;
}

function highlightCharDifferences(norm, expected) {
    const normWords = norm.split(/\s+/);
    const expWords = expected.split(/\s+/);
    const maxLen = Math.max(normWords.length, expWords.length);
    const result = [];

    for (let i = 0; i < maxLen; i++) {
        const nw = normWords[i] ?? '';
        const ew = expWords[i] ?? '';

        if (nw === ew) {
            result.push(nw);
        } else {
            // Diff caractère par caractère
            const maxChar = Math.max(nw.length, ew.length);
            let highlightedWord = '';
            for (let j = 0; j < maxChar; j++) {
                const nc = nw[j] ?? '';
                const ec = ew[j] ?? '';
                if (nc === ec) highlightedWord += nc;
                else highlightedWord += `<span style="background-color:#ffcccc;">${nc}</span>`;
            }
            result.push(highlightedWord);
        }
    }

    return result.join(' ');
}

function updateStatusElement(element, isCorrect, userAnswer, correctAnswer) {
    if (!isCorrect) {
        element.innerHTML = '❌ Incorrect';
        element.style.color = 'red';
    } else {
        const norm = normalizeAnswer(userAnswer);
        const expected = normalizeAnswer(correctAnswer);
        const exactlySame = norm === expected;

        if (exactlySame) {
            element.textContent = '✅ Correct';
            element.style.color = 'green';
        } else {
            element.innerHTML = `✅ Correct <small style="color:#1E3A8A;">(differences: ${highlightCharDifferences(norm, expected)})</small>`;
            element.style.color = 'green';
        }
    }
}

// ======================================================
// ================= SCORE / CHECK ======================
// ======================================================

function checkExercise(exNum) {
    if (!window.answers || !window.answers[exNum]) return;

    const correctAnswers = window.answers[exNum];
    let scoreChange = 0;
    let hasUnansweredQuestions = false;

    correctAnswers.forEach((answer, index) => {
        const inputId = `q${exNum}-${index + 1}`;
        const input = document.getElementById(inputId);
        const userAnswer = input?.value ?? '';
        const parent = input?.parentElement;
        const isQuiz = parent?.querySelector('.quiz-option') !== null;
        const isSelect = input?.tagName === 'SELECT';
        const hasSelected = isQuiz ? parent.querySelector('.quiz-option.selected') !== null : userAnswer.trim() !== '';

        parent?.classList.remove('unanswered');
        const statusElement = document.getElementById(`${inputId}-status`) || createStatusElement(inputId);

        if (!hasSelected) {
            hasUnansweredQuestions = true;
            parent?.classList.add('unanswered');
            statusElement.textContent = '';
            return;
        }

        const isCorrect = isAnswerCorrect(userAnswer, answer);
        updateStatusElement(statusElement, isCorrect, userAnswer, answer);

        const wasAnswered = Object.prototype.hasOwnProperty.call(window.answeredQuestions, inputId);
        const wasCorrect = window.answeredQuestions[inputId];

        if (!wasAnswered) {
            window.answeredQuestions[inputId] = isCorrect;
            if (isCorrect) scoreChange += 1;
            window.totalQuestions = (window.totalQuestions || 0) + 1;
        } else if (wasCorrect !== isCorrect) {
            scoreChange += isCorrect ? 1 : -1;
            window.answeredQuestions[inputId] = isCorrect;
        }
    });

    window.score = (window.score || 0) + scoreChange;
    updateScore();
    updateProgress();

    const feedback = document.getElementById(`feedback${exNum}`);
    if (feedback) {
        if (hasUnansweredQuestions) {
            feedback.innerHTML = '⚠️ Please answer all questions';
            feedback.style.color = 'orange';
        } else {
            const allCorrect = correctAnswers.every((ans, i) =>
                isAnswerCorrect(document.getElementById(`q${exNum}-${i + 1}`).value, ans)
            );
            feedback.innerHTML = allCorrect ? '✅ All answers correct!' : '❌ Some answers are incorrect';
            feedback.style.color = allCorrect ? 'green' : 'red';
        }
        feedback.style.display = 'block';
    }

    saveProgress();
}

function updateScore() {
    const s = document.getElementById('score');
    const t = document.getElementById('total');
    if (s) s.textContent = window.score || 0;
    if (t) t.textContent = window.totalQuestions || 0;
}

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar && window.totalQuestions) {
        const progress = Math.min((window.score / (window.totalQuestions || 1)) * 100, 100);
        progressBar.style.width = progress + '%';
    }
}

// ======================================================
// ================ NAVIGATION / FINAL ==================
// ======================================================
function getCurrentExerciseNumber() {
    const active = document.querySelector('.exercise.active');
    if (!active) return null;
    return parseInt(active.id.replace('ex', ''), 10);
}

function getTotalExercises() {
    return document.querySelectorAll('.exercise').length;
}

function previousExerciseDynamic() {
    const curr = getCurrentExerciseNumber();
    if (!curr || curr <= 1) return;
    nextPrevExercise(curr - 1);
}

function nextExerciseDynamic() {
    const curr = getCurrentExerciseNumber();
    const total = getTotalExercises();
    if (!curr || curr >= total) return;
    nextPrevExercise(curr + 1);
}

function nextPrevExercise(target) {
    const current = document.querySelector('.exercise.active');
    if (current) current.classList.remove('active');
    const nextEx = document.getElementById(`ex${target}`);
    if (nextEx) nextEx.classList.add('active');
    window.scrollTo(0, 0);
    saveProgress();
}

function showFinal() {
    document.querySelectorAll('.exercise').forEach(ex => ex.classList.remove('active'));
    const final = document.getElementById('finalScreen');
    if (!final) return;
    final.classList.add('active');

    const percentage = Math.round((window.score / (window.totalQuestions || 1)) * 100);
    const finalScore = document.getElementById('finalScore');
    const finalMsg = document.getElementById('finalMessage');
    const finalEmoji = document.getElementById('finalEmoji');

    if (finalScore) finalScore.textContent = `${window.score}/${window.totalQuestions}`;
    let emoji, msg;
    if (percentage >= 90) { emoji = '🏆'; msg = "Outstanding! You're completely ready for your test!"; }
    else if (percentage >= 75) { emoji = '🌟'; msg = "Great job! Just review a few points and you'll ace it!"; }
    else if (percentage >= 60) { emoji = '👍'; msg = "Good effort! Keep practicing those tricky parts."; }
    else { emoji = '💪'; msg = "Don't give up! Review the lesson and try again."; }

    if (finalEmoji) finalEmoji.textContent = emoji;
    if (finalMsg) finalMsg.textContent = msg;
    window.scrollTo(0, 0);
}

// ======================================================
// ============== SAVE / LOAD PROGRESS ==================
// ======================================================

function saveProgress() {
    localStorage.setItem('savedScore', window.score || 0);
    localStorage.setItem('savedTotalQuestions', window.totalQuestions || 0);

    const finalScreen = document.getElementById('finalScreen');
    if (finalScreen?.classList.contains('active')) localStorage.setItem('isFinalScreen', 'true');
    else {
        localStorage.removeItem('isFinalScreen');
        const active = document.querySelector('.exercise.active');
        if (active) localStorage.setItem('activeExercise', active.id);
    }

    const answers = {};
    for (let i = 1; i <= 8; i++) {
        const exAnswers = {};
        for (let j = 1; j <= 25; j++) {
            const input = document.getElementById(`q${i}-${j}`);
            if (input) exAnswers[`q${i}-${j}`] = input.value;
        }
        if (Object.keys(exAnswers).length > 0) answers[`exercise${i}`] = exAnswers;
    }
    localStorage.setItem('exerciseAnswers', JSON.stringify(answers));
    localStorage.setItem('answeredQuestions', JSON.stringify(window.answeredQuestions));
}

function loadProgress() {
    // Score et total
    window.score = parseInt(localStorage.getItem('savedScore') || '0', 10);
    window.totalQuestions = parseInt(localStorage.getItem('savedTotalQuestions') || '0', 10);
    updateScore();
    updateProgress();

    // Final screen
    if (localStorage.getItem('isFinalScreen') === 'true') return showFinal();

    // Exercice actif
    const savedExercise = localStorage.getItem('activeExercise');
    if (savedExercise) {
        document.querySelectorAll('.exercise').forEach(e => e.classList.remove('active'));
        document.getElementById(savedExercise)?.classList.add('active');
    }

    // Réponses sauvegardées
    const savedAnswers = JSON.parse(localStorage.getItem('exerciseAnswers') || '{}');
    Object.values(savedAnswers).forEach(ex => {
        Object.entries(ex).forEach(([inputId, val]) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            input.value = val;

            const parent = input.parentElement;
            const options = parent?.querySelectorAll('.quiz-option');
            if (options?.length) {
                // Restaurer la sélection du quiz
                options.forEach(opt => {
                    if (opt.dataset.value === val) opt.classList.add('selected');
                    else opt.classList.remove('selected');
                });
            }
        });
    });

    // Restaurer answeredQuestions et statuts
    const savedAnswered = JSON.parse(localStorage.getItem('answeredQuestions') || '{}');
    window.answeredQuestions = savedAnswered;
    Object.entries(savedAnswered).forEach(([inputId, isCorrect]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const status = document.getElementById(`${inputId}-status`) || createStatusElement(inputId);
        const exNum = parseInt(inputId.split('-')[0].replace('q', ''), 10);
        const index = parseInt(inputId.split('-')[1], 10) - 1;
        const correctAnswer = window.answers?.[exNum]?.[index];

        if (input.value.trim() === '') {
            status.textContent = '';
        } else if (correctAnswer !== undefined) {
            updateStatusElement(status, isCorrect, input.value, correctAnswer);
        }
    });
}

// ======================================================
// ================= SESSION RESET ======================
// ======================================================

function startNewSession() {
    ['exerciseAnswers', 'activeExercise', 'savedScore', 'savedTotalQuestions', 'isFinalScreen'].forEach(k => localStorage.removeItem(k));

    // Réinitialisation des champs texte et des sélecteurs
    document.querySelectorAll('input[type="text"], input[type="hidden"], select').forEach(input => {
        if (input.tagName === 'SELECT') {
            input.selectedIndex = 0; // Réinitialise à la première option (vide)
        } else {
            input.value = ''; // Pour les champs texte
        }
        const parent = input.parentElement;
        if (parent) {
            parent.classList.remove('unanswered');
            parent.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        }
        document.getElementById(`${input.id}-status`)?.remove();
    });

    window.answeredQuestions = {};
    window.score = 0;
    window.totalQuestions = 0;
    updateScore();
    updateProgress();

    document.querySelectorAll('.feedback').forEach(fb => fb.style.display = 'none');
    document.querySelectorAll('.exercise').forEach((ex, i) => ex.classList.toggle('active', i === 0));
    document.getElementById('finalScreen')?.classList.remove('active');
    window.scrollTo(0, 0);
}

// ======================================================
// =================== ANSWERS TOGGLE ===================
// ======================================================

let hideAnswersTimer = null;
function hideAnswers() {
    const container = document.getElementById('answersContainer');
    const button = document.getElementById('toggleAnswers');
    if (container && button) {
        container.style.display = 'none';
        button.textContent = 'Show answers';
    }
    if (hideAnswersTimer) clearTimeout(hideAnswersTimer);
    hideAnswersTimer = null;
}

function toggleAnswers() {
    const container = document.getElementById('answersContainer');
    const button = document.getElementById('toggleAnswers');
    const active = document.querySelector('.exercise.active');
    if (!active || !container || !button) return;

    if (container.style.display === 'block') return hideAnswers();

    container.style.display = 'block';
    button.textContent = 'Hide answers';
    const list = document.getElementById('answersList');
    list.innerHTML = '';

    const exNum = active.id.replace('ex', '');
    if (window.answers && window.answers[exNum]) {
        window.answers[exNum].forEach((ans, i) => {
            const div = document.createElement('div');
            div.className = 'answer-item';
            div.innerHTML = `<strong>Question ${i + 1}:</strong> ${ans}`;
            list.appendChild(div);
        });
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        hideAnswersTimer = setTimeout(hideAnswers, 10000);
    }
}

// ======================================================
// ================= INITIALIZATION =====================
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.score === 'undefined') window.score = 0;
    if (typeof window.totalQuestions === 'undefined') window.totalQuestions = 0;
    updateScore();
    updateProgress();
    loadProgress();

    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', previousExerciseDynamic);
    });
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', nextExerciseDynamic);
    });
    document.querySelectorAll('.btn-check').forEach(btn => {
        btn.addEventListener('click', () => {
            const exNum = getCurrentExerciseNumber();
            if (exNum) checkExercise(exNum);
        });
    });
    
    document.querySelectorAll('.btn-answers').forEach(btn => btn.addEventListener('click', toggleAnswers));
    document.addEventListener('click', e => {
        if (!e.target.closest('.btn-answers') && !e.target.closest('.answers-container')) hideAnswers();
    });
    document.querySelectorAll('input[type="text"]').forEach(inp => inp.addEventListener('input', () => { saveProgress(); updateProgress(); }));
    document.querySelectorAll('select').forEach(sel => sel.addEventListener('change', () => { saveProgress(); updateProgress(); }));
    window.addEventListener('beforeunload', saveProgress);
});

// Expose
window.checkExercise = checkExercise;
window.updateScore = updateScore;
window.updateProgress = updateProgress;
window.showFinal = showFinal;
window.startNewSession = startNewSession;
