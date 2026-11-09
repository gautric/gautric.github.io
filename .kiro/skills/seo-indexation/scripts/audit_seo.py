#!/usr/bin/env python3
"""Audit SEO du blog Hugo Greg. I/O (bibliothèque standard uniquement).

Deux niveaux de contrôle :
  1. Sources : front matter et corps des articles de content/blog/.
  2. Build  : pages générées dans public/ (meta, canonical, Open Graph, sitemap, robots).

Usage :
  python3 .kiro/skills/seo-indexation/scripts/audit_seo.py [--root .] [--include-drafts]
                                                           [--skip-public] [--public DIR] [--file CHEMIN]

Le contrôle du build suppose un build de production récent (`make build`).
Un build issu de `hugo server` contient des URL localhost et fausse le résultat.

Code de sortie : 1 si au moins une erreur, 0 sinon (les avertissements ne bloquent pas).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

TITLE_MAX = 60
DESC_MIN = 70
DESC_MAX = 160

ERR, WARN, INFO = "ERREUR", "AVERT.", "INFO"


class Report:
    def __init__(self) -> None:
        self.items: list[tuple[str, str, str]] = []

    def add(self, level: str, where: str, msg: str) -> None:
        self.items.append((level, where, msg))

    def count(self, level: str) -> int:
        return sum(1 for lvl, _, _ in self.items if lvl == level)

    def print(self) -> None:
        order = {ERR: 0, WARN: 1, INFO: 2}
        for lvl, where, msg in sorted(self.items, key=lambda i: (order[i[0]], i[1])):
            print(f"[{lvl:6}] {where}: {msg}")
        print(
            f"\nBilan : {self.count(ERR)} erreur(s), {self.count(WARN)} avertissement(s), "
            f"{self.count(INFO)} info(s)."
        )


# --------------------------------------------------------------------------- #
# Front matter (YAML ou TOML simple, sans dépendance externe)
# --------------------------------------------------------------------------- #

def split_front_matter(text: str) -> tuple[dict[str, object], str]:
    text = text.lstrip("\ufeff")
    for delim, sep in (("---", ":"), ("+++", "=")):
        if text.startswith(delim):
            end = text.find("\n" + delim, len(delim))
            if end == -1:
                return {}, text
            raw = text[len(delim):end]
            body = text[end + len(delim) + 1:]
            return parse_simple(raw, sep), body
    return {}, text


def parse_simple(raw: str, sep: str) -> dict[str, object]:
    data: dict[str, object] = {}
    current_list: str | None = None
    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        stripped = line.strip()
        if current_list and stripped.startswith("- "):
            data[current_list].append(unquote(stripped[2:]))  # type: ignore[union-attr]
            continue
        if line[:1].isspace():
            continue
        current_list = None
        if sep not in line:
            continue
        key, value = line.split(sep, 1)
        key, value = key.strip(), value.strip()
        if value == "":
            data[key] = []
            current_list = key
        elif value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            data[key] = [unquote(v) for v in re.split(r",\s*", inner) if v.strip()] if inner else []
        else:
            data[key] = unquote(value)
    return data


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def strip_code(body: str) -> str:
    """Retire les blocs de code clôturés pour éviter les faux positifs."""
    return re.sub(r"^(```|~~~).*?^\1", "", body, flags=re.S | re.M)


# --------------------------------------------------------------------------- #
# Contrôles des sources
# --------------------------------------------------------------------------- #

def audit_post(path: Path, root: Path, rep: Report, include_drafts: bool) -> None:
    fm, body = split_front_matter(path.read_text(encoding="utf-8", errors="replace"))
    where = str(path.relative_to(root))
    is_draft = str(fm.get("draft", "false")).lower() == "true"
    if is_draft and not include_drafts:
        return
    if is_draft:
        where += " (brouillon)"

    if str(fm.get("robotsNoIndex", "false")).lower() == "true":
        rep.add(INFO, where, "robotsNoIndex: true, page volontairement exclue de l'index")

    title = str(fm.get("title", "")).strip()
    if not title:
        rep.add(ERR, where, "title absent")
    elif len(title) > TITLE_MAX:
        rep.add(WARN, where, f"title de {len(title)} caractères (> {TITLE_MAX}, tronqué dans les SERP)")

    desc = str(fm.get("description", "")).strip()
    if not desc:
        rep.add(ERR, where, "description absente : la meta description retombe sur la description du site")
    elif len(desc) < DESC_MIN:
        rep.add(WARN, where, f"description de {len(desc)} caractères (< {DESC_MIN}, trop courte)")
    elif len(desc) > DESC_MAX:
        rep.add(WARN, where, f"description de {len(desc)} caractères (> {DESC_MAX}, tronquée dans les SERP)")

    if not fm.get("slug"):
        rep.add(INFO, where, "slug absent : l'URL dépend du titre et changera si le titre change")
    if not fm.get("tags"):
        rep.add(INFO, where, "aucun tag")
    if not fm.get("date"):
        rep.add(WARN, where, "date absente (permalink /blog/:year/:month/:day/ incomplet)")

    code_free = strip_code(body)
    if re.search(r"^#\s+\S", code_free, flags=re.M):
        rep.add(WARN, where, "titre H1 (# ...) dans le corps : le titre de page est déjà le H1, utiliser ##")
    empty_alt = re.findall(r"!\[\s*\]\(", code_free)
    if empty_alt:
        rep.add(WARN, where, f"{len(empty_alt)} image(s) Markdown sans texte alternatif")
    img_no_alt = [t for t in re.findall(r"<img\b[^>]*>", code_free, flags=re.I) if not re.search(r"\balt\s*=", t, re.I)]
    if img_no_alt:
        rep.add(WARN, where, f"{len(img_no_alt)} balise(s) <img> sans attribut alt")
    words = len(re.findall(r"\w+", code_free))
    if words < 300:
        rep.add(INFO, where, f"contenu court ({words} mots) : risque de page jugée peu utile")


# --------------------------------------------------------------------------- #
# Contrôles du site et du build
# --------------------------------------------------------------------------- #

def read_base_url(root: Path) -> str:
    cfg = root / "hugo.yml"
    if cfg.exists():
        m = re.search(r"^baseURL:\s*['\"]?([^'\"\s]+)", cfg.read_text(encoding="utf-8"), re.M)
        if m:
            return m.group(1).rstrip("/")
    return ""


def audit_site_config(root: Path, rep: Report) -> None:
    cfg_path = root / "hugo.yml"
    if not cfg_path.exists():
        rep.add(WARN, "hugo.yml", "fichier de configuration introuvable")
        return
    cfg = cfg_path.read_text(encoding="utf-8")

    m = re.search(r"^\s*images:\s*\[\s*['\"]([^'\"]+)['\"]", cfg, re.M)
    if m and not (root / "static" / m.group(1).lstrip("/")).exists():
        rep.add(ERR, "hugo.yml", f"params.images pointe vers {m.group(1)}, absent de static/ (og:image cassée)")

    if not re.search(r"^\s*google:\s*\n\s*SiteVerificationTag:", cfg, re.M):
        rep.add(INFO, "hugo.yml", "pas de balise de vérification Google (inutile si la propriété est validée par DNS)")
    if not re.search(r"^\s*bing:\s*\n\s*SiteVerificationTag:", cfg, re.M):
        rep.add(INFO, "hugo.yml", "pas de balise de vérification Bing (inutile si import depuis Search Console ou DNS)")
    if not re.search(r"^enableGitInfo:\s*true", cfg, re.M):
        rep.add(INFO, "hugo.yml", "enableGitInfo absent : <lastmod> du sitemap = date de publication, pas de dernière modification")

    if not list((root / "static").glob("*.txt")) or not any(
        re.fullmatch(r"[0-9a-fA-F-]{8,128}\.txt", p.name) for p in (root / "static").glob("*.txt")
    ):
        rep.add(INFO, "static/", "aucun fichier de clé IndexNow détecté (Bing, Yandex, Seznam)")


def audit_public(root: Path, public: Path, rep: Report) -> None:
    if not public.is_dir():
        rep.add(INFO, "public/", "absent : lancer `make build` pour auditer le rendu")
        return
    base = read_base_url(root)

    sitemap = public / "sitemap.xml"
    if not sitemap.exists():
        rep.add(ERR, "public/sitemap.xml", "absent")
    else:
        locs = re.findall(r"<loc>([^<]+)</loc>", sitemap.read_text(encoding="utf-8"))
        foreign = [u for u in locs if base and not u.startswith(base)]
        if foreign:
            rep.add(ERR, "public/sitemap.xml",
                    f"{len(foreign)}/{len(locs)} URL hors {base} (ex. {foreign[0]}) : build de dev ? relancer `make build`")
        dupes = sorted({u for u in locs if locs.count(u) > 1})
        if dupes:
            rep.add(WARN, "public/sitemap.xml", f"URL en double : {', '.join(dupes)}")
        tax = [u for u in locs if "/tags/" in u or "/categories/" in u]
        if tax:
            rep.add(INFO, "public/sitemap.xml", f"{len(tax)} pages de taxonomie listées (contenu mince possible)")

    robots = public / "robots.txt"
    if not robots.exists():
        rep.add(ERR, "public/robots.txt", "absent")
    else:
        txt = robots.read_text(encoding="utf-8")
        if "Sitemap:" not in txt:
            rep.add(WARN, "public/robots.txt", "aucune directive Sitemap")
        if re.search(r"^Disallow:\s*/\s*$", txt, re.M):
            rep.add(ERR, "public/robots.txt", "Disallow: / bloque tout le site")

    home = public / "index.html"
    cfg = (root / "hugo.yml").read_text(encoding="utf-8") if (root / "hugo.yml").exists() else ""
    m_lang = re.search(r"^languageCode:\s*['\"]?([A-Za-z-]+)", cfg, re.M)
    if home.exists() and m_lang:
        m_html = re.search(r"<html[^>]*\blang=\"?([A-Za-z-]+)", home.read_text(encoding="utf-8", errors="replace"))
        expected = m_lang.group(1).split("-")[0].lower()
        if m_html and m_html.group(1).split("-")[0].lower() != expected:
            rep.add(WARN, "public/index.html",
                    f"<html lang=\"{m_html.group(1)}\"> alors que languageCode vaut {m_lang.group(1)} "
                    "(ajouter defaultContentLanguage dans hugo.yml)")

    pages = sorted((public / "blog").rglob("index.html")) if (public / "blog").is_dir() else []
    stats = {"desc": 0, "canon": 0, "og": 0, "noindex": 0, "ld": 0}
    foreign_canon: list[str] = []
    accented: list[str] = []
    articles = 0
    for page in pages:
        if "/page/" in str(page):
            continue
        html = page.read_text(encoding="utf-8", errors="replace")
        if '"BlogPosting"' not in html and "BlogPosting" not in html:
            continue  # pages de liste
        articles += 1
        where = str(page.relative_to(public.parent))
        if not re.search(r'<meta name="?description"? content="?[^">]{10,}', html):
            stats["desc"] += 1
        canon = re.search(r'<link rel="?canonical"? href="?([^">\s]+)', html)
        if not canon:
            stats["canon"] += 1
            rep.add(ERR, where, "balise canonical absente")
        elif base and not canon.group(1).startswith(base):
            foreign_canon.append(canon.group(1))
        if canon and "%" in canon.group(1):
            accented.append(canon.group(1))
        if 'property="og:image"' not in html and "property=og:image" not in html:
            stats["og"] += 1
        if re.search(r'name="?robots"? content="?noindex', html):
            stats["noindex"] += 1
            rep.add(WARN, where, "meta robots noindex")
        if "application/ld+json" not in html:
            stats["ld"] += 1

    if foreign_canon:
        rep.add(ERR, "public/blog",
                f"{len(foreign_canon)} canonical hors {base} (ex. {foreign_canon[0]}) : build de dev ? relancer `make build`")
    if accented:
        rep.add(INFO, "public/blog",
                f"{len(accented)} URL d'articles avec caractères non ASCII encodés (ex. {accented[0]})")
    if articles:
        if stats["og"]:
            rep.add(WARN, "public/blog", f"{stats['og']}/{articles} articles sans og:image (aperçu social et Discover)")
        if stats["ld"]:
            rep.add(WARN, "public/blog", f"{stats['ld']}/{articles} articles sans données structurées JSON-LD")
        if stats["desc"]:
            rep.add(WARN, "public/blog", f"{stats['desc']}/{articles} articles sans meta description exploitable")
        rep.add(INFO, "public/blog", f"{articles} articles rendus analysés")


# --------------------------------------------------------------------------- #

def main() -> int:
    ap = argparse.ArgumentParser(description="Audit SEO du blog Hugo")
    ap.add_argument("--root", default=".", help="racine du projet Hugo")
    ap.add_argument("--include-drafts", action="store_true", help="auditer aussi les brouillons")
    ap.add_argument("--skip-public", action="store_true", help="ne pas auditer public/")
    ap.add_argument("--public", help="répertoire de build à auditer (défaut : <root>/public)")
    ap.add_argument("--file", help="auditer un seul article (chemin)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    rep = Report()

    if args.file:
        audit_post(Path(args.file).resolve(), root, rep, include_drafts=True)
    else:
        posts_dir = root / "content" / "blog"
        # _index.md = page de section (liste /blog/), pas un article
        for path in sorted(p for p in posts_dir.rglob("*")
                           if p.suffix in {".md", ".markdown"} and p.name != "_index.md"):
            audit_post(path, root, rep, args.include_drafts)
        audit_site_config(root, rep)
        if not args.skip_public:
            audit_public(root, Path(args.public).resolve() if args.public else root / "public", rep)

    rep.print()
    return 1 if rep.count(ERR) else 0


if __name__ == "__main__":
    sys.exit(main())
