---
title: "Bonjour / mDNS — Lister les services _http._tcp du réseau et se connecter depuis Firefox"
slug: "bonjour-mdns-lister-services-http-tcp-et-ouvrir-firefox"
date: 2026-08-20
description: "Il n'existe pas de plugin Firefox pour parcourir les services Bonjour d'un réseau — et WebAssembly n'y change rien. La bonne réponse tient dans un script bonjour.sh qui liste les services _http._tcp via dns-sd (macOS) ou avahi-browse (Linux), puis ouvre Firefox sur le composant choisi — avec aussi un mode `ssh` pour se connecter aux hôtes `_ssh._tcp`. Idéal pour les petites et moyennes installations à multiples composants."
categories: ["blog"]
tags: ["bonjour", "mdns", "zeroconf", "dns-sd", "avahi", "firefox", "bash", "homelab", "reseau", "claude"]
---

## Le contexte

Une petite ou moyenne installation accumule vite toute une série de composants qui parlent HTTP : un NAS, deux ou trois caméras PoE, un répéteur Wi-Fi, une box, une imprimante réseau, un ou plusieurs Raspberry Pi, quelques conteneurs Docker qui exposent une interface web. Presque tous s'annoncent en **Bonjour / mDNS** sous la forme `_http._tcp`.

En pratique, cela se traduit par des adresses IP à retenir, la table DHCP du routeur à fouiller, ou des `.local` tapés de mémoire pour ouvrir la bonne interface. D'où une question toute simple :

> Existe-t-il un plugin Firefox pour lister tous les services `_http._tcp` et s'y connecter ?

---

## Ni plugin Firefox, ni WebAssembly

Non — et ce n'est pas un oubli.

Les extensions Firefox (WebExtensions) **n'ont aucun accès au mDNS/DNS-SD**. Il n'existe pas d'API `browser.mdns` ni de permission pour parcourir le réseau local. C'est un choix délibéré de sécurité : une page ou une extension ne doit pas pouvoir scanner un réseau.

**WebAssembly n'y change rien** non plus. Le WASM s'exécute dans le même bac à sable que le JavaScript et n'hérite d'aucune nouvelle capacité réseau. Or le mDNS exige de l'UDP multicast sur `224.0.0.251:5353`, et le navigateur n'expose que des API de haut niveau (`fetch`, WebSocket, WebRTC) — jamais de socket UDP brut.


Le seul modèle viable est donc un **outil local** qui effectue la découverte mDNS, puis ouvre Firefox sur le service choisi.

---

## La solution : un script `bonjour.sh`

Plutôt qu'un service ou un daemon, un simple script — `bonjour.sh` — suffit, en s'appuyant sur les outils déjà présents : `dns-sd` (natif macOS) et, en repli automatique, `avahi-browse` (Linux). Aucune installation, aucune compilation : un fichier exécutable, et c'est tout. Trois commandes couvrent le besoin :

```bash
./bonjour.sh              # = ./bonjour.sh open : scanne, affiche un menu, ouvre Firefox sur le choix
./bonjour.sh ssh          # scanne les _ssh._tcp et ouvre une session ssh sur l'hôte choisi
./bonjour.sh list         # affiche uniquement la liste des serveurs _http._tcp
./bonjour.sh install-deps # installe les dépendances (DRY=1 pour prévisualiser)
```

Une session se déroule ainsi : un menu interactif s'affiche, navigable aux flèches.

```text
$ ./bonjour.sh
Pick a server (Up/Down to move, Enter to select, q to quit):
> hermes                         http://hermes.local/
  ithaque                        http://ithaque.local:8080/
  poseidon                       http://poseidon.local/
  telemaque                      http://telemaque.local/
```

La ligne sélectionnée est mise en surbrillance ; `Entrée` ouvre Firefox sur le composant, `q` annule. Deux modes de sélection sont gérés selon le contexte :

- **Menu à flèches** (par défaut) — navigation ↑/↓ (ou `k`/`j`), en bash pur, sans aucune dépendance.
- **Menu numéroté** — repli automatique quand la sortie n'est pas un terminal (script, pipe).

---

## Deux modes : HTTP et SSH

Le même moteur de découverte sert deux usages, selon le service scanné :

- `./bonjour.sh` (ou `open`) — scanne `_http._tcp` et ouvre le service choisi dans **Firefox**.
- `./bonjour.sh ssh` — scanne `_ssh._tcp` et ouvre directement une **session ssh** sur l'hôte sélectionné.

En mode ssh, le nom d'utilisateur n'est **jamais** ajouté à la commande : `bonjour.sh` lance `ssh hote` sans `user@`, et n'utilise pas non plus le `$USER` local. C'est délibéré — la configuration par hôte vit dans `~/.ssh/config`, ce qui garde le menu neutre et évite de se connecter avec le mauvais compte :

```text
Host ithaque.local
  User ulysse
```

Le script privilégie en outre le **nom d'hôte** annoncé plutôt que l'IP brute, afin que ces motifs `Host` correspondent.

---

## L'intérêt pour les petites et moyennes installations

C'est là que l'approche prend tout son sens. Une grosse infrastructure dispose d'un DNS interne, d'un inventaire et d'une console d'administration centralisée. Une installation **petite ou moyenne à multiples composants** ne dispose souvent de rien de tout cela — seulement d'une quinzaine d'équipements hétérogènes qui s'annoncent en Bonjour.

| Tâche | Avant | Après |
|---|---|---|
| **Retrouver un composant** | Fouiller la table DHCP, retenir les IP | Nom lisible dans un menu |
| **Se connecter** | Taper l'IP ou le `.local` de mémoire | Un numéro, Firefox s'ouvre |
| **Nouveau composant branché** | À référencer manuellement | Apparaît au scan suivant |
| **Composant retiré** | Reste dans les favoris et les notes | Disparaît automatiquement |
| **Configuration requise** | DNS interne ou fichier hosts | Aucune |
| **Portabilité** | Variable | macOS et Linux, outils déjà présents |

Pour un homelab, un atelier, une PME ou un site distant équipé de nombreux petits boîtiers, l'outil remplace avantageusement le post-it d'adresses IP scotché sous l'écran.

---

## Sous le capot

Deux points ont demandé un peu d'attention côté implémentation.

**`dns-sd` ne s'arrête jamais.** Sous macOS, `dns-sd -Z` tourne en continu — il n'est pas conçu pour un script « one-shot ». La parade consiste à le lancer en tâche de fond, à le laisser collecter quelques secondes, puis à le stopper et à parser sa sortie zone-file (`SRV`) pour reconstruire les URLs :

```bash
dns-sd -Z "$SERVICE" "$DOMAIN." > "$raw" 2>/dev/null &
pid=$!
sleep "$TIMEOUT"
kill "$pid" 2>/dev/null || true
```

Côté Linux, `avahi-browse -rtp _http._tcp` est plus direct : l'option `-t` termine d'elle-même après le vidage du cache, et `-p` produit une sortie facile à parser. Le script détecte l'outil disponible et normalise tout en lignes `NOM<TAB>URL`, avec quelques finitions : port `80`/`443` masqué, `443` converti en `https`, décodage des espaces (`\032`).

**Un menu sans dépendance.** Le menu à flèches est écrit en bash pur : lecture des touches une à une, codes d'échappement ANSI pour la surbrillance et le rafraîchissement des lignes, curseur masqué le temps de la sélection. Il reste compatible avec le bash 3.2 livré par défaut sous macOS (timeout de lecture en secondes entières).

---

## Récupérer le script

Le script est publié sous forme de gist : **[bonjour.sh](https://gist.github.com/gautric/0d9cde43336df9acd34e664d37c76374)**. Une ligne suffit pour le télécharger et le rendre exécutable :

```bash
curl -fsSL https://gist.githubusercontent.com/gautric/0d9cde43336df9acd34e664d37c76374/raw/bonjour.sh \
  -o bonjour.sh && chmod +x bonjour.sh
./bonjour.sh          # menu HTTP (ouvre Firefox)
./bonjour.sh ssh      # menu SSH (l'utilisateur vient du ~/.ssh/config)
```

---

## Installer les dépendances

Une commande installe tout le nécessaire selon la plateforme (Homebrew sur macOS, `apt`/`dnf`/`pacman` sur Linux), avec un mode prévisualisation :

```bash
$ ./bonjour.sh install-deps DRY=1
System: Darwin
  [ok]   dns-sd (built-in)
  [ok]   Firefox
Done.
```

`dns-sd` est natif sous macOS ; sous Linux, c'est `avahi-utils` qui est installé.

---

## Retour d'expérience

**Le bon outil est souvent le plus petit.** La question de départ appelait un plugin, un service, peut-être un peu de WebAssembly. La réponse tenait dans un script shell qui s'appuie sur ce que le système fournit déjà — `dns-sd`, `avahi-browse`, `bash`. Rien à compiler, rien à héberger, rien à maintenir : un fichier exécutable, versionné dans un gist.

**Un seul moteur, deux usages.** La découverte, le menu et le lancement forment un pipeline unique ; passer de HTTP à SSH n'est qu'un axe de plus (`_http._tcp` → Firefox, `_ssh._tcp` → `ssh`). Ajouter le mode ssh n'a quasiment rien coûté — signe qu'une petite abstraction bien placée se paie sur la durée.

**Zéro configuration, par conception.** Pas de DNS interne, pas de fichier `hosts`, pas d'inventaire à tenir à jour : on lit ce que le réseau annonce déjà. Sur une installation petite ou moyenne, c'est précisément le niveau d'outillage qui manque — ni trop, ni trop peu.

---

## Stack technique

| Brique | Rôle |
|---|---|
| **dns-sd** (macOS) | Découverte mDNS / DNS-SD native |
| **avahi-browse** (Linux) | Découverte mDNS, terminaison propre (`-t`) |
| **Firefox** | Ouverture du composant sélectionné (mode HTTP) |
| **ssh** (openssh) | Connexion à l'hôte choisi (mode `ssh`, utilisateur via `~/.ssh/config`) |
| **bash** | Script et menu à flèches interactif (aucune dépendance) |



