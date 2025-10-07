// ======================================================
// ===============   RECAP PAGE NAVIGATION   ============
// ======================================================

/**
 * Crée et affiche le bouton de retour/navigation vers les exercices
 */
function createBackToExercisesButton() {
    // Vérifier si un exercice actif existe dans le localStorage
    const activeExercise = localStorage.getItem('activeExercise');

    // Déterminer le texte du bouton
    const buttonText = activeExercise ? '← Back to exercises' : '→ Go to exercises';

    // L'URL pointe simplement vers la page de révision sans ancre
    const targetUrl = 'unit_1_lesson_1_revision.html';

    // Créer le conteneur du bouton
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'back-to-exercises-container';

    // Créer le bouton
    const button = document.createElement('a');
    button.href = targetUrl;
    button.className = 'back-to-exercises';
    button.textContent = buttonText;

    buttonContainer.appendChild(button);

    // Insérer le bouton tout en haut de .content
    const content = document.querySelector('.content');
    if (!content) return;

    content.insertBefore(buttonContainer, content.firstElementChild);
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', createBackToExercisesButton);
