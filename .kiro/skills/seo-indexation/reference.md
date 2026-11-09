# Référence SEO — Blog Greg. I/O

Détails et extraits prêts à l'emploi pour les corrections de niveau site. Chaque changement de `hugo.yml`, de `themes/custom/layouts/` ou du workflow CI est présenté à l'utilisateur avant d'être appliqué.

## Constats connus (audit du 9 novembre 2026)

| **Constat** | **Impact** | **Correction proposée** |
|---|---|---|
| **42 articles sur 46 sans `description`** | La meta description de tous ces articles est celle du site : snippets identiques, Google réécrit | Rédiger une `description` par article, en commençant par les plus récents |
| **`/img/og-default.png` absent de `static/`** | `og:image` en 404 sur toutes les pages sans `cover.image` : aperçus LinkedIn/X vides | Créer l'image (1200×630 px) dans `static/img/og-default.png` |
| **`<html lang="en">` et JSON-LD `inLanguage: "en"`** | Signal de langue erroné pour un blog en français | `defaultContentLanguage: fr` dans `hugo.yml` |
| **`/blog/` deux fois dans le sitemap** | `content/blog.md` et la section `posts` (permalien `/blog/`) produisent la même URL | Choisir une seule source (décision utilisateur) |
| **`/thanks/` dans le sitemap** | Page de confirmation de formulaire, sans valeur en recherche | `robotsNoIndex: true` et `sitemap: {disable: true}` dans `content/thanks.md` |
| **Pas d'`enableGitInfo`** | `<lastmod>` = date de publication, jamais de dernière modification | `enableGitInfo: true` (la CI fait déjà `fetch-depth: 0`) |
| **URL avec accents encodés** (8 articles) | Fonctionnel, mais URL longues et peu lisibles une fois partagées | Ne pas changer les URL existantes. Pour les nouveaux articles : `slug` ASCII |
| **Titres de plus de 60 caractères** | Tronqués dans les résultats | Raccourcir uniquement si `slug` est figé |
| **124 pages de taxonomie dans le sitemap** | Beaucoup de tags à un seul article : pages minces | Trade-off à discuter, voir plus bas |

## Configuration `hugo.yml`

```yaml
# Langue du site : corrige <html lang> et inLanguage du JSON-LD
defaultContentLanguage: fr

# Date de dernière modification issue de git (sitemap, og, JSON-LD)
enableGitInfo: true

# Ordre de priorité pour .Lastmod : front matter lastmod, puis git, puis date
frontmatter:
  lastmod: [lastmod, :git, date]

params:
  analytics:
    google:
      SiteVerificationTag: "<jeton fourni par Search Console>"
    bing:
      SiteVerificationTag: "<jeton fourni par Bing Webmaster Tools>"
```

La vérification par balise meta n'est utile que si la propriété n'est pas déjà validée par DNS. Bing Webmaster Tools peut importer les sites depuis Search Console, ce qui évite une seconde vérification.

**Point d'attention `enableGitInfo`** : un commit de masse (reformatage, migration) met à jour le `lastmod` de toutes les pages. Google ignore `lastmod` s'il le juge peu fiable. Dans ce cas, renseigner `lastmod` dans le front matter des seuls articles réellement mis à jour et retirer `:git` de la liste.

## Sitemap

Hugo génère `sitemap.xml` à partir de toutes les pages. Exclure une page :

```yaml
# front matter de la page
sitemap:
  disable: true
robotsNoIndex: true   # meta robots noindex, nofollow (PaperMod)
```

Exclure toutes les pages de taxonomie (à valider avec l'utilisateur) : surcharger `themes/custom/layouts/sitemap.xml` à partir du modèle intégré de Hugo et filtrer `.Kind` différent de `taxonomy` et `term`, ou ajouter `robotsNoIndex` via une cascade.

**Trade-off taxonomies** : les pages `/tags/<tag>/` aident la découverte et le maillage interne, mais un tag porté par un seul article produit une page quasi vide. Options : conserver, `noindex` sur les termes de moins de N articles, ou réduire le nombre de tags. Ne pas décider à la place de l'utilisateur.

## Image Open Graph

- Par défaut : `params.images: ["/img/og-default.png"]`, fichier attendu dans `static/img/og-default.png`.
- Par article : `cover.image` dans le front matter. `cover.hidden: true` est déjà actif sur le site, l'image sert donc aux balises sans être affichée.
- Format recommandé : 1200×630 px, PNG ou JPEG, moins de 1 Mo, texte lisible en miniature.
- Google Discover exige des images d'au moins 1200 px de large ; `max-image-preview:large` est le comportement par défaut sans meta robots restrictive.

## Données structurées

PaperMod génère `BlogPosting` (titre, description, dates, image, auteur, éditeur) et `BreadcrumbList` dans `partials/templates/schema_json.html`.

- **Auteur** : `params.author` est commenté dans `hugo.yml`. Sans auteur, le JSON-LD n'a pas de champ `author` exploitable. Proposer `params.author: "Greg. AUTRIC"` (forme à confirmer avec l'utilisateur).
- Pour enrichir le schéma (par exemple `author.url` vers `/apropos/`), copier `schema_json.html` dans `themes/custom/layouts/partials/templates/` puis le modifier. Ne jamais éditer la copie de PaperMod.
- Valider avec le [Rich Results Test](https://search.google.com/test/rich-results) et le [Schema Markup Validator](https://validator.schema.org/) après déploiement.

## Articles en anglais et `hreflang`

Le site est monolingue pour Hugo (`languageCode: fr`). Les articles anglais existent comme articles distincts, sans lien de traduction. Deux options :

| **Option** | **Avantages** | **Inconvénients** |
|---|---|---|
| **Statu quo + lien croisé manuel** | Aucun risque sur les URL | Pas de `hreflang`, Google déduit la langue du contenu |
| **Mode multilingue Hugo** (`languages:`, `translationKey`) | `hreflang` et `og:locale:alternate` générés | Changement de structure, risque de modifier des URL, à planifier |

Option recommandée pour un faible volume d'articles anglais : statu quo, avec `locale: en_US` en front matter des articles anglais pour corriger `og:locale`.

## IndexNow (Bing, Yandex, Seznam, Naver)

Google ne participe pas à IndexNow. Mise en place :

1. Générer une clé : `python3 -c "import uuid; print(uuid.uuid4().hex)"`.
2. Créer `static/<cle>.txt` contenant uniquement la clé. Le fichier sera servi à `https://g.autric.net/<cle>.txt`.
3. Après déploiement, soumettre :

```bash
INDEXNOW_KEY=<cle> python3 .kiro/skills/seo-indexation/scripts/indexnow_submit.py --since-days 2
```

Le script lit le sitemap en ligne, retient les URL dont `<lastmod>` est récent, vérifie que la clé est bien servie, puis envoie un POST groupé à `api.indexnow.org`. Codes de retour : 200/202 accepté, 400 requête invalide, 403 clé invalide, 422 URL hors domaine, 429 trop de requêtes.

**Automatisation possible** (à proposer, pas à appliquer d'office) : un job `indexnow` dans `.github/workflows/hugo.yml`, après `deploy`, avec la clé en secret `INDEXNOW_KEY`. La clé n'est pas un secret au sens strict (elle est publique dans le fichier `.txt`), mais la garder hors du code évite de la dupliquer.

## Google Search Console

- Propriété de domaine `g.autric.net` (validation DNS) ou préfixe d'URL `https://g.autric.net/`.
- Soumettre `https://g.autric.net/sitemap.xml` une fois. Le ping de sitemap n'existe plus depuis fin 2023.
- Rapport **Pages** : traiter en priorité « Explorée, actuellement non indexée » (souvent contenu jugé mince ou dupliqué) et « Page en double sans URL canonique sélectionnée ».
- Inspection d'URL puis « Demander une indexation » pour un nouvel article important. Quota limité, à réserver aux nouveaux contenus.
- L'API Indexing de Google est réservée aux offres d'emploi et aux diffusions en direct : ne pas l'utiliser pour un blog.

## Bing Webmaster Tools

- Import depuis Search Console (vérification et sitemaps repris).
- Le ping anonyme de sitemap est supprimé depuis 2022 : utiliser IndexNow ou l'outil de soumission d'URL.
- Bing alimente aussi Copilot et plusieurs moteurs tiers (DuckDuckGo, Ecosia) : une bonne indexation Bing a un effet au-delà de Bing.

## Performance (Core Web Vitals)

Points propres à ce site, à mesurer avec PageSpeed Insights avant d'agir :

- La page d'accueil charge three.js et OrbitControls depuis deux CDN (`partials/index_profile.html`) : script lourd sur la page la plus visitée. Pistes : `defer`, chargement différé à l'interaction, ou image statique sur mobile.
- `assets/js/jquery-3.7.1.min.js` : vérifier s'il est encore utilisé.
- Images d'articles : ajouter `width`/`height` ou `loading="lazy"` sur les grandes images en `<img>` pour limiter le CLS.

## Sources

- [Google : fin du ping de sitemap et usage de lastmod](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
- [Bing : suppression de la soumission anonyme de sitemap](https://community.bing.com/webmaster/may-2022/Spring-cleaning-Removed-Bing-anonymous-sitemap-submission)
- [Documentation IndexNow](https://www.indexnow.org/documentation)
- [Bing : mise en place d'IndexNow](https://www.bing.com/indexnow/getstarted)
