// Fonctions utilitaires
function normalizeAnswer(answer) {
    return answer ? answer.toString().toLowerCase().trim().replace(/[.,!?]/g, '') : '';
}

function selectOption(element, inputId, value) {
    const parent = element.parentElement;
    const options = parent.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById(inputId).value = value;
}

// Fonctions principales
function checkExercise(exNum) {
    if (!window.answers || !window.answers[exNum]) return;
    
    const correctAnswers = window.answers[exNum];
    let correct = 0;
    let feedbackHTML = '<strong>Results:</strong><br>';
    
    correctAnswers.forEach((answer, index) => {
        const inputId = `q${exNum}-${index + 1}`;
        const userAnswer = document.getElementById(inputId)?.value;
        
        if (!userAnswer || userAnswer.trim() === '') {
            feedbackHTML += `✗ Question ${index + 1}: ${answer}<br>`;
            return;
        }
        
        const normalized = normalizeAnswer(userAnswer);
        const expectedNormalized = normalizeAnswer(answer);
        
        if (normalized === expectedNormalized) {
            correct++;
            feedbackHTML += `✓ Question ${index + 1}: Correct!<br>`;
        } else {
            feedbackHTML += `✗ Question ${index + 1}: ${answer}<br>`;
        }
    });
    
    if (window.updateScore) {
        window.updateScore(correct, correctAnswers.length);
    }
    
    const feedback = document.getElementById(`feedback${exNum}`);
    if (feedback) {
        feedback.innerHTML = feedbackHTML;
        feedback.className = 'feedback ' + (correct === correctAnswers.length ? 'correct' : 'incorrect');
        feedback.style.display = 'block';
    }
    
    if (window.updateProgress) {
        window.updateProgress();
    }
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
        
        // Marquer qu'on est sur l'écran final
        localStorage.setItem('isFinalScreen', 'true');
        
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
}

function startNewSession() {
    // Effacer le stockage local
    localStorage.removeItem('exerciseAnswers');
    localStorage.removeItem('activeExercise');
    localStorage.removeItem('savedScore');
    localStorage.removeItem('savedTotalQuestions');
    localStorage.removeItem('isFinalScreen');
    
    // Réinitialiser les champs
    document.querySelectorAll('input[type="text"]').forEach(input => {
        input.value = '';
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

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Charger la progression sauvegardée
    loadProgress();
    
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