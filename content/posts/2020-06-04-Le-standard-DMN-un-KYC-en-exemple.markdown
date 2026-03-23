---
layout: post
css: blog
title:  "Le standard DMN, un KYC en exemple"
date:   2020-06-04 15:00:00
categories: ["blog"]
tags: ["fr","DMN","standard", "KYC"]
##url: /blog/2020/06/04/Le-standard-DMN-un-KYC-en-exemple.html
---

Pendant un certain temps les moteurs de règles étaient fortement dépendant des fournisseurs de solution. Mais depuis que le standard DMN pour Decision Model and Notation est maintenant disponible l'ensemble des éditeurs Opensource ou Closed Source fournissent une implémentation de ce standard.
Nous allons voir avec un exemple rapide comment utiliser DMN pour modéliser et exécuter des règles métier.

> Le standard DMN, un KYC en exemple

# Introduction

DMN est une norme de l'[OMG](https://www.omg.org/) (Object Management Group). Cette norme a pour objectif de standardiser la modélisation et le référentiel des règles de décision dans les applications ayant des besoins de scoring, d'évaluation et/ou d'aide à la décision. Elle permet de créer un pont entre les équipes métier et techniques en offrant un langage commun.

La norme se propose de faciliter le développement des règles avec des patterns de règles bien connus, comme par exemple les tables de décision. Elle propose un langage de programmation standardisé appelé FEEL *Friendly Enough Expression Language*. Ce langage se veut très proche des macros Excel, facilitant l'appropriation du DMN par des équipes métiers qui sont déjà familières avec les formules de tableur.

DMN est aussi une norme d'éléments graphiques. Chaque élément graphique correspond à un pattern qui possède des entrées, un traitement et une sortie. Les éléments graphiques sont reliés entre eux dans un *arbre* de dépendance d'exécution des règles. Au fur et à mesure de l'exécution des règles on opère une réduction du nombre d'éléments pour arriver au dernier élément qui contiendra la décision finale.

Le standard DMN est disponible en suivant le lien : <http://www.omg.org/spec/DMN/1.0/>

## TCK

Il existe un outil en ligne listant l'ensemble des implémentations actuellement disponibles et leur degré de maturité. Cet outil, appelé Technology Compatibility Kit (TCK), permet de vérifier la conformité des différentes implémentations par rapport à la spécification.

<https://dmn-tck.github.io/tck/>

# Un Exemple : KYC

Dans notre exemple nous allons procéder à l'évaluation d'un nouveau client bancaire. Ce processus d'évaluation est communément appelé KYC pour Know Your Customer. Ce processus va calculer un score en fonction de données en entrée. Le score sera par la suite interprété par le conseiller bancaire afin d'accepter ou pas le nouveau client dans son fichier. Il se peut que la note du score nécessite simplement l'approbation à un niveau supérieur. Le KYC est une obligation réglementaire dans de nombreux pays pour lutter contre le blanchiment d'argent et le financement du terrorisme.

## Les Input

Afin de pouvoir calculer le score il est nécessaire d'avoir les inputs. Pour cela nous allons avoir besoin de trois entrées : 

1. ***PEP***
    * Pour Political Exposed People (Personne Politiquement Exposée)
    * de type `boolean`
    * Indique si le client occupe ou a occupé des fonctions politiques importantes
1. ***Amount***
    * Pour la quantité de son apport initial
    * de type `number`
    * Représente le montant que le client souhaite déposer
1. ***Fiscal Residency***
    * Pour la localisation de sa résidence fiscale
    * de type `string`
    * Permet d'évaluer les risques liés à certaines juridictions

Dans le contexte DMN il suffit simplement d'utiliser le type de *box* suivantes :

![DMN Input](/img/dmn_input.png)

Il est bien sûr possible de définir des types d'entrée plus complexes, comme des structures ou des collections, selon les besoins du modèle de décision.

## Les Decision

Le principal élément du DMN est le concept de Decision. Cette `Decision` va calculer un résultat en fonction d'une ou plusieurs entrées.
On utilise pour cela les *box* suivantes dans le modeleur.

![DMN Decision Box](/img/dmn_decision_box.png)

On lie ensuite les `Input` avec les `Decision` pour établir les dépendances de données.

![DMN Decision](/img/dmn_decision.png)

Ensuite, il est possible de lier les `Decision` entre elles, afin de remonter les sorties des premières `Decision` dans une autre `Decision`. Cette approche permet de construire des modèles de décision complexes et hiérarchisés.

![DMN Decision Link](/img/dmn_decision_link.png)

Ici l'`Input` *PEP* est utilisé par la `Decision` *PEP Rule*, qui sera lui-même utilisé dans la `Decision` *KYC*.

### Type de décision 

1. Literal expression
    * Il s'agit d'une formule/code FEEL
    * par ex : A - B,  SUM(A, B, C) 
    * ex: 
    
    ![DMN Expression Language](/img/dmn_explang.png)
    
2. Decision Table
    * Il s'agit d'une liste de règles métier qui seront exécutées selon des conditions spécifiques
    * Particulièrement utile pour représenter des règles complexes de manière tabulaire
    * ex: 
    
    ![DMN Decision Table](/img/dmn_decisiontable.png)
    
3. Context
    * Il s'agit d'une liste de variables associées à des valeurs
    * Chaque valeur de la liste peut être le résultat d'une `Literal expression`, d'une `Decision Table` ou d'une `BKM`
    * Permet de structurer des décisions complexes en sous-éléments
    * ex: 
    
    ![DMN Context](/img/dmn_context.png)

## Les Business Knowledge Model

Les `Business Knowledge Model` (BKM) fournissent au modeleur la possibilité de réutiliser des briques logiques. Pour un développeur, les `BKM` peuvent être vues comme des fonctions réutilisables dans une ou plusieurs `Decision`, notamment car elles s'appellent directement dans les `Decision` et qu'elles possèdent des paramètres d'entrées. Cette approche favorise la réutilisation et la maintenance du modèle de décision.

Comme pour les `Decision` il existe trois types de `BKM`.

![DMN BKM](/img/dmn_bkm.png)

Dans notre cas nous allons utiliser une `Decision Table` pour calculer le score pour chaque règle.

![DMN Function](/img/dmn_function.png)

On relie ensuite le `BKM` avec la `Decision` pour établir la relation d'utilisation.

![Full DMN BKM](/img/dmn_bkm_full.png)

## Result

C'est la `Decision` KYC qui va contenir le résultat de ce petit moteur de règles. Dans notre cas, nous faisons la somme des trois appels à la `BKM` Level de chaque retour des `Decision` rule. Bien sûr, cette fonction peut être plus ou moins compliquée car elle utilise le langage de programmation FEEL *(Friendly Enough Expression Language)*. Il s'agit d'un langage qui ressemble un peu aux macros Excel, ce qui facilite son adoption par les équipes métier.

![DMN Result](/img/dmn_result.png)

Pour résumer, les `Input` sont donc utilisés dans les `Decision`, ces `Decision` sont reliées à des `BKM` ou bien d'autres `Decision` qui au fur et à mesure se terminent vers une seule `Decision`.
Comme on l'a vu précédemment, la `Decision` finale peut avoir plusieurs types de retour.
Par convention on partira du bas pour les `Input` puis étage par étage on empilera les `Decision` jusqu'à les réduire en une seule, qui représente la décision finale du modèle.

# Conclusion

J'espère que cette brève introduction à `DMN` vous aura convaincu de l'utiliser dans vos projets de moteur de règles. Le fait de standardiser les spécifications du moteur de règles permettra par exemple de pouvoir changer de fournisseur de moteur de règle sans avoir à redévelopper l'ensemble de la logique métier. En fonction des fournisseurs, une documentation peut être automatiquement générée facilitant le fond documentaire des projets et l'interaction avec les analystes business. 

L'approche DMN présente plusieurs avantages majeurs :
- Séparation claire entre la logique métier et le code applicatif
- Facilité de maintenance et d'évolution des règles
- Meilleure collaboration entre équipes techniques et métier
- Portabilité entre différentes implémentations de moteurs de règles

Nous verrons dans un prochain post comment exécuter le moteur de KYC avec une implémentation concrète. 

Vous pouvez voir directement [le résultat du DMN avec cet éditeur en ligne](https://kiegroup.github.io/kogito-online/?file=https://github.com/gautric/dmn-knative/blob/master/src/main/resources/KYC.dmn#/editor/dmn)
