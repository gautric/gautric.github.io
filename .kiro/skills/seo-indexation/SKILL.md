---
name: seo-indexation
description: Améliorer le référencement naturel et l'indexation du blog Hugo Greg. I/O (g.autric.net) dans Google et Bing. À utiliser pour toute demande SEO, indexation, Google Search Console, Bing Webmaster Tools, IndexNow, sitemap, robots.txt, balise canonical, meta description, title, Open Graph, données structurées JSON-LD, rich results, Core Web Vitals, ou pour relire un article avant publication sous l'angle du référencement. Use for SEO, search indexing, sitemap, structured data and search engine visibility of this Hugo site.
---

# SEO et indexation — Blog Greg. I/O

Objectif : que chaque article publié soit **découvert**, **indexé** et **présenté correctement** par Google et Bing, sans dégrader le site ni casser des URL déjà indexées.

## Contexte du projet

| Élément | Valeur |
|---|---|
| **Générateur** | Hugo (CI : 0.157.0 extended), config `hugo.yml` |
| **Thème** | `["custom", "hugo-notice", "PaperMod"]` : `themes/custom` surcharge PaperMod |
| **Domaine** | `https://g.autric.net` (fichiers `CNAME` et `static/CNAME`) |
| **Hébergement** | GitHub Pages, déploiement par `.github/workflows/hugo.yml` sur push `master` |
| **Langue** | `languageCode: fr`, quelques articles en anglais (`*-en.markdown`, `*-english-version.markdown`) |
| **Permaliens** | `/blog/:year/:month/:day/:slug` |
| **Robots** | `static/robots.txt` (sitemap déclaré), `enableRobotsTXT: true` |
| **Sitemap** | généré par Hugo : `/sitemap.xml` |
| **Balises SEO** | émises par PaperMod (`partials/head.html`, `templates/opengraph.html`, `twitter_cards.html`, `schema_json.html`) car `params.env: production` |

PaperMod produit déjà : `<title>`, meta description (front matter `description`, sinon `params.description` du site), canonical (`canonicalURL` en front matter ou permalien), meta robots (`robotsNoIndex: true` pour exclure une page), Open Graph, Twitter Cards, JSON-LD `BlogPosting` et `BreadcrumbList`, balises de vérification `params.analytics.google|bing.SiteVerificationTag`.

## Règles

- **Ne jamais modifier `themes/PaperMod/`.** Toute surcharge va dans `themes/custom/layouts/` (même chemin relatif que dans PaperMod). Les ajouts dans `<head>` passent par `themes/custom/layouts/partials/extend_head.html`.
- **Ne jamais changer une URL publiée** (slug, titre sans slug, date, permalien, `removePathAccents`) sans ajouter `aliases:` vers l'ancienne URL dans le front matter. Hugo génère alors une redirection HTML avec canonical. Toute modification d'URL est une décision à faire valider par l'utilisateur.
- **Titre sans `slug` = URL dérivée du titre.** Retoucher le titre d'un ancien article sans `slug` change son URL. Figer d'abord `slug:` à la valeur actuelle (lisible dans `public/` ou le sitemap en ligne), puis modifier le titre.
- **Rédaction** : les `title` et `description` respectent le steering `writing-style.md` (sobre, factuel, pas de ton marketing, pas de première personne). Pas de bourrage de mots-clés. La meta `keywords` est ignorée par Google : ne pas y investir de temps.
- **Pas de modification de `hugo.yml` ou du workflow GitHub Actions** sans accord explicite : ces fichiers touchent tout le site.
- **Auditer un build de production**, jamais la sortie de `hugo server` : elle contient des URL `localhost` et les brouillons.

## Procédure

### 1. Auditer

Build de production dans un répertoire temporaire (ne touche pas `public/`), puis audit :

```bash
# Build identique à la CI, hors de public/
TZ=Europe/Paris HUGO_ENVIRONMENT=production hugo --gc --minify \
  --baseURL https://g.autric.net/ --destination /tmp/seo-audit-build --noBuildLock

# Audit sources + rendu (code de sortie 1 si erreur)
python3 .kiro/skills/seo-indexation/scripts/audit_seo.py --public /tmp/seo-audit-build

# Audit d'un seul article (avant publication)
python3 .kiro/skills/seo-indexation/scripts/audit_seo.py --file content/posts/<article>.markdown
```

Le script contrôle : `title` (≤ 60 caractères), `description` (70 à 160), `slug`, `tags`, `date`, H1 dans le corps, images sans texte alternatif, contenu court, image Open Graph par défaut, URL du sitemap et des canonical, `robots.txt`, `noindex`, JSON-LD, URL non ASCII, clé IndexNow, `enableGitInfo`.

### 2. Corriger le contenu (article par article)

Front matter cible d'un article :

```yaml
---
title: "Titre explicite, terme principal en tête, 60 caractères max"
slug: "terme-principal-court-sans-accents"       # figé une fois publié
date: 2026-11-09
lastmod: 2026-11-15                              # optionnel, si mise à jour significative
draft: false
description: "Une ou deux phrases, 120 à 160 caractères : le problème traité et ce que le lecteur en retire."
categories: ["blog"]
tags: ["aws", "hugo"]                            # 3 à 8 tags existants de préférence
cover:
  image: "/img/<article>/cover.png"              # 1200×630 px, sert d'og:image
  alt: "Description de l'image"
# aliases: ["/blog/2015/03/18/ancienne-url/"]    # si l'URL change
# robotsNoIndex: true                            # pour exclure la page de l'index
---
```

Points de contrôle dans le corps :

- Pas de `# H1` : le titre de la page est déjà le H1. Structurer en `##` puis `###`.
- Chaque image a un texte alternatif utile (`![Schéma de l'architecture IoT](...)`, `<img alt="...">`).
- Le terme principal apparaît dans le premier paragraphe et dans au moins un `##`.
- Liens internes vers 1 à 3 articles connexes du blog, avec un texte d'ancre descriptif (pas « ici »).
- Articles en anglais : ajouter un lien croisé avec la version française quand elle existe. Le site n'est pas multilingue au sens Hugo, `hreflang` n'est donc pas généré : voir `reference.md` avant d'introduire `lang`.

Prioriser les corrections par valeur : articles récents et articles qui reçoivent déjà des impressions dans Search Console d'abord, archives 2015-2016 ensuite.

### 3. Corriger le site (après validation de l'utilisateur)

Voir `reference.md` pour le détail et les extraits de configuration :

- image Open Graph par défaut (`params.images`) présente dans `static/` ;
- `enableGitInfo: true` pour un `<lastmod>` fiable dans le sitemap (Google n'utilise `lastmod` que s'il est exact) ;
- vérification de propriété Google et Bing ;
- IndexNow pour Bing après chaque déploiement ;
- pages de taxonomie (`/tags/`, `/categories/`) : les garder ou les passer en `noindex` est un **trade-off** à présenter, pas à appliquer d'office.

### 4. Vérifier

- Relancer le build de production et `audit_seo.py` : zéro erreur sur les fichiers modifiés.
- Contrôler une page rendue : `grep -E 'canonical|og:image|description|ld\+json' /tmp/seo-audit-build/blog/<chemin>/index.html`.
- Si une URL a changé : vérifier que l'ancienne URL existe dans le build (page d'alias).
- Après déploiement : test des résultats enrichis (Rich Results Test) et inspection d'URL dans Search Console, à faire par l'utilisateur.

## Livrable attendu

Terminer par un compte rendu court : erreurs et avertissements avant/après (chiffres de l'audit), fichiers modifiés, URL modifiées et alias ajoutés, actions restant à faire côté Search Console ou Bing Webmaster Tools, décisions en attente de l'utilisateur.
