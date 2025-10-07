// ======================================================
// ===============   RECAP PAGE NAVIGATION   ============
// ======================================================

/**
 * Crée et affiche le bouton de retour/navigation vers les exercices
 */
function createBackToExercisesButton() {
    // Récupérer l'exercice actif depuis le localStorage
    let activeExercise = localStorage.getItem('activeExercise');
    
    // Déterminer le texte et la cible du bouton
    let buttonText, targetUrl;
    
    if (activeExercise && activeExercise.startsWith('ex')) {
        buttonText = '← Back to exercises';
        targetUrl = `unit_1_lesson_1_revision.html#${activeExercise}`;
    } else {
        buttonText = '→ Go to exercises';
        targetUrl = 'unit_1_lesson_1_revision.html#ex1';
    }
    
    // Créer le conteneur du bouton
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'back-to-exercises-container';
    
    // Créer le bouton
    const button = document.createElement('a');
    button.href = targetUrl;
    button.className = 'back-to-exercises';
    button.textContent = buttonText;
    
    buttonContainer.appendChild(button);
    
    const content = document.querySelector('.content');
    if (!content) return;
    
    // Insérer le bouton tout en haut de .content (au-dessus de la première section)
    content.insertBefore(buttonContainer, content.firstElementChild);
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', createBackToExercisesButton);
