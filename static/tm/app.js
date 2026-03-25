// Quiz de Grammaire Française — CE2

var SESSION_SIZE = 30;

// Application state

/**
 * État de la session en cours.
 * @type {{phrases: Array, currentIndex: number, score: number, results: Array}}
 */
var sessionState = {
  phrases: [],
  currentIndex: 0,
  score: 0,
  results: []
};

// ---------------------------------------------------------------------------
// DataLoader
// ---------------------------------------------------------------------------

/**
 * Charge phrases.json et valide la structure.
 * @returns {Promise<Array<{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}>>} Tableau de phrases validées
 */
async function loadPhrases() {
  var response;
  try {
    response = await fetch('phrases.json');
  } catch (err) {
    throw new Error('Impossible de charger phrases.json : ' + err.message);
  }
  if (!response.ok) {
    throw new Error('Impossible de charger phrases.json (HTTP ' + response.status + ')');
  }
  var data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error('phrases.json contient du JSON invalide : ' + err.message);
  }
  if (!Array.isArray(data)) {
    throw new Error('phrases.json doit contenir un tableau de phrases');
  }
  var valid = [];
  for (var i = 0; i < data.length; i++) {
    if (validatePhrase(data[i])) {
      valid.push(data[i]);
    } else {
      console.warn('Phrase ignorée (invalide) :', data[i]);
    }
  }
  if (valid.length < 20) {
    throw new Error('Pas assez de phrases valides (' + valid.length + '/20 minimum)');
  }
  return valid;
}


/**
 * Valide qu'une phrase a tous les champs requis et que errorIndex est un index valide.
 * @param {{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}} phrase
 * @returns {boolean}
 */
function validatePhrase(phrase) {
  if (!phrase || typeof phrase !== 'object') return false;
  if (typeof phrase.id !== 'number') return false;
  if (typeof phrase.sentence !== 'string' || phrase.sentence.length === 0) return false;
  if (typeof phrase.errorIndex !== 'number') return false;
  if (typeof phrase.explanation !== 'string' || phrase.explanation.length === 0) return false;
  if (typeof phrase.category !== 'string' || phrase.category.length === 0) return false;
  // Phrase correcte : errorIndex === -1, pas besoin de correctedWord
  if (phrase.errorIndex === -1) return true;
  if (typeof phrase.correctedWord !== 'string' || phrase.correctedWord.length === 0) return false;
  var words = phrase.sentence.split(' ');
  if (phrase.errorIndex < 0 || phrase.errorIndex >= words.length) return false;
  if (Math.floor(phrase.errorIndex) !== phrase.errorIndex) return false;
  return true;
}

// ---------------------------------------------------------------------------
// QuizEngine
// ---------------------------------------------------------------------------

/**
 * Sélectionne 20 phrases aléatoires sans doublon (Fisher-Yates shuffle).
 * @param {Array<{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}>} allPhrases
 * @returns {Array<{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}>}
 */
function selectSessionPhrases(allPhrases) {
  var copy = allPhrases.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, SESSION_SIZE);
}

/**
 * Vérifie si le mot cliqué est le mot erroné.
 * @param {{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}} phrase
 * @param {number} clickedIndex - Index du mot cliqué (0-based)
 * @returns {boolean}
 */
function checkAnswer(phrase, clickedIndex) {
  return clickedIndex === phrase.errorIndex;
}

/**
 * Découpe une phrase en mots cliquables (split sur les espaces).
 * @param {string} sentence
 * @returns {Array<string>}
 */
function splitSentence(sentence) {
  return sentence.split(' ');
}

// ---------------------------------------------------------------------------
// UIRenderer
// ---------------------------------------------------------------------------

/**
 * Affiche l'écran d'accueil avec titre, description et bouton "Commencer".
 */
function showWelcomeScreen() {
  var accueil = document.getElementById('ecran-accueil');
  accueil.innerHTML = '';
  accueil.removeAttribute('hidden');

  var question = document.getElementById('ecran-question');
  var resultat = document.getElementById('ecran-resultat');
  question.setAttribute('hidden', '');
  resultat.setAttribute('hidden', '');

  var titre = document.createElement('h1');
  titre.textContent = 'Quiz de Grammaire CE2';
  accueil.appendChild(titre);

  var desc = document.createElement('p');
  desc.textContent = 'Trouve le mot qui contient une erreur dans chaque phrase. 20 questions par partie !';
  accueil.appendChild(desc);

  var btn = document.createElement('button');
  btn.textContent = 'Commencer';
  btn.className = 'btn-commencer';
  btn.addEventListener('click', function () {
    startSession();
  });
  accueil.appendChild(btn);
}

/**
 * Affiche une question : phrase avec mots cliquables + indicateur de progression.
 * @param {{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}} phrase
 * @param {number} questionNumber - Numéro de la question courante (1-based)
 * @param {number} totalQuestions - Nombre total de questions dans la session
 */
function showQuestionScreen(phrase, questionNumber, totalQuestions) {
  var accueil = document.getElementById('ecran-accueil');
  var question = document.getElementById('ecran-question');
  var resultat = document.getElementById('ecran-resultat');
  accueil.setAttribute('hidden', '');
  resultat.setAttribute('hidden', '');
  question.removeAttribute('hidden');
  question.innerHTML = '';

  var answered = false;

  var progress = document.createElement('p');
  progress.className = 'progress';
  progress.textContent = 'Question ' + questionNumber + '/' + totalQuestions + ' (n°' + phrase.id + ')';
  question.appendChild(progress);

  var consigne = document.createElement('h2');
  consigne.textContent = 'Clique sur le mot erroné, ou appuie sur OK si la phrase est correcte';
  question.appendChild(consigne);

  var isCorrectPhrase = phrase.errorIndex === -1;

  var wordsContainer = document.createElement('div');
  wordsContainer.className = 'words-container';
  var words = splitSentence(phrase.sentence);
  for (var i = 0; i < words.length; i++) {
    (function (index) {
      var span = document.createElement('span');
      span.className = 'word';
      span.textContent = words[index];
      span.setAttribute('role', 'button');
      span.setAttribute('tabindex', '0');
      span.setAttribute('aria-label', 'Mot : ' + words[index]);
      span.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        var allWords = wordsContainer.querySelectorAll('.word');
        for (var w = 0; w < allWords.length; w++) {
          allWords[w].classList.add('disabled');
        }
        btnOk.classList.add('disabled');
        btnOk.disabled = true;
        if (isCorrectPhrase) {
          // La phrase était correcte mais l'élève a cliqué un mot → faux
          span.classList.add('incorrect');
          sessionState.score += 0;
          sessionState.results.push({
            phrase: phrase,
            selectedIndex: index,
            wasCorrect: false
          });
          showFeedback(phrase, false);
        } else {
          var wasCorrect = checkAnswer(phrase, index);
          if (wasCorrect) {
            span.classList.add('correct');
          } else {
            span.classList.add('incorrect');
            allWords[phrase.errorIndex].classList.add('correct');
          }
          sessionState.score += wasCorrect ? 1 : 0;
          sessionState.results.push({
            phrase: phrase,
            selectedIndex: index,
            wasCorrect: wasCorrect
          });
          showFeedback(phrase, wasCorrect);
        }
      });
      wordsContainer.appendChild(span);
    })(i);
  }
  question.appendChild(wordsContainer);

  // Bouton OK : la phrase est correcte, pas d'erreur
  var btnOk = document.createElement('button');
  btnOk.textContent = '✓ La phrase est correcte';
  btnOk.className = 'btn-ok';
  btnOk.addEventListener('click', function () {
    if (answered) return;
    answered = true;
    var allWords = wordsContainer.querySelectorAll('.word');
    for (var w = 0; w < allWords.length; w++) {
      allWords[w].classList.add('disabled');
    }
    btnOk.classList.add('disabled');
    btnOk.disabled = true;
    if (isCorrectPhrase) {
      // Bonne réponse : la phrase était bien correcte
      btnOk.classList.add('btn-ok-correct');
      sessionState.score += 1;
      sessionState.results.push({
        phrase: phrase,
        selectedIndex: -1,
        wasCorrect: true
      });
      showFeedback(phrase, true);
    } else {
      // Mauvaise réponse : il y avait une erreur
      btnOk.classList.add('btn-ok-incorrect');
      var allW = wordsContainer.querySelectorAll('.word');
      allW[phrase.errorIndex].classList.add('correct');
      sessionState.score += 0;
      sessionState.results.push({
        phrase: phrase,
        selectedIndex: -1,
        wasCorrect: false
      });
      showFeedback(phrase, false);
    }
  });
  question.appendChild(btnOk);
}

/**
 * Affiche le feedback après un clic : mot surligné, correction et explication.
 * @param {{id: number, sentence: string, errorIndex: number, correctedWord: string, explanation: string, category: string}} phrase
 * @param {boolean} wasCorrect - true si l'élève a cliqué sur le bon mot
 */
function showFeedback(phrase, wasCorrect) {
  var question = document.getElementById('ecran-question');

  var feedback = document.createElement('div');
  feedback.className = 'feedback ' + (wasCorrect ? 'correct' : 'incorrect');

  var isCorrectPhrase = phrase.errorIndex === -1;
  if (wasCorrect && isCorrectPhrase) {
    feedback.innerHTML = '<p><strong>Bravo !</strong> Cette phrase était bien correcte.</p>';
  } else if (wasCorrect) {
    feedback.innerHTML = '<p><strong>Bravo !</strong> Tu as trouvé le mot erroné.</p>';
  } else if (isCorrectPhrase) {
    feedback.innerHTML = '<p><strong>Pas tout à fait.</strong></p>' +
      '<p>Cette phrase était correcte, il n\'y avait pas d\'erreur.</p>';
  } else {
    feedback.innerHTML = '<p><strong>Pas tout à fait.</strong></p>' +
      '<p>Le mot correct est : <strong>' + phrase.correctedWord + '</strong></p>';
  }
  var expl = document.createElement('p');
  expl.textContent = phrase.explanation;
  feedback.appendChild(expl);

  question.appendChild(feedback);

  var btn = document.createElement('button');
  btn.textContent = 'Suivant';
  btn.className = 'btn-suivant';
  btn.addEventListener('click', function () {
    sessionState.currentIndex++;
    if (sessionState.currentIndex < sessionState.phrases.length) {
      showQuestionScreen(
        sessionState.phrases[sessionState.currentIndex],
        sessionState.currentIndex + 1,
        sessionState.phrases.length
      );
    } else {
      showResultScreen(sessionState.results, sessionState.score, sessionState.phrases.length);
    }
  });
  question.appendChild(btn);
}

/**
 * Affiche l'écran de résultat avec score et récapitulatif de chaque question.
 * @param {Array<{phrase: object, selectedIndex: number, wasCorrect: boolean}>} results
 * @param {number} score - Nombre de bonnes réponses
 * @param {number} total - Nombre total de questions
 */
function showResultScreen(results, score, total) {
  var accueil = document.getElementById('ecran-accueil');
  var question = document.getElementById('ecran-question');
  var resultat = document.getElementById('ecran-resultat');
  accueil.setAttribute('hidden', '');
  question.setAttribute('hidden', '');
  resultat.removeAttribute('hidden');
  resultat.innerHTML = '';

  var titre = document.createElement('h1');
  titre.textContent = 'Résultat';
  resultat.appendChild(titre);

  var scoreEl = document.createElement('p');
  scoreEl.className = 'score';
  scoreEl.textContent = score + '/' + total;
  resultat.appendChild(scoreEl);

  var msg = document.createElement('p');
  if (score === total) {
    msg.textContent = 'Parfait ! Tu as tout trouvé !';
  } else if (score >= total * 0.75) {
    msg.textContent = 'Très bien ! Continue comme ça !';
  } else if (score >= total * 0.5) {
    msg.textContent = 'Pas mal ! Tu peux encore progresser.';
  } else {
    msg.textContent = 'Courage ! Essaie encore pour t\'améliorer.';
  }
  resultat.appendChild(msg);

  var recap = document.createElement('div');
  recap.className = 'recap';
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var words = splitSentence(r.phrase.sentence);
    var item = document.createElement('div');
    item.className = 'recap-item ' + (r.wasCorrect ? 'correct' : 'incorrect');

    var num = document.createElement('strong');
    num.textContent = (i + 1) + '. ';
    item.appendChild(num);

    for (var w = 0; w < words.length; w++) {
      var span = document.createElement('span');
      span.textContent = words[w];
      if (w === r.phrase.errorIndex) {
        span.style.fontWeight = '700';
        span.style.textDecoration = 'underline';
      }
      if (w === r.selectedIndex && !r.wasCorrect) {
        span.style.color = '#c62828';
      }
      item.appendChild(span);
      if (w < words.length - 1) {
        item.appendChild(document.createTextNode(' '));
      }
    }

    var correction = document.createElement('p');
    correction.style.margin = '0.3rem 0 0 0';
    correction.style.fontSize = '0.95rem';
    if (r.wasCorrect) {
      correction.textContent = '✓ ' + r.phrase.explanation;
    } else if (r.phrase.errorIndex === -1) {
      correction.textContent = '✗ Cette phrase était correcte — ' + r.phrase.explanation;
    } else {
      correction.textContent = '✗ Mot correct : ' + r.phrase.correctedWord + ' — ' + r.phrase.explanation;
    }
    item.appendChild(correction);

    recap.appendChild(item);
  }
  resultat.appendChild(recap);

  var btn = document.createElement('button');
  btn.textContent = 'Recommencer';
  btn.className = 'btn-recommencer';
  btn.style.marginTop = '1.5rem';
  btn.addEventListener('click', function () {
    startSession();
  });
  resultat.appendChild(btn);
}

// ---------------------------------------------------------------------------
// Session Flow
// ---------------------------------------------------------------------------

/**
 * Démarre une nouvelle session : sélectionne 20 phrases, réinitialise l'état, affiche la première question.
 */
function startSession() {
  sessionState.phrases = selectSessionPhrases(window._allPhrases || []);
  sessionState.currentIndex = 0;
  sessionState.score = 0;
  sessionState.results = [];
  showQuestionScreen(sessionState.phrases[0], 1, sessionState.phrases.length);
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

/**
 * Point d'entrée de l'application.
 * Charge les phrases, affiche l'écran d'accueil, gère le flux complet.
 */
function init() {
  loadPhrases()
    .then(function (phrases) {
      window._allPhrases = phrases;
      showWelcomeScreen();
    })
    .catch(function (err) {
      var accueil = document.getElementById('ecran-accueil');
      accueil.innerHTML = '<h1>Erreur</h1><p>' + err.message + '</p>';
    });
}

document.addEventListener('DOMContentLoaded', init);
