# Makefile — Greg. I/O (Hugo + GitHub Pages)
#
# Le déploiement réel est assuré par GitHub Actions (.github/workflows/hugo.yml)
# sur chaque push vers la branche master. Ce Makefile couvre le cycle local :
# build, prévisualisation, et publication (commit + push).

SHELL          := /bin/bash
.DEFAULT_GOAL  := help

HUGO           ?= hugo
BASE_URL       ?= https://g.autric.net
PUBLIC_DIR     ?= public
PORT           ?= 1313
BRANCH         ?= master
REMOTE         ?= origin
TZ             ?= Europe/Paris
HUGO_ENV       ?= production
MSG            ?= chore: mise à jour du contenu

export TZ

.PHONY: help
help: ## Affiche la liste des cibles disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- Prérequis -------------------------------------------------------------

.PHONY: check
check: ## Vérifie que Hugo est installé et affiche sa version
	@command -v $(HUGO) >/dev/null 2>&1 || { echo "Hugo introuvable. Installation : brew install hugo"; exit 1; }
	@$(HUGO) version

# --- Build -----------------------------------------------------------------

.PHONY: build
build: check ## Build de production (gc + minify), sortie dans public/
	HUGO_ENVIRONMENT=$(HUGO_ENV) $(HUGO) --gc --minify --baseURL "$(BASE_URL)/"

.PHONY: build-drafts
build-drafts: check ## Build incluant les brouillons et les articles futurs
	HUGO_ENVIRONMENT=development $(HUGO) --gc --buildDrafts --buildFuture --baseURL "$(BASE_URL)/"

.PHONY: clean
clean: ## Supprime public/, resources/ et le lock de build
	rm -rf $(PUBLIC_DIR) resources .hugo_build.lock

.PHONY: rebuild
rebuild: clean build ## Build complet à partir d'un répertoire propre

# --- Serveur local ---------------------------------------------------------

.PHONY: serve
serve: check ## Serveur de développement (brouillons + articles futurs), port 1313
	$(HUGO) server \
		--buildDrafts \
		--buildFuture \
		--disableFastRender \
		--navigateToChanged \
		--port $(PORT) \
		--bind 127.0.0.1

.PHONY: serve-prod
serve-prod: check ## Serveur local en configuration production (sans brouillons)
	HUGO_ENVIRONMENT=$(HUGO_ENV) $(HUGO) server \
		--environment production \
		--port $(PORT) \
		--bind 127.0.0.1

# --- Contenu ---------------------------------------------------------------

.PHONY: new
new: check ## Crée un article : make new TITLE="mon-titre"
	@test -n "$(TITLE)" || { echo 'Usage : make new TITLE="mon-titre"'; exit 1; }
	$(HUGO) new content "posts/$$(date +%Y-%m-%d)-$(TITLE).markdown"

# --- Publication -----------------------------------------------------------

.PHONY: status
status: ## Affiche l'état du dépôt et la branche courante
	@git status --short --branch

.PHONY: push
push: build ## Build, commit et push vers origin/master (déclenche le déploiement)
	@if [ -z "$$(git status --porcelain)" ]; then \
		echo "Aucune modification à publier."; \
	else \
		git add --all; \
		git commit -m "$(MSG)"; \
	fi
	git push $(REMOTE) $(BRANCH)

.PHONY: deploy
deploy: push ## Alias de push : la publication passe par GitHub Actions

.PHONY: workflow
workflow: ## Suit l'exécution du workflow GitHub Pages (nécessite gh)
	@command -v gh >/dev/null 2>&1 || { echo "GitHub CLI introuvable. Installation : brew install gh"; exit 1; }
	gh run list --workflow hugo.yml --limit 5
