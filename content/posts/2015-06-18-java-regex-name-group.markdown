---
layout: post
css: blog
title:  "Java Regex Group Name"
date:   2015-06-18 13:58:00
categories: ["blog"]
tags: ["fr","java","regex","group name"]
#url: /blog/2015/06/18/java-regex-name-group.html
---


Lors du développement d'un programme informatique, il est souvent nécessaire d'utiliser les expressions rationnelles (ou "regular expressions" en anglais, parfois traduites par "expressions régulières"). Ces expressions constituent un outil puissant lorsqu'il s'agit de rechercher des motifs spécifiques dans des chaînes de caractères ou de vérifier qu'un texte correspond à un format particulier.

Dans tous les langages de programmation modernes comme Java, Ruby ou Python, les bibliothèques d'expressions rationnelles (ou *regex*) sont disponibles en standard. Dans cet article, nous allons explorer une fonctionnalité particulièrement intéressante disponible dans la bibliothèque standard de Java : les groupes nommés.

## Use case : tester les URL

Dans notre cas d'utilisation, nous souhaitons vérifier si une chaîne de caractères correspond bien au format d'une URL. Pour cela, nous allons créer une expression rationnelle qui permettra de valider cette correspondance.

```
(?http|ftp|ssh|amqp|imap|ws)(?s)?://(?[a-zA-Z.-]+)(:(?[0-9]+))?
```

Cette expression rationnelle permet de décomposer une URL en plusieurs éléments :
- Le protocole (http, ftp, ssh, etc.)
- Un indicateur de sécurité optionnel ("s")
- Le nom d'hôte
- Un numéro de port optionnel

Avec cette « regex », il est possible de vérifier des chaînes comme les exemples suivants :

```
ftp://fileserver.domain:1223
imaps://emailserver.domain:341
```

## *Group* indexé

Dans la plupart des langages supportant les expressions rationnelles, il est possible de récupérer les différentes parties capturées grâce à la notion de *group* indexé. Par exemple, le premier *group* (généralement accessible via `group(1)`) va correspondre au schéma de l'URL (http, ftp, amqp, etc.), le second groupe à un autre élément, et ainsi de suite.

Cette approche par index fonctionne, mais peut devenir difficile à maintenir lorsque l'expression rationnelle évolue, car les indices des groupes peuvent changer.

## *Group* nommé

Java offre une fonctionnalité particulièrement élégante (également disponible dans certains autres langages comme Python) : la possibilité de nommer les groupes de capture. Cette approche rend le code plus lisible et plus robuste face aux modifications. Voici comment définir des groupes nommés :

```
"(?<scheme>http|ftp|ssh|amqp|imap|ws)(?<secure>s)?://(?<host>[a-zA-Z.-]+)(:(?<port>[0-9]+))?"
```

Dans cette expression, nous avons défini quatre groupes nommés :
- `scheme` : capture le protocole
- `secure` : capture la présence ou non du "s" (sécurisé)
- `host` : capture le nom d'hôte
- `port` : capture le numéro de port s'il est présent

Ensuite, il est possible de retrouver la valeur capturée par l'expression rationnelle en utilisant le nom du groupe, comme ceci : `group("scheme")`, `group("host")`, etc.

Voici un exemple complet de l'utilisation des groupes nommés avec Java :

<script src="https://gist.github.com/gautric/45c3f5c1a9566f83e50d.js"></script>

Et voici le résultat de l'exécution de ce code :

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

L'utilisation des expressions rationnelles permet de simplifier considérablement certaines problématiques de développement, notamment pour la validation et l'extraction de données textuelles. Malheureusement, elles sont parfois sous-utilisées par les développeurs en raison de leur syntaxe qui peut paraître obscure au premier abord.

Les groupes nommés constituent une amélioration significative de la lisibilité et de la maintenabilité du code utilisant des expressions rationnelles. En rendant le code plus explicite et autodocumenté, cette fonctionnalité peut encourager davantage de développeurs à tirer parti de la puissance des expressions rationnelles dans leurs projets Java.
