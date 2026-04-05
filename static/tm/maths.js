// Quiz de Mathématiques — Géométrie (QCM)

var SESSION_SIZE = 15;

var sessionState = {
  questions: [],
  currentIndex: 0,
  score: 0,
  results: []
};

var manifest = null;
var rulesCache = {};

// ---------------------------------------------------------------------------
// DataLoader
// ---------------------------------------------------------------------------

async function loadManifest() {
  if (manifest) return manifest;
  var response;
  try {
    response = await fetch('regles/manifest-maths.json');
  } catch (err) {
    throw new Error('Impossible de charger le manifest maths : ' + err.message);
  }
  if (!response.ok) {
    throw new Error('Impossible de charger le manifest maths (HTTP ' + response.status + ')');
  }
  manifest = await response.json();
  return manifest;
}

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
    if (validateQuestion(data[i])) {
      valid.push(data[i]);
    } else {
      console.warn('Question ignorée (invalide) dans ' + relativePath + ' :', data[i]);
    }
  }
  rulesCache[relativePath] = valid;
  return valid;
}

async function loadAllQuestions() {
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

async function loadQuestionsByCategories(categoryNames) {
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

function validateQuestion(q) {
  if (!q || typeof q !== 'object') return false;
  if (typeof q.id !== 'number') return false;
  if (typeof q.question !== 'string' || q.question.length === 0) return false;
  if (!Array.isArray(q.choices) || q.choices.length < 2) return false;
  if (typeof q.correctIndex !== 'number') return false;
  if (q.correctIndex < 0 || q.correctIndex >= q.choices.length) return false;
  if (typeof q.explanation !== 'string' || q.explanation.length === 0) return false;
  if (typeof q.category !== 'string' || q.category.length === 0) return false;
  return true;
}

// ---------------------------------------------------------------------------
// QuizEngine
// ---------------------------------------------------------------------------

function selectSessionQuestions(allQuestions, count) {
  var n = count || SESSION_SIZE;
  var copy = allQuestions.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, n);
}

// ---------------------------------------------------------------------------
// UIRenderer
// ---------------------------------------------------------------------------

function getGroupedCategories() {
  if (!manifest) return {};
  var result = {};
  var groupNames = Object.keys(manifest);
  for (var g = 0; g < groupNames.length; g++) {
    result[groupNames[g]] = Object.keys(manifest[groupNames[g]]).sort();
  }
  return result;
}

var GROUP_LABELS = {
  'géométrie': 'Géométrie'
};

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
  titre.textContent = 'Quiz de Géométrie';
  accueil.appendChild(titre);

  var desc = document.createElement('p');
  desc.textContent = 'Trouve la bonne définition pour chaque figure ou notion géométrique. ' + SESSION_SIZE + ' questions par partie !';
  accueil.appendChild(desc);

  var selectorLabel = document.createElement('p');
  selectorLabel.className = 'selector-label';
  selectorLabel.textContent = 'Choisis jusqu\'à ' + MAX_SELECTION + ' catégories, ou joue avec toutes :';
  accueil.appendChild(selectorLabel);

  var grouped = getGroupedCategories();
  var groupNames = Object.keys(grouped);

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
 * Affiche une question QCM avec les choix cliquables.
 */
function showQuestionScreen(q, questionNumber, totalQuestions) {
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
  progress.textContent = 'Question ' + questionNumber + '/' + totalQuestions;
  question.appendChild(progress);

  var consigne = document.createElement('h2');
  consigne.textContent = q.question;
  question.appendChild(consigne);

  var choicesContainer = document.createElement('div');
  choicesContainer.className = 'choices-container';

  // Mélanger l'ordre des choix tout en gardant la trace du bon index
  var indices = [];
  for (var i = 0; i < q.choices.length; i++) {
    indices.push(i);
  }
  // Fisher-Yates sur les indices
  for (var i = indices.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  for (var idx = 0; idx < indices.length; idx++) {
    (function (originalIndex, displayIndex) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = q.choices[originalIndex];
      btn.addEventListener('click', function () {
        if (answered) return;
        answered = true;

        var allBtns = choicesContainer.querySelectorAll('.choice-btn');
        for (var b = 0; b < allBtns.length; b++) {
          allBtns[b].classList.add('disabled');
        }

        var wasCorrect = originalIndex === q.correctIndex;
        if (wasCorrect) {
          btn.classList.add('choice-correct');
        } else {
          btn.classList.add('choice-incorrect');
          // Montrer la bonne réponse
          for (var b = 0; b < allBtns.length; b++) {
            // Retrouver le bouton de la bonne réponse via le texte
            if (allBtns[b].textContent === q.choices[q.correctIndex]) {
              allBtns[b].classList.add('choice-correct');
            }
          }
        }

        sessionState.score += wasCorrect ? 1 : 0;
        sessionState.results.push({
          question: q,
          selectedIndex: originalIndex,
          wasCorrect: wasCorrect
        });

        showFeedback(q, wasCorrect);
      });
      choicesContainer.appendChild(btn);
    })(indices[idx], idx);
  }

  question.appendChild(choicesContainer);
}

function showFeedback(q, wasCorrect) {
  var question = document.getElementById('ecran-question');

  var feedback = document.createElement('div');
  feedback.className = 'feedback ' + (wasCorrect ? 'correct' : 'incorrect');

  if (wasCorrect) {
    feedback.innerHTML = '<p><strong>Bravo !</strong> C\'est la bonne réponse.</p>';
  } else {
    feedback.innerHTML = '<p><strong>Pas tout à fait.</strong></p>' +
      '<p>La bonne réponse était : <strong>' + q.choices[q.correctIndex] + '</strong></p>';
  }
  var expl = document.createElement('p');
  expl.textContent = q.explanation;
  feedback.appendChild(expl);

  question.appendChild(feedback);

  var btn = document.createElement('button');
  btn.textContent = 'Suivant';
  btn.className = 'btn-suivant';
  btn.addEventListener('click', function () {
    sessionState.currentIndex++;
    if (sessionState.currentIndex < sessionState.questions.length) {
      showQuestionScreen(
        sessionState.questions[sessionState.currentIndex],
        sessionState.currentIndex + 1,
        sessionState.questions.length
      );
    } else {
      showResultScreen(sessionState.results, sessionState.score, sessionState.questions.length);
    }
  });
  question.appendChild(btn);
}

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
    msg.textContent = 'Parfait ! Tu connais toutes les définitions !';
  } else if (score >= total * 0.75) {
    msg.textContent = 'Très bien ! Continue comme ça !';
  } else if (score >= total * 0.5) {
    msg.textContent = 'Pas mal ! Révise encore un peu les définitions.';
  } else {
    msg.textContent = 'Courage ! Relis les définitions et réessaie.';
  }
  resultat.appendChild(msg);

  var recap = document.createElement('div');
  recap.className = 'recap';
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var item = document.createElement('div');
    item.className = 'recap-item ' + (r.wasCorrect ? 'correct' : 'incorrect');

    var num = document.createElement('strong');
    num.textContent = (i + 1) + '. ' + r.question.question;
    item.appendChild(num);

    var detail = document.createElement('p');
    detail.style.margin = '0.3rem 0 0 0';
    detail.style.fontSize = '0.95rem';
    if (r.wasCorrect) {
      detail.textContent = '✓ ' + r.question.choices[r.question.correctIndex];
    } else {
      detail.textContent = '✗ Ta réponse : ' + r.question.choices[r.selectedIndex] +
        ' — Bonne réponse : ' + r.question.choices[r.question.correctIndex];
    }
    item.appendChild(detail);

    var explP = document.createElement('p');
    explP.style.margin = '0.2rem 0 0 0';
    explP.style.fontSize = '0.9rem';
    explP.style.fontStyle = 'italic';
    explP.textContent = r.question.explanation;
    item.appendChild(explP);

    recap.appendChild(item);
  }
  resultat.appendChild(recap);

  var btnRow = document.createElement('div');
  btnRow.style.marginTop = '1.5rem';
  btnRow.style.display = 'flex';
  btnRow.style.gap = '1rem';
  btnRow.style.justifyContent = 'center';
  btnRow.style.flexWrap = 'wrap';

  var btnRestart = document.createElement('button');
  btnRestart.textContent = 'Recommencer';
  btnRestart.className = 'btn-recommencer';
  btnRestart.addEventListener('click', function () {
    showWelcomeScreen();
  });
  btnRow.appendChild(btnRestart);

  var btnHub = document.createElement('a');
  btnHub.href = 'index.html';
  btnHub.textContent = '← Matières';
  btnHub.className = 'btn-hub-link';
  btnRow.appendChild(btnHub);

  resultat.appendChild(btnRow);
}

// ---------------------------------------------------------------------------
// Session Flow
// ---------------------------------------------------------------------------

async function startSession(selectedCategories) {
  var accueil = document.getElementById('ecran-accueil');
  var btn = accueil.querySelector('.btn-commencer');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Chargement…';
  }

  try {
    var pool;
    if (selectedCategories && selectedCategories.length > 0) {
      pool = await loadQuestionsByCategories(selectedCategories);
    } else {
      pool = await loadAllQuestions();
    }

    if (pool.length < SESSION_SIZE) {
      sessionState.questions = selectSessionQuestions(pool, pool.length);
    } else {
      sessionState.questions = selectSessionQuestions(pool, SESSION_SIZE);
    }
    sessionState.currentIndex = 0;
    sessionState.score = 0;
    sessionState.results = [];
    showQuestionScreen(sessionState.questions[0], 1, sessionState.questions.length);
  } catch (err) {
    accueil.innerHTML = '<h1>Erreur</h1><p>' + err.message + '</p>';
  }
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

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
