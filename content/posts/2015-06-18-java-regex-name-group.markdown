---
title: "Java Regex Group Name"
date: 2015-06-18 13:58:00
categories: ["blog"]
tags: ["fr", "java", "regex", "group name"]
---


Lors du développement d'un programme, il est souvent nécessaire d'utiliser les **expressions rationnelles** (ou *regex*). Ces expressions constituent un outil puissant pour rechercher des motifs spécifiques dans des chaînes de caractères ou vérifier qu'un texte correspond à un format particulier.

Dans tous les langages modernes comme Java, Ruby ou Python, les bibliothèques de regex sont disponibles en standard. Cet article explore une fonctionnalité particulièrement utile de la bibliothèque standard Java : les **groupes nommés**.

## Cas d'usage : valider des URL

L'objectif est de vérifier si une chaîne de caractères correspond au format d'une URL. L'expression rationnelle suivante permet de valider cette correspondance :

```
(?http|ftp|ssh|amqp|imap|ws)(?s)?://(?[a-zA-Z.-]+)(:(?[0-9]+))?
```

Cette regex décompose une URL en plusieurs éléments :
- Le protocole (http, ftp, ssh, etc.)
- Un indicateur de sécurité optionnel (« s »)
- Le nom d'hôte
- Un numéro de port optionnel

Avec cette expression, il est possible de vérifier des chaînes comme :

```
ftp://fileserver.domain:1223
imaps://emailserver.domain:341
```

## *Group* indexé

Dans la plupart des langages supportant les regex, les parties capturées sont accessibles via un **group indexé**. Le premier group (`group(1)`) correspond au schéma de l'URL (http, ftp, amqp, etc.), le second à un autre élément, et ainsi de suite.

Cette approche fonctionne, mais peut devenir difficile à maintenir lorsque l'expression évolue : les indices des groupes changent.

## *Group* nommé

Java offre une fonctionnalité élégante (également disponible en Python) : la possibilité de **nommer les groupes de capture**. Cette approche rend le code plus lisible et plus robuste face aux modifications :

```
"(?<scheme>http|ftp|ssh|amqp|imap|ws)(?<secure>s)?://(?<host>[a-zA-Z.-]+)(:(?<port>[0-9]+))?"
```

Quatre groupes nommés sont définis :
- `scheme` : capture le protocole
- `secure` : capture la présence du « s » (sécurisé)
- `host` : capture le nom d'hôte
- `port` : capture le numéro de port s'il est présent

La valeur capturée est ensuite accessible par le nom du groupe : `group("scheme")`, `group("host")`, etc.

Exemple complet :

<script src="https://gist.github.com/gautric/45c3f5c1a9566f83e50d.js"></script>

Résultat de l'exécution :

```
scheme 	: ftp
secure 	: false
host 	: fileserver.domain
port 	: 1223
scheme 	: amqp
secure 	: false
host 	: momserver.domain
port 	: 999
scheme 	: imap
secure 	: true
host 	: emailserver.domain
port 	: 341
scheme 	: ws
secure 	: true
host 	: pushserver.domain
port 	: 433
```
<br/>

## Conclusion

Les expressions rationnelles simplifient considérablement la validation et l'extraction de données textuelles. Elles restent parfois sous-utilisées en raison de leur syntaxe qui peut paraître obscure au premier abord.

Les **groupes nommés** améliorent significativement la lisibilité et la maintenabilité du code. En rendant les expressions plus explicites et autodocumentées, cette fonctionnalité encourage à tirer parti de la puissance des regex dans les projets Java.