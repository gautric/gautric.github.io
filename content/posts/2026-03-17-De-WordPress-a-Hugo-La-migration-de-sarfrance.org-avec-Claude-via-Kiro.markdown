---
title: "De WordPress à Hugo — La migration de sarfrance.org avec Claude via Kiro"
date: 2026-03-17
draft: false
tags: ["hugo", "aws", "github", "wordpress", "migration", "genAI", "kiro", "claude", "anthropic"]
---

## Pourquoi migrer ?

[SAR France](https://www.sarfrance.org) — la section française des *Sons of the American Revolution* — dispose d'un site institutionnel qui existe depuis de nombreuses années sous WordPress. WordPress est une plateforme adaptée pour démarrer rapidement, mais au fil du temps, les contraintes s'accumulent : mises à jour de plugins à gérer, base de données MySQL à maintenir, hébergement dynamique coûteux, et une inertie éditoriale qui ralentit toute contribution ponctuelle.

L'idée a germé simplement : **et si le site était un ensemble de fichiers Markdown stockés dans GitHub, compilés en HTML statique, servis depuis AWS à un coût maîtrisé ?**

C'est ce que permet [Hugo](https://gohugo.io), le générateur de sites statiques écrit en Go. C'est ce projet que j'ai mené à bien, avec un outillage adapté.

---

## L'outillage : Claude Anthropic via Kiro

La migration d'un site existant vers une nouvelle architecture implique un travail conséquent : extraction du contenu, reformatage des pages, reconstruction de la navigation, recréation du thème, et validation de l'intégrité des données.

Pour ce projet, j'ai utilisé **[Kiro](https://kiro.dev)**, un environnement de développement assisté par IA qui s'appuie sur **[Claude d'Anthropic](https://www.anthropic.com/claude)** comme moteur de raisonnement. Cette combinaison s'est avérée efficace :

- Kiro m'a permis de piloter la migration de façon structurée, en gardant un suivi des tâches directement dans le dépôt (le fichier `TASKS.md` en témoigne)
- Claude a analysé les pages WordPress existantes, reformaté le contenu en Markdown propre, suggéré l'architecture des dossiers et généré les templates Hugo adaptés au style institutionnel de SAR France

Ce qui aurait pris plusieurs semaines de travail manuel a été ramené à quelques jours de développement ciblé. L'IA ne remplace pas la décision humaine — le choix de la palette de couleurs marine/or/crème, de la typographie, du ton institutionnel — mais elle accélère l'exécution de manière significative.

---

## L'architecture résultante

Le dépôt source est public et consultable ici :  
👉 [github.com/gautric/preprod.sarfrance.org](https://github.com/gautric/preprod.sarfrance.org)

```

preprod.sarfrance.org/
├── .github/          # GitHub Actions (CI/CD, build automatique)
├── .kiro/            # Configuration et tâches Kiro
├── archetypes/       # Modèles de nouveaux contenus Hugo
├── content/          # ✅ Tout le contenu du site en Markdown
│   ├── organisation/
│   ├── histoire/
│   ├── activites/
│   └── contact/
├── data/             # Données structurées (carousel, événements…)
├── static/           # Images, PDF, fichiers statiques
├── themes/
│   └── sarfrance-theme/  # Thème custom navy/gold/cream
└── hugo.toml         # Configuration principale

```

La structure est intentionnellement lisible par n'importe quel contributeur, même sans compétences techniques avancées.

Un avantage notable de cette approche : Hugo repose sur des formats ouverts (Markdown, YAML, HTML, TOML). Le contenu n'est enfermé dans aucun format propriétaire. Si un jour l'association souhaite changer de générateur de sites ou de plateforme, la migration sera simple — les fichiers restent exploitables en l'état. Ce choix s'inscrit dans une logique open source, où la portabilité des données et la transparence du code sont des priorités.

---

## Avant / Après

### Avant — WordPress.com (SaaS)

L'ancienne version du site reposait sur **WordPress.com**, la version SaaS 
de WordPress, à 60 €/an. Cette solution présente des avantages pour 
démarrer : hébergement inclus, interface d'administration clé en main, 
pas de serveur à gérer.

Mais sur la durée, les limites sont apparues clairement :

**Flexibilité restreinte**  
La version SaaS bride considérablement les possibilités de personnalisation.
Nombre de fonctionnalités qui sont gratuites dans WordPress auto-hébergé 
deviennent des extensions payantes : formulaires avancés, import/export de 
contenu, outils SEO, redirections…

**Import/Export : un processus complexe**  
Exporter proprement son contenu depuis WordPress.com pour le migrer ailleurs 
présente des difficultés. Les outils gratuits sont limités, et récupérer 
l'intégralité du contenu structuré — pages, médias, métadonnées — sans 
passer par une extension payante reste un exercice contraignant.

**Cohérence visuelle difficile à maintenir dans le temps**  
Le mode WYSIWYG de WordPress.com est accessible au premier abord, mais il 
présente des limites sur la durée. Chaque éditeur applique ses propres styles 
inline, ses propres choix de blocs, ses propres mises en page. Sur un site 
institutionnel alimenté par plusieurs contributeurs sur plusieurs années, 
le constat est récurrent : des pages visuellement incohérentes, des styles 
qui se contredisent, des layouts qui varient selon le navigateur ou la taille 
d'écran.

Le no-code est adapté pour commencer. Il pose en revanche un problème de maintenabilité 
sur le long terme.

### Après — Hugo sur AWS

La nouvelle architecture repose sur une approche statique :

```
[Contributeur] → [Markdown sur GitHub] → [Hugo Build] → [Amazon S3 + Amazon CloudFront] → [Navigateur]
```

Le site est compilé en HTML/CSS/JS statique à chaque modification. Il n'y a plus de serveur applicatif, plus de base de données, plus de surface d'attaque dynamique.

**Aperçu de la nouvelle architecture :**

```
GitHub Repository (source de vérité)
    └─ content/ (Markdown)
    └─ data/ (YAML structuré)
    └─ themes/ (HTML/CSS/JS custom)
    └─ GitHub Actions (CI/CD automatique)
         └─ hugo build
              └─ Amazon S3 (hébergement statique)
                   └─ Amazon CloudFront (CDN mondial)
```

---

## Une réduction significative des coûts

C'est l'un des arguments concrets de cette migration.

| Poste | Ancien (WordPress.com) | Nouveau (Hugo/AWS) |
|---|---|---|
| Hébergement + CMS | ~60 €/an | ~6–12 €/an |
| Base de données | Incluse | **Aucune** |
| Mises à jour plugins | ~2–3h/an | **Aucune** |
| Certificat SSL | Inclus | Inclus (AWS Certificate Manager) |
| CDN mondial | Optionnel, payant | Inclus (Amazon CloudFront) |

Pour un site institutionnel avec un trafic modéré, le coût mensuel sur AWS reste marginal.

---

## Le contenu comme donnée : Markdown et GitHub

L'un des changements structurants est que **le site est désormais un dépôt Git**. Toute la documentation, les pages, les événements, les publications — tout est du Markdown versionné.

Ce choix ouvre des possibilités concrètes :

### Contribution simplifiée

Un membre du bureau qui souhaite corriger une date ou mettre à jour un texte peut le faire directement depuis l'interface web de GitHub, sans installer quoi que ce soit. Le [CONTRIBUTING.md](https://github.com/gautric/preprod.sarfrance.org/blob/main/CONTRIBUTING.md) du projet détaille pas à pas cette procédure, accessible à des non-développeurs.

### Historique complet

Chaque modification est tracée avec son auteur et sa date. Il est possible de revenir à n'importe quel état antérieur du site en quelques secondes.

### Pull Requests comme circuit de validation

Un rédacteur propose une modification → le webmaster la relit et la valide → le site se déploie automatiquement. C'est le workflow Git standard, adapté à la gouvernance d'une association.

### Le pipeline CI/CD : zéro intervention humaine

Le déploiement est entièrement automatisé via deux workflows GitHub Actions :

- **`hugo.yml`** : se déclenche à chaque push sur `main` et tous les jours à 6h UTC. Build Hugo v0.157.0 (extended) + Dart Sass + Node.js 24, puis déploiement sur GitHub Pages.
- **`hugo-preview.yml`** : construit une prévisualisation sur chaque Pull Request, permettant de voir le résultat avant validation.
```yaml
on:
  push:
    branches: ["main"]
  schedule:
    - cron: '0 6 * * *'   # Rebuild quotidien pour l'agenda
  workflow_dispatch:        # Déclenchement manuel si besoin
```

Le résultat : un contributeur qui corrige un texte voit la modification en ligne dans les deux minutes suivant son commit.

---

## Données complexes sans complexité de code

L'un des arguments que j'entends souvent contre les générateurs de sites statiques : *"C'est bien pour un blog, mais pour des données structurées ?"*

Hugo répond à ce besoin via ses **shortcodes** et ses **fichiers de données**.

### Exemple : la chronologie historique

SAR France a une vocation historique forte. La [page de chronologie](https://preprod.sarfrance.org/histoire/chronologie/) affiche des événements de la Guerre d'Indépendance américaine sur une frise temporelle. Avec Hugo, les données sont stockées dans un fichier YAML :

```yaml
periodes:
  - nom: "Les Colonies (1607-1763)"
    events:
      - date: "1757-09-06"
        titre: "Naissance de La Fayette"
        description: "Naissance de Marie-Joseph Paul Yves Roch Gilbert du Motier, marquis de La Fayette."
        tags:
          - france
          - personnalité
        wikipedia: "https://fr.wikipedia.org/wiki/Gilbert_du_Motier_de_La_Fayette"
```

Un template Hugo parcourt ces données et génère automatiquement la frise. Aucune ligne de JavaScript complexe, aucun plugin à maintenir.

### Exemple : l'agenda des événements

De même, les événements de l'année sont gérés via un fichier `data/` structuré, rendu par un shortcode dédié. Ajouter un événement = ajouter trois lignes dans un fichier texte. La mise en page reste cohérente sans effort.

L'[agenda](https://preprod.sarfrance.org/activites/agenda/) couvre les activités de l'association depuis 2018 jusqu'en 2026. Les événements sont typés (conférence, assemblée, commémoration, visite, exposition…) et chaque type dispose de son icône et de sa couleur dans `data/agenda.yaml` :
```yaml
types:
  commémoration:
    label: "Commémoration"
    icon: "🎖️"
    color: "#6b2737"
  conférence:
    label: "Conférence"
    icon: "🎤"
    color: "#5a6a3a"
  assemblée:
    label: "Assemblée"
    icon: "🏛️"
    color: "#2c5282"

events:
  - date: "2026-05-27"
    titre: "Cérémonies du Memorial Day"
    type: commémoration
```
Et grâce au rebuild quotidien automatique à 6h UTC via GitHub Actions, les événements passés disparaissent automatiquement de l'affichage sans aucune intervention humaine.


---

## Ce que l'IA a changé dans ce projet

Un point important : **l'IA n'a pas tout fait**. Les décisions d'architecture, le choix des couleurs, la structure de navigation, la politique de contribution — c'est du travail humain de conception.

Mais voici ce que Claude (via Kiro) a concrètement accéléré :

- **Conversion du contenu WordPress → Markdown** : analyse des exports XML, reformatage propre, correction des caractères spéciaux, normalisation des titres
- **Génération de l'architecture et des templates Hugo** : à partir d'une description du rendu souhaité, Claude a proposé des layouts fonctionnels que j'ai ensuite affinés
- **Génération des shortcodes Hugo** : les templates pour la chronologie et l'agenda ont été générés selon mes instructions afin d'obtenir la structure et le rendu souhaités
- **Rédaction de la documentation contributeur** : le guide de contribution que l'on trouve dans le [CONTRIBUTING.md](https://github.com/gautric/preprod.sarfrance.org/blob/main/CONTRIBUTING.md) a été co-rédigé avec Claude, en ciblant un public non-technique
- **Développement des pipelines GitHub Actions** : création des workflows pour build Hugo, création de helpers pour les issues via les templates 

C'est cette combinaison — vision humaine + exécution assistée par IA — qui a rendu le projet viable dans un délai raisonnable.

Un autre bénéfice concret : les administrateurs de l'association peuvent formuler leurs demandes de modification en langage naturel. Il n'est plus nécessaire de convertir manuellement ces retours en code ou de passer par un traitement technique intermédiaire. Claude, via Kiro, interprète directement les remarques et applique les modifications sur le code du site. Cela réduit la friction entre les décideurs et le code, et rend le cycle de mise à jour accessible à des profils non-techniques.

---

## Et la suite ?

Le dépôt est en pré-production ([preprod.sarfrance.org](https://preprod.sarfrance.org)). Plusieurs chantiers sont encore ouverts :


- **Formulaire de contact et paiement de cotisation** : intégration d'un endpoint Amazon API Gateway pour les formulaires, sans introduire de serveur applicatif permanent
- **Magic link** : partage sécurisé de fichiers via Amazon API Gateway, AWS Lambda, Amazon DynamoDB, Amazon SES et Amazon S3 presigned URLs — sans compte à créer
- **Enrichissement éditorial** : dictionnaire biographique des patriotes français, galerie photographique des cérémonies
- **GitHub Pages → Amazon S3** : le site est actuellement en pré-production sur GitHub Pages. La mise en production prévoit une migration vers Amazon S3 et Amazon CloudFront.

Le modèle est en place. L'infrastructure est opérationnelle. La contribution est ouverte.

---

## Conclusion

Cette migration illustre un principe : **la technologie doit servir l'organisation, pas l'inverse**. SAR France n'a pas besoin d'une équipe de développeurs pour maintenir son site — elle a besoin d'un outil simple, fiable et économique, que ses membres peuvent alimenter sans friction.

Hugo sur AWS, avec GitHub comme colonne vertébrale et Claude via Kiro comme accélérateur de migration, répond à ce besoin.

Le code source est ouvert. Les contributions sont bienvenues.

👉 [github.com/gautric/preprod.sarfrance.org](https://github.com/gautric/preprod.sarfrance.org)
