window.answeredQuestions = window.answeredQuestions || {};

function normalizeAnswer(answer) {
    if (!answer) return '';
    
    // Convertir en chaîne, minuscules et supprimer les espaces superflus
    let normalized = answer.toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');  // Remplacer les espaces multiples par un seul
    
    // Gérer les contractions et formes contractées
    const contractions = [
        { from: /(\w)'d better/g, to: '$1 had better' },  // 'd better → had better
        { from: /(\w)'d rather/g, to: '$1 would rather' }, // 'd rather → would rather
        { from: /(\w)'s/g, to: '$1 is' },                 // 's → is
        { from: /(\w)'re/g, to: '$1 are' },               // 're → are
        { from: /(\w)'ll/g, to: '$1 will' },              // 'll → will
        { from: /(\w)'ve/g, to: '$1 have' },              // 've → have
        { from: /(\w)n't/g, to: ' $1 not' },              // n't → not (avec espace avant)
        { from: /(\w)'m/g, to: '$1 am' }                  // 'm → am
    ];
    
    // Appliquer les remplacements
    contractions.forEach(contraction => {
        normalized = normalized.replace(contraction.from, contraction.to);
    });
    
    // Supprimer la ponctuation et les espaces en double
    return normalized
        .replace(/[.,!?;:]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function selectOption(element, inputId, value) {
    const parent = element.parentElement;
    const options = parent.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById(inputId).value = value;
}

// Algorithme de distance de Levenshtein
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    
    // Initialiser la matrice
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    // Remplir la matrice
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // suppression
                );
            }
        }
    }
    
    return matrix[len1][len2];
}

// Fonction pour vérifier si une réponse est correcte avec tolérance
function isAnswerCorrect(userAnswer, correctAnswer) {
    const normalized = normalizeAnswer(userAnswer);
    const expectedNormalized = normalizeAnswer(correctAnswer);
    
    // 1. Correspondance exacte
    if (normalized === expectedNormalized) {
        return true;
    }

    // 2. Vérifier la longueur des réponses
    // Si la réponse de l'utilisateur est plus longue de plus de 2 caractères, c'est suspect
    if (normalized.length > expectedNormalized.length + 2) {
        // Vérifier si la différence est due à des mots supplémentaires
        const extraText = normalized.substring(expectedNormalized.length).trim();
        if (extraText.split(/\s+/).some(word => word.length > 1)) {
            return false;
        }
    }

    // 3. Tolérance aux fautes de frappe (distance de Levenshtein)
    const distance = levenshteinDistance(normalized, expectedNormalized);
    // Limiter la distance à 20% de la longueur de la réponse attendue (max 2)
    const maxDistance = Math.min(2, Math.floor(expectedNormalized.length * 0.2));
    
    if (distance <= maxDistance) {
        return true;
    }
    
    // 4. Pour les phrases, vérifier chaque mot
    if (expectedNormalized.includes(' ')) {
        const expectedWords = expectedNormalized.split(/\s+/);
        const userWords = normalized.split(/\s+/);
        
        // Si le nombre de mots est différent, c'est une erreur
        if (expectedWords.length !== userWords.length) {
            return false;
        }
        
        // Vérifier chaque paire de mots
        for (let i = 0; i < expectedWords.length; i++) {
            const wordDistance = levenshteinDistance(userWords[i], expectedWords[i]);
            const wordMaxDistance = expectedWords[i].length < 5 ? 0 : 1;
            
            if (wordDistance > wordMaxDistance) {
                return false;
            }
        }
        
        return true;
    }
    
    return false;
}

// Fonctions principales
// ✅ Fixed scoring logic: only count *new* answers in total.
// Update score properly when answers change correctness state.

window.answeredQuestions = window.answeredQuestions || {};

function checkExercise(exNum) {
    if (!window.answers || !window.answers[exNum]) return;

    const correctAnswers = window.answers[exNum];
    let scoreChange = 0;

    correctAnswers.forEach((answer, index) => {
        const inputId = `q${exNum}-${index + 1}`;
        const inputElement = document.getElementById(inputId);
        const userAnswer = inputElement?.value;
        if (!userAnswer?.trim()) return;

        const isCorrect = isAnswerCorrect(userAnswer, answer);
        const wasAnswered = Object.prototype.hasOwnProperty.call(window.answeredQuestions, inputId);
        const wasCorrect = window.answeredQuestions[inputId];

        const statusElement = document.getElementById(`${inputId}-status`) || createStatusElement(inputId);
        updateStatusElement(statusElement, isCorrect);

        // Case 1: new answer
        if (!wasAnswered) {
            window.answeredQuestions[inputId] = isCorrect;
            if (isCorrect) scoreChange += 1;
            window.totalQuestions = (window.totalQuestions || 0) + 1;
        }
        // Case 2: answer changed
        else if (wasCorrect !== isCorrect) {
            if (isCorrect) scoreChange += 1; // previously wrong → now correct
            else scoreChange -= 1; // previously correct → now wrong
            window.answeredQuestions[inputId] = isCorrect;
        }
    });

    // Update global score
    window.score = (window.score || 0) + scoreChange;

    // Update UI
    const scoreElement = document.getElementById('score');
    const totalElement = document.getElementById('total');
    if (scoreElement) scoreElement.textContent = window.score;
    if (totalElement) totalElement.textContent = window.totalQuestions;

    const feedback = document.getElementById(`feedback${exNum}`);
    if (feedback) {
        const allAnswered = correctAnswers.every((_, i) =>
            document.getElementById(`q${exNum}-${i + 1}`)?.value.trim()
        );
        const allCorrect = correctAnswers.every((ans, i) => {
            const input = document.getElementById(`q${exNum}-${i + 1}`);
            return input && isAnswerCorrect(input.value, ans);
        });

        feedback.innerHTML = allCorrect && allAnswered ?
            '✅ Toutes les réponses sont correctes !' :
            !allAnswered ? 'Veuillez répondre aux questions' :
            '❌ Certaines réponses sont incorrectes';
        feedback.style.display = 'block';
    }

    saveProgress();
}

// Fonctions utilitaires
function createStatusElement(inputId) {
    const statusElement = document.createElement('span');
    statusElement.id = `${inputId}-status`;
    statusElement.style.marginLeft = '5px';
    document.getElementById(inputId).insertAdjacentElement('afterend', statusElement);
    return statusElement;
}

function updateStatusElement(element, isCorrect) {
    element.textContent = isCorrect ? '✅ Correct' : '❌ Incorrect';
    element.style.color = isCorrect ? 'green' : 'red';
}

function nextExercise(exNum) {
    document.querySelector(`#ex${exNum-1}`)?.classList.remove('active');
    document.querySelector(`#ex${exNum}`)?.classList.add('active');
    window.scrollTo(0, 0);
}

function previousExercise(currentExNum) {
    const prevExNum = currentExNum - 1;
    if (prevExNum >= 1) {
        document.querySelector(`#ex${currentExNum}`)?.classList.remove('active');
        document.querySelector(`#ex${prevExNum}`)?.classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Fonctions de score et progression
function updateScore(correct = 0, total = 0) {
    if (!window.score) window.score = 0;
    if (!window.totalQuestions) window.totalQuestions = 0;
    
    window.score += correct;
    window.totalQuestions += total;
    
    const scoreElement = document.getElementById('score');
    const totalElement = document.getElementById('total');
    if (scoreElement) scoreElement.textContent = window.score;
    if (totalElement) totalElement.textContent = window.totalQuestions;
}

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar && window.totalQuestions) {
        const progress = (window.totalQuestions / 28) * 100;
        progressBar.style.width = progress + '%';
    }
}

function showFinal() {
    document.querySelectorAll('.exercise').forEach(ex => ex.classList.remove('active'));
    const finalScreen = document.getElementById('finalScreen');
    if (finalScreen) {
        finalScreen.classList.add('active');
        
        const percentage = Math.round((window.score / window.totalQuestions) * 100);
        const finalScore = document.getElementById('finalScore');
        const finalMessage = document.getElementById('finalMessage');
        
        if (finalScore) finalScore.textContent = `${window.score}/${window.totalQuestions}`;
        
        let emoji, message;
        if (percentage >= 90) {
            emoji = '🏆';
            message = "Outstanding! You're completely ready for your test!";
        } else if (percentage >= 75) {
            emoji = '🌟';
            message = "Great job! Just review a few points and you'll ace it!";
        } else if (percentage >= 60) {
            emoji = '👍';
            message = "Good effort! Keep practicing those tricky parts.";
        } else {
            emoji = '💪';
            message = "Don't give up! Review the lesson and try again.";
        }
        
        const finalEmoji = document.getElementById('finalEmoji');
        if (finalEmoji) finalEmoji.textContent = emoji;
        if (finalMessage) finalMessage.textContent = message;
        
        window.scrollTo(0, 0);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (window.updateScore) window.updateScore();
    if (window.updateProgress) window.updateProgress();
});

// Fonctions de sauvegarde et restauration
function saveProgress() {
    if (!window.answers) return;
    
    // Sauvegarder le score
    localStorage.setItem('savedScore', window.score || 0);
    localStorage.setItem('savedTotalQuestions', window.totalQuestions || 0);
    
    // Vérifier si on est sur l'écran final
    const finalScreen = document.getElementById('finalScreen');
    if (finalScreen && finalScreen.classList.contains('active')) {
        localStorage.setItem('isFinalScreen', 'true');
    } else {
        localStorage.removeItem('isFinalScreen');
        // Sauvegarder l'exercice actif seulement si on n'est pas sur l'écran final
        const activeExercise = document.querySelector('.exercise.active');
        if (activeExercise) {
            const activeId = activeExercise.id;
            localStorage.setItem('activeExercise', activeId);
        }
    }
    
    // Sauvegarder les réponses
    const answers = {};
    for (let i = 1; i <= 7; i++) {
        const exerciseAnswers = {};
        for (let j = 1; j <= 10; j++) {
            const input = document.getElementById(`q${i}-${j}`);
            if (input) {
                exerciseAnswers[`q${i}-${j}`] = input.value;
            }
        }
        if (Object.keys(exerciseAnswers).length > 0) {
            answers[`exercise${i}`] = exerciseAnswers;
        }
    }
    localStorage.setItem('exerciseAnswers', JSON.stringify(answers));

    // Save answeredQuestions correctness state
    localStorage.setItem('answeredQuestions', JSON.stringify(window.answeredQuestions));
}

function loadProgress() {
    // Restaurer le score
    const savedScore = localStorage.getItem('savedScore');
    const savedTotalQuestions = localStorage.getItem('savedTotalQuestions');
    
    if (savedScore !== null) {
        window.score = parseInt(savedScore, 10);
    }
    if (savedTotalQuestions !== null) {
        window.totalQuestions = parseInt(savedTotalQuestions, 10);
    }
    
    // Mettre à jour l'affichage du score
    updateScore();
    
    // Vérifier si on était sur l'écran final
    const isFinalScreen = localStorage.getItem('isFinalScreen') === 'true';
    
    if (isFinalScreen) {
        // Afficher directement l'écran final
        document.querySelectorAll('.exercise').forEach(ex => {
            ex.classList.remove('active');
        });
        showFinal();
    } else {
        // Restaurer l'exercice actif
        const savedExercise = localStorage.getItem('activeExercise');
        if (savedExercise) {
            document.querySelectorAll('.exercise').forEach(ex => {
                ex.classList.remove('active');
            });
            const exerciseToActivate = document.getElementById(savedExercise);
            if (exerciseToActivate) {
                exerciseToActivate.classList.add('active');
            }
        }
    }
    
    // Restaurer les réponses
    const savedAnswers = localStorage.getItem('exerciseAnswers');
    if (savedAnswers) {
        const answers = JSON.parse(savedAnswers);
        Object.keys(answers).forEach(exercise => {
            const exerciseAnswers = answers[exercise];
            Object.keys(exerciseAnswers).forEach(inputId => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = exerciseAnswers[inputId];
                }
            });
        });
    }

    // Restore answeredQuestions correctness state
    const savedAnswered = localStorage.getItem('answeredQuestions');
    if (savedAnswered) {
        window.answeredQuestions = JSON.parse(savedAnswered);
        Object.entries(window.answeredQuestions).forEach(([inputId, isCorrect]) => {
            const input = document.getElementById(inputId);
            if (input) {
                const statusElement = document.getElementById(`${inputId}-status`) || document.createElement('span');
                statusElement.id = `${inputId}-status`;
                statusElement.style.marginLeft = '5px';
                input.insertAdjacentElement('afterend', statusElement);
                statusElement.textContent = isCorrect ? '✅ Correct' : '❌ Incorrect';
                statusElement.style.color = isCorrect ? 'green' : 'red';
            }
        });
    }    
}

function startNewSession() {
    // Effacer le stockage local
    localStorage.removeItem('exerciseAnswers');
    localStorage.removeItem('activeExercise');
    localStorage.removeItem('savedScore');
    localStorage.removeItem('savedTotalQuestions');
    localStorage.removeItem('isFinalScreen');
    
    // Réinitialiser les champs et les statuts
    document.querySelectorAll('input[type="text"]').forEach(input => {
        input.value = '';
        // Supprimer les indicateurs de statut
        const statusElement = document.getElementById(`${input.id}-status`);
        if (statusElement) {
            statusElement.remove();
        }
    });
    
    // Réinitialiser le suivi des réponses
    window.answeredQuestions = {};

    // Cacher tous les messages de feedback
    document.querySelectorAll('.feedback').forEach(fb => {
        fb.style.display = 'none';
    });
    
    // Réinitialiser le score
    window.score = 0;
    window.totalQuestions = 0;
    updateScore();
    updateProgress();
    
    // Revenir au premier exercice
    document.querySelectorAll('.exercise').forEach((ex, index) => {
        ex.classList.toggle('active', index === 0);
    });
    
    // Masquer l'écran final
    const finalScreen = document.getElementById('finalScreen');
    if (finalScreen) {
        finalScreen.classList.remove('active');
    }
    
    // Faire défiler vers le haut
    window.scrollTo(0, 0);
}

// Sauvegarder la progression lors du changement d'exercice
const originalNextExercise = window.nextExercise;
window.nextExercise = function(exNum) {
    originalNextExercise(exNum);
    saveProgress();
};

const originalPreviousExercise = window.previousExercise;
window.previousExercise = function(exNum) {
    originalPreviousExercise(exNum);
    saveProgress();
};

// Variable pour stocker le timer
let hideAnswersTimer = null;

// Fonction pour masquer les réponses
function hideAnswers() {
    const container = document.getElementById('answersContainer');
    const button = document.getElementById('toggleAnswers');
    
    if (container && button) {
        container.style.display = 'none';
        button.textContent = '👁️ Show answers';
    }
    
    // Réinitialiser le timer
    if (hideAnswersTimer) {
        clearTimeout(hideAnswersTimer);
        hideAnswersTimer = null;
    }
}

// Fonction pour afficher/masquer les réponses de l'exercice actif
function toggleAnswers() {
    const container = document.getElementById('answersContainer');
    const button = document.getElementById('toggleAnswers');
    const activeExercise = document.querySelector('.exercise.active');
    
    if (!activeExercise) return;
    
    const exerciseId = activeExercise.id; // ex: 'ex1', 'ex2', etc.
    const exerciseNum = exerciseId.replace('ex', ''); // '1', '2', etc.
    
    // Annuler tout timer en cours
    if (hideAnswersTimer) {
        clearTimeout(hideAnswersTimer);
        hideAnswersTimer = null;
    }
    
    if (container.style.display === 'none' || !container.style.display) {
        // Afficher les réponses
        container.style.display = 'block';
        button.textContent = '👁️ Hide answers';
        
        // Récupérer ou générer les réponses
        const answersList = document.getElementById('answersList');
        answersList.innerHTML = ''; // Vider la liste des réponses
        
        if (window.answers && window.answers[exerciseNum]) {
            // Générer la liste des réponses pour l'exercice actif
            window.answers[exerciseNum].forEach((answer, index) => {
                const answerItem = document.createElement('div');
                answerItem.className = 'answer-item';
                answerItem.innerHTML = `<strong>Question ${index + 1}:</strong> ${answer}`;
                answersList.appendChild(answerItem);
            });
            
            // Faire défiler jusqu'au conteneur des réponses
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Démarrer le timer pour masquer les réponses après 10 secondes
            hideAnswersTimer = setTimeout(hideAnswers, 10000); // 10 secondes
        }
    } else {
        // Masquer les réponses immédiatement
        hideAnswers();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Charger la progression sauvegardée
    loadProgress();
    
    // Ajouter l'événement à tous les boutons de bascule des réponses
    document.querySelectorAll('.btn-answers').forEach(button => {
        button.addEventListener('click', toggleAnswers);
    });
    
    // Masquer les réponses si on clique ailleurs sur la page
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-answers') && !e.target.closest('.answers-container')) {
            hideAnswers();
        }
    });
    
    // Sauvegarder les réponses lorsqu'elles changent
    document.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('input', saveProgress);
    });
    
    // Sauvegarder lors de la vérification des réponses
    const originalCheckExercise = window.checkExercise;
    window.checkExercise = function(exNum) {
        originalCheckExercise(exNum);
        saveProgress();
    };
    
    // Gestion du rechargement de la page
    window.addEventListener('beforeunload', saveProgress);
});

// Exposer les fonctions globales
window.checkExercise = checkExercise;
window.nextExercise = nextExercise;
window.previousExercise = previousExercise;
window.updateScore = updateScore;
window.updateProgress = updateProgress;
window.showFinal = showFinal;
window.startNewSession = startNewSession;