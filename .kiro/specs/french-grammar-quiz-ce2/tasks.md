# Tâches — Quiz de Grammaire Française CE2

## Task 1: Créer la structure de fichiers et le HTML de base

- [x] 1.1 Créer le répertoire `static/tm/` et le fichier `index.html` avec la structure HTML5, les liens vers `style.css` et `app.js`, et les conteneurs pour les 3 écrans (accueil, question, résultat)
- [x] 1.2 Créer le fichier `static/tm/style.css` avec les styles de base : mise en page centrée, typographie adaptée aux enfants (grande taille), couleurs vives, styles pour les mots cliquables, feedback correct/incorrect, et responsive mobile
- [x] 1.3 Créer le fichier `static/tm/app.js` avec le squelette des fonctions : `loadPhrases()`, `validatePhrase()`, `selectSessionPhrases()`, `checkAnswer()`, `splitSentence()`, `showWelcomeScreen()`, `showQuestionScreen()`, `showFeedback()`, `showResultScreen()`, et le point d'entrée `init()`

## Task 2: Créer la banque de 1000 phrases (phrases.json)

- [ ] 2.1 Créer `static/tm/phrases.json` avec les 250 premières phrases (id 1-250) couvrant : accords sujet-verbe, accords en genre, accords en nombre, homophones a/à et et/est
- [ ] 2.2 Ajouter les phrases 251-500 couvrant : homophones on/ont, son/sont, ou/où, ce/se
- [ ] 2.3 Ajouter les phrases 501-750 couvrant : conjugaison présent, futur
- [ ] 2.4 Ajouter les phrases 751-1000 couvrant : pluriel des noms, féminin des adjectifs, déterminants
- [ ] 2.5 Valider que `phrases.json` contient exactement 1000 entrées, que chaque entrée a tous les champs requis (id, sentence, errorIndex, correctedWord, explanation, category), et que errorIndex est valide pour chaque phrase

## Task 3: Implémenter la logique applicative (app.js)

- [x] 3.1 Implémenter `loadPhrases()` : fetch de `phrases.json`, parsing JSON, validation de chaque phrase avec `validatePhrase()`, gestion d'erreur si le fichier ne charge pas
- [x] 3.2 Implémenter `validatePhrase()` : vérifier la présence de tous les champs requis et que `errorIndex` est un index valide dans `sentence.split(" ")`
- [x] 3.3 Implémenter `selectSessionPhrases()` : shuffle Fisher-Yates et sélection de 20 phrases uniques
- [x] 3.4 Implémenter `checkAnswer()` : retourner `true` si `clickedIndex === phrase.errorIndex`
- [x] 3.5 Implémenter `splitSentence()` : découper la phrase en mots sur les espaces

## Task 4: Implémenter le rendu UI

- [x] 4.1 Implémenter `showWelcomeScreen()` : titre, description courte, bouton "Commencer" qui lance une session
- [x] 4.2 Implémenter `showQuestionScreen()` : afficher la phrase avec chaque mot dans un `<span>` cliquable, indicateur de progression (ex: "Question 3/20"), désactiver les clics après la première réponse
- [x] 4.3 Implémenter `showFeedback()` : surligner le mot cliqué en vert (correct) ou rouge (incorrect), afficher le mot corrigé et l'explication, bouton "Suivant" pour passer à la question suivante
- [x] 4.4 Implémenter `showResultScreen()` : afficher le score (ex: "15/20"), récapitulatif de chaque question avec la phrase, la réponse de l'élève, et l'explication, bouton "Recommencer" pour une nouvelle session

## Task 5: Intégration et point d'entrée

- [x] 5.1 Implémenter la fonction `init()` : charger les phrases, afficher l'écran d'accueil, gérer le flux complet accueil → questions → résultat → recommencer
- [x] 5.2 Vérifier que l'application fonctionne en ouvrant `static/tm/index.html` directement dans un navigateur (pas besoin de serveur Hugo)

## Task 6: Tests

- [ ] 6.1 Créer `static/tm/tests/test.html` et `static/tm/tests/test.js` avec les tests unitaires : vérifier que phrases.json a 1000 entrées, toutes les catégories sont présentes, splitSentence gère la ponctuation, cas limite de 20 phrases exactement
- [ ] 6.2 Créer les tests property-based avec fast-check : Property 1 (validité structurelle), Property 2 (20 phrases uniques), Property 3 (checkAnswer), Property 4 (splitSentence), Property 5 (score invariant)
