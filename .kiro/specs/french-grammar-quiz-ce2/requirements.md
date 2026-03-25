# Document d'Exigences — Quiz de Grammaire Française CE2

## Introduction

Application web monopage (SPA) de quiz de grammaire française destinée aux élèves de CE2 (8-9 ans). L'application présente des phrases contenant chacune exactement une erreur grammaticale. L'élève doit identifier le mot erroné en cliquant dessus. L'application est hébergée dans le répertoire `static/tm` d'un site Hugo existant.

## Glossaire

- **Application** : L'application web monopage (SPA) de quiz de grammaire française CE2
- **Banque_de_Phrases** : Collection de 1000 phrases françaises, chacune contenant exactement une erreur grammaticale de niveau CE2
- **Phrase** : Une phrase française contenant exactement un mot erroné et une explication de l'erreur
- **Mot_Erroné** : Le mot unique dans une phrase qui contient l'erreur grammaticale
- **Explication** : Texte pédagogique expliquant la nature de l'erreur grammaticale et la correction attendue
- **Session** : Une série de 20 questions tirées aléatoirement de la Banque_de_Phrases
- **Élève** : Utilisateur de l'Application, élève de niveau CE2 (8-9 ans)
- **Score** : Nombre de réponses correctes de l'Élève durant une Session
- **Écran_Accueil** : Page initiale de l'Application permettant de démarrer une Session
- **Écran_Question** : Page affichant une Phrase et permettant à l'Élève de cliquer sur un mot
- **Écran_Résultat** : Page affichant le Score final et le récapitulatif de la Session

## Exigences

### Exigence 1 : Banque de phrases

**User Story :** En tant qu'enseignant, je veux disposer d'une banque de 1000 phrases avec erreurs grammaticales de niveau CE2, afin que les élèves aient un large éventail d'exercices variés.

#### Critères d'acceptation

1. THE Banque_de_Phrases SHALL contain exactly 1000 Phrases in French at CE2 difficulty level.
2. THE Banque_de_Phrases SHALL store each Phrase as a JSON object containing the sentence text, the index of the Mot_Erroné, the corrected word, and an Explication.
3. WHEN a Phrase is loaded, THE Application SHALL verify that the Phrase contains exactly one Mot_Erroné.
4. THE Banque_de_Phrases SHALL cover the following CE2 grammar categories: accords sujet-verbe, accords en genre, accords en nombre, homophones grammaticaux (a/à, et/est, on/ont, son/sont, ou/où, ce/se), conjugaison au présent, conjugaison au futur, conjugaison à l'imparfait, conjugaison au passé composé, pluriel des noms, féminin des adjectifs, et déterminants.
