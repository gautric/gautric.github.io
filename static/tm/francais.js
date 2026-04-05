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

/**
 * Manifest chargé depuis regles/manifest.json.
 * Structure : { groupName: { categoryName: "group/file.json", ... }, ... }
 * @type {Object|null}
 */
var manifest = null;

/**
 * Cache des fichiers de règles déjà chargés.
 * Clé = chemin relatif (ex: "accords/accords-sujet-verbe.json"), valeur = tableau de phrases validées.
 * @type {Object}
 */
var rulesCache = {};

// ---------------------------------------------------------------------------
// DataLoader
// ---------------------------------------------------------------------------

/**
 * Charge le manifest (regles/manifest.json).
 * @returns {Promise<Object>}
 */
async function loadManifest() {
  if (manifest) return manifest;
  var response;
  try {
    response = await fetch('regles/manifest.json');
  } catch (err) {
    throw new Error('Impossible de charger le manifest : ' + err.message);
  }
  if (!response.ok) {
    throw new Error('Impossible de charger le manifest (HTTP ' + response.status + ')');
  }
  manifest = await response.json();
  return manifest;
}

/**
 * Charge un fichier de règles individuel et met en cache.
 * @param {string} relativePath - Chemin relatif depuis regles/ (ex: "accords/accords-sujet-verbe.json")
 * @returns {Promise<Array>}
 */
async function loadRuleFile(relativePath) {
  if (rulesCache[relativePath]) return rulesCache[relativePath];
  var response;
  try {
    response = await fetch('regles/' + relativePath);
  } catch (err) {
    throw new Error('Impossible de charger regles/' + relativePath + ' : ' + err.message);
  }
  if (!response.ok) {
    throw new Error('Impossible de charger regles/' + relativePath + ' (HTTP ' + response.status + ')');
  }
  var data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('regles/' + relativePath + ' doit contenir un tableau');
  }
  var valid = [];
  for (var i = 0; i < data.length; i++) {
    if (validatePhrase(data[i])) {
      valid.push(data[i]);
    } else {
      console.warn('Phrase ignorée (invalide) dans ' + relativePath + ' :', data[i]);
    }
  }
  rulesCache[relativePath] = valid;
  return valid;
}

/**
 * Charge toutes les phrases (tous les fichiers du manifest).
 * @returns {Promise<Array>}
 */
async function loadAllPhrases() {
  var m = await loadManifest();
  var promises = [];
  var groupNames = Object.keys(m);
  for (var g = 0; g < groupNames.length; g++) {
    var cats = Object.keys(m[groupNames[g]]);
    for (var c = 0; c < cats.length; c++) {
      promises.push(loadRuleFile(m[groupNames[g]][cats[c]]));
    }
  }
  var results = await Promise.all(promises);
  var all = [];
  for (var r = 0; r < results.length; r++) {
    all = all.concat(results[r]);
  }
  return all;
}

/**
 * Charge les phrases pour une liste de catégories sélectionnées.
 * @param {Array<string>} categoryNames - Noms de catégories (ex: ["accords sujet-verbe", "homophones a/à"])
 * @returns {Promise<Array>}
 */
async function loadPhrasesByCategories(categoryNames) {
  var m = await loadManifest();
  var promises = [];
  var groupNames = Object.keys(m);
  for (var g = 0; g < groupNames.length; g++) {
    var cats = Object.keys(m[groupNames[g]]);
    for (var c = 0; c < cats.length; c++) {
      if (categoryNames.indexOf(cats[c]) !== -1) {
        promises.push(loadRuleFile(m[groupNames[g]][cats[c]]));
      }
    }
  }
  var results = await Promise.all(promises);
  var all = [];
  for (var r = 0; r < results.length; r++) {
    all = all.concat(results[r]);
  }
  return all;
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
 * Sélectionne N phrases aléatoires sans doublon (Fisher-Yates shuffle).
 * @param {Array} allPhrases
 * @param {number} [count] - Nombre de phrases à sélectionner (défaut SESSION_SIZE)
 * @returns {Array}
 */
function selectSessionPhrases(allPhrases, count) {
  var n = count || SESSION_SIZE;
  var copy = allPhrases.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, n);
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
 * Retourne la structure groupée des catégories depuis le manifest.
 * @returns {Object} { groupName: [catName, ...], ... }
 */
function getGroupedCategories() {
  if (!manifest) return {};
  var result = {};
  var groupNames = Object.keys(manifest);
  for (var g = 0; g < groupNames.length; g++) {
    result[groupNames[g]] = Object.keys(manifest[groupNames[g]]).sort();
  }
  return result;
}

/** Labels lisibles pour les groupes */
var GROUP_LABELS = {
  accords: 'Accords',
  homophones: 'Homophones',
  conjugaison: 'Conjugaison',
  orthographe: 'Orthographe',
  grammaire: 'Grammaire'
};

/**
 * Affiche l'écran d'accueil avec titre, sélecteur de catégories groupées et bouton "Commencer".
 */
function showWelcomeScreen() {
  var MAX_SELECTION = 3;
  var accueil = document.getElementById('ecran-accueil');
  accueil.innerHTML = '';
  accueil.removeAttribute('hidden');

  var question = document.getElementById('ecran-question');
  var resultat = document.getElementById('ecran-resultat');
  question.setAttribute('hidden', '');
  resultat.setAttribute('hidden', '');

  var backLink = document.createElement('a');
  backLink.href = 'index.html';
  backLink.textContent = '← Retour au choix des matières';
  backLink.className = 'back-link';
  accueil.appendChild(backLink);

  var titre = document.createElement('h1');
  titre.textContent = 'Quiz de Grammaire CE2';
  accueil.appendChild(titre);

  var desc = document.createElement('p');
  desc.textContent = 'Trouve le mot qui contient une erreur dans chaque phrase. ' + SESSION_SIZE + ' questions par partie !';
  accueil.appendChild(desc);

  // --- Category selector ---
  var selectorLabel = document.createElement('p');
  selectorLabel.className = 'selector-label';
  selectorLabel.textContent = 'Choisis jusqu\'à ' + MAX_SELECTION + ' types de règles, ou joue avec toutes :';
  accueil.appendChild(selectorLabel);

  var grouped = getGroupedCategories();
  var groupNames = Object.keys(grouped);

  // "Toutes" toggle
  var allLabel = document.createElement('label');
  allLabel.className = 'cat-option cat-option-all';
  var allCb = document.createElement('input');
  allCb.type = 'checkbox';
  allCb.checked = true;
  allCb.className = 'cat-checkbox';
  allLabel.appendChild(allCb);
  allLabel.appendChild(document.createTextNode(' Toutes les questions'));
  accueil.appendChild(allLabel);

  var catContainer = document.createElement('div');
  catContainer.className = 'cat-container';
  var checkboxes = [];

  for (var g = 0; g < groupNames.length; g++) {
    var groupName = groupNames[g];
    var cats = grouped[groupName];

    var groupDiv = document.createElement('div');
    groupDiv.className = 'cat-group';

    var groupTitle = document.createElement('div');
    groupTitle.className = 'cat-group-title';
    groupTitle.textContent = GROUP_LABELS[groupName] || groupName;
    groupDiv.appendChild(groupTitle);

    for (var c = 0; c < cats.length; c++) {
      (function (cat) {
        var label = document.createElement('label');
        label.className = 'cat-option';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = cat;
        cb.disabled = true;
        cb.className = 'cat-checkbox';
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + cat));
        groupDiv.appendChild(label);
        checkboxes.push(cb);
      })(cats[c]);
    }

    catContainer.appendChild(groupDiv);
  }
  accueil.appendChild(catContainer);

  function updateState() {
    var isAll = allCb.checked;
    var checkedCount = 0;
    for (var j = 0; j < checkboxes.length; j++) {
      if (isAll) {
        checkboxes[j].checked = false;
        checkboxes[j].disabled = true;
        checkboxes[j].parentElement.classList.remove('selected');
      } else {
        if (checkboxes[j].checked) checkedCount++;
      }
    }
    if (!isAll) {
      for (var j = 0; j < checkboxes.length; j++) {
        if (!checkboxes[j].checked) {
          checkboxes[j].disabled = checkedCount >= MAX_SELECTION;
        } else {
          checkboxes[j].disabled = false;
          checkboxes[j].parentElement.classList.add('selected');
        }
        if (!checkboxes[j].checked) {
          checkboxes[j].parentElement.classList.remove('selected');
        }
      }
    }
    allLabel.classList.toggle('selected', isAll);
    btn.disabled = !isAll && checkedCount === 0;
  }

  allCb.addEventListener('change', function () {
    if (!allCb.checked) {
      for (var j = 0; j < checkboxes.length; j++) {
        checkboxes[j].disabled = false;
      }
    }
    updateState();
  });

  for (var k = 0; k < checkboxes.length; k++) {
    checkboxes[k].addEventListener('change', function () {
      allCb.checked = false;
      updateState();
    });
  }

  var btn = document.createElement('button');
  btn.textContent = 'Commencer';
  btn.className = 'btn-commencer';
  btn.addEventListener('click', function () {
    var selectedCats = [];
    if (!allCb.checked) {
      for (var j = 0; j < checkboxes.length; j++) {
        if (checkboxes[j].checked) {
          selectedCats.push(checkboxes[j].value);
        }
      }
    }
    startSession(selectedCats);
  });
  accueil.appendChild(btn);

  updateState();
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
    showWelcomeScreen();
  });
  resultat.appendChild(btn);
}

// ---------------------------------------------------------------------------
// Session Flow
// ---------------------------------------------------------------------------

/**
 * Démarre une nouvelle session : charge les phrases nécessaires, sélectionne, réinitialise l'état.
 * @param {Array<string>} selectedCategories - Catégories choisies (vide = toutes)
 */
async function startSession(selectedCategories) {
  // Afficher un indicateur de chargement
  var accueil = document.getElementById('ecran-accueil');
  var btn = accueil.querySelector('.btn-commencer');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Chargement…';
  }

  try {
    var pool;
    if (selectedCategories && selectedCategories.length > 0) {
      pool = await loadPhrasesByCategories(selectedCategories);
    } else {
      pool = await loadAllPhrases();
    }

    if (pool.length < SESSION_SIZE) {
      var effectiveSize = pool.length;
      sessionState.phrases = selectSessionPhrases(pool, effectiveSize);
    } else {
      sessionState.phrases = selectSessionPhrases(pool, SESSION_SIZE);
    }
    sessionState.currentIndex = 0;
    sessionState.score = 0;
    sessionState.results = [];
    showQuestionScreen(sessionState.phrases[0], 1, sessionState.phrases.length);
  } catch (err) {
    accueil.innerHTML = '<h1>Erreur</h1><p>' + err.message + '</p>';
  }
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

/**
 * Point d'entrée de l'application.
 * Charge le manifest, affiche l'écran d'accueil.
 */
function init() {
  loadManifest()
    .then(function () {
      showWelcomeScreen();
    })
    .catch(function (err) {
      var accueil = document.getElementById('ecran-accueil');
      accueil.innerHTML = '<h1>Erreur</h1><p>' + err.message + '</p>';
    });
}

document.addEventListener('DOMContentLoaded', init);
