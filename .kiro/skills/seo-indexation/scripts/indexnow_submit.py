#!/usr/bin/env python3
"""Notifie IndexNow (Bing, Yandex, Seznam, Naver) des URL récemment modifiées.

Lit le sitemap publié, retient les URL dont <lastmod> est plus récent que
--since-days jours, puis les soumet en un seul POST à api.indexnow.org.
Google ne participe pas à IndexNow.

Prérequis :
  - un fichier static/<CLE>.txt contenant exactement la clé (servi à la racine du site) ;
  - la clé passée via --key ou la variable d'environnement INDEXNOW_KEY.

Usage :
  INDEXNOW_KEY=xxxx python3 .kiro/skills/seo-indexation/scripts/indexnow_submit.py \
      --sitemap https://g.autric.net/sitemap.xml --since-days 2 [--dry-run]

Bibliothèque standard uniquement. À lancer APRÈS le déploiement : le moteur
vérifie la clé et recrawle les pages sur le site en ligne.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_URLS = 10_000


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "gautric-indexnow/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_lastmod(value: str) -> datetime | None:
    value = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        try:
            dt = datetime.strptime(value[:10], "%Y-%m-%d")
        except ValueError:
            return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def recent_urls(sitemap_xml: bytes, since: datetime | None) -> list[str]:
    root = ET.fromstring(sitemap_xml)
    urls: list[str] = []
    for node in root.findall("sm:url", NS):
        loc = node.findtext("sm:loc", default="", namespaces=NS).strip()
        if not loc:
            continue
        if since is None:
            urls.append(loc)
            continue
        lastmod = parse_lastmod(node.findtext("sm:lastmod", default="", namespaces=NS))
        if lastmod and lastmod >= since:
            urls.append(loc)
    return urls


def main() -> int:
    ap = argparse.ArgumentParser(description="Soumission IndexNow depuis un sitemap")
    ap.add_argument("--sitemap", default="https://g.autric.net/sitemap.xml")
    ap.add_argument("--since-days", type=float, default=2.0,
                    help="ne soumettre que les URL modifiées depuis N jours (0 = toutes)")
    ap.add_argument("--key", default=os.environ.get("INDEXNOW_KEY", ""))
    ap.add_argument("--dry-run", action="store_true", help="afficher sans soumettre")
    args = ap.parse_args()

    if not args.key:
        print("Clé IndexNow manquante (--key ou INDEXNOW_KEY).", file=sys.stderr)
        return 2

    parsed = urlparse(args.sitemap)
    host = parsed.netloc
    key_location = f"{parsed.scheme}://{host}/{args.key}.txt"

    since = None if args.since_days <= 0 else datetime.now(timezone.utc) - timedelta(days=args.since_days)
    urls = [u for u in recent_urls(fetch(args.sitemap), since) if urlparse(u).netloc == host]

    if not urls:
        print("Aucune URL récente à soumettre.")
        return 0
    urls = urls[:MAX_URLS]

    print(f"{len(urls)} URL à soumettre pour {host} :")
    for u in urls:
        print(f"  {u}")
    if args.dry_run:
        return 0

    # Vérification préalable : la clé doit être servie par le site en ligne.
    try:
        served = fetch(key_location).decode("utf-8").strip()
    except urllib.error.URLError as exc:
        print(f"Fichier de clé inaccessible ({key_location}) : {exc}", file=sys.stderr)
        return 1
    if served != args.key:
        print(f"Le fichier {key_location} ne contient pas la clé attendue.", file=sys.stderr)
        return 1

    payload = json.dumps({"host": host, "key": args.key, "keyLocation": key_location, "urlList": urls}).encode()
    req = urllib.request.Request(ENDPOINT, data=payload, method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"IndexNow : HTTP {resp.status}")
            return 0
    except urllib.error.HTTPError as exc:
        # 400 requête invalide, 403 clé non valide, 422 URL hors host, 429 trop de requêtes
        print(f"IndexNow : HTTP {exc.code} {exc.reason}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
