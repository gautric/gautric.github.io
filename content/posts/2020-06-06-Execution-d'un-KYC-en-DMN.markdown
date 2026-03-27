---
layout: post
css: blog
title:  "Exécution d'un moteur de KYC en DMN avec Kogito"
date:   2020-06-06 15:00:00
categories: ["blog"]
tags: ["fr","DMN","Kogito", "KYC"]
##url: /blog/2020/06/06/Execution-d'un-KYC-en-DMN.html
---

Dans le précédent [post sur ce blog](/blog/2020/06/04/Le-standard-DMN-un-KYC-en-exemple.html) nous avons vu rapidement comment créer sa définition et modélisation des règles d'un KYC basé sur le standard [DMN](https://fr.wikipedia.org/wiki/Decision_Model_and_Notation). Nous allons voir comment faire tourner cet exemple et exécuter sur un moteur implémentant le standard DMN. Cette approche permet de passer d'une modélisation théorique à une implémentation concrète et fonctionnelle.

> Exécution d'un moteur KYC en DMN avec Kogito

# Introduction Kogito

Faisons un focus rapide sur [Kogito](https://kogito.kie.org/). Kogito est un moteur de règle orienté cloud, conçu pour s'intégrer parfaitement dans les architectures modernes.
Ce moteur de règle reprend en grande partie tout le coeur et le développement de [Drools](https://www.drools.org/) et [jBPM](https://jbpm.org/) mais propose des fonctionnalités purement Cloud notamment le fait qu'il est prévu d'être exécuté dans un container de type OCI / Docker et deployé sur un cluster Cloud K8S / Openshift par exemple. Cette approche facilite considérablement le déploiement et la scalabilité des règles métier.

## Business Domain first approach

Un apport de Kogito au moteur Drools, c'est qu'il génére automatiquement l'API REST des règles DMN. Dans notre exemple nous allons copier/coller le fichier DMN KYC du post précédent et le faire tourner tel quel avec Kogito. Kogito va proposer une API `KYC` acceptant le model des `Input`. Il sera donc possible de faire un appel REST / HTTP avec des données métiers sans tout le liant technique que nous aurions pu avoir avec l'implémentation purement Drools. Nous allons avoir donc une API orientée métier dépourvue de spécificité technique, ce qui simplifie grandement l'intégration et l'utilisation par les équipes métier.

# Execution du projet 

Afin de pouvoir exécuter le modèle de règle KYC dans moteur Kogito il va falloir cloner le repository disponible sur Github. Ce repository contient la configuration nécessaire pour exécuter notre modèle DMN avec Kogito.

## Compilation

```bash
git clone --depth 1 --branch blog https://github.com/gautric/dmn-knative.git
cd dmn-knative
```

## Execution

Nous allons copier le fichier KYC.dmn que nous avons fait dans le post précédent. Ce fichier contient notre modèle de décision pour le processus KYC.

```bash
curl -L https://raw.githubusercontent.com/gautric/dmn-knative/master/src/main/resources/KYC.dmn \
-o src/main/resources/KYC.dmn 2> /dev/null 

mvn clean package quarkus:dev 
```

Voici le résultat de l'exécution de la commande :

```
__  ____  __  _____   ___  __ ____  ______ 
 --/ __ \/ / / / _ | / _ \/ //_/ / / / __/ 
 -/ /_/ / /_/ / __ |/ , _/ ,< / /_/ /\ \   
--\___\_\____/_/ |_/_/|_/_/|_|\____/___/   
2020-06-05 17:22:27,522 INFO  [io.quarkus] (main) dmn-knative 1.0-SNAPSHOT (powered by Quarkus 1.3.2.Final) started in 3.600s. Listening on: http://0.0.0.0:8080
2020-06-05 17:22:27,525 INFO  [io.quarkus] (main) Profile dev activated. Live Coding activated.
2020-06-05 17:22:27,526 INFO  [io.quarkus] (main) Installed features: [cdi, kogito, resteasy, resteasy-jackson, smallrye-openapi, swagger-ui]
```

## Swagger

Dès que vous avez correctment la sortie standard précédente, il est possible d'accéder à l'URL suivante : <http://localhost:8080/>

Vous allez atterrir sur la page swagger du moteur Kogito, une API KYC est disponible et peut être utilisée directement via cette page ou bien un appel CURL. Cette interface Swagger permet de tester facilement les différentes règles de notre modèle KYC sans avoir à écrire de code supplémentaire.

![Kogito DMN](/img/2020-06-06-execution-dmn-kyc/kogito-swagger-api.png)

## L'appel CURL

Pour tester notre API depuis la ligne de commande, nous pouvons utiliser CURL :

```bash
export DMN_URL=http://localhost:8080

curl -X POST -H "Content-Type: application/json" ${DMN_URL}/KYC --data-binary @- << EOF 2> /dev/null | jq
{
  "Amount": 250000,
  "PEP": false,
  "Fiscal Residency": "JP"
}
EOF
```

Attention la commande précédente utilise l'outil [jq](https://stedolan.github.io/jq/) pour formater la sortie JSON. Si vous ne l'avez pas installé, vous pouvez omettre la partie `| jq` de la commande.

Vous devriez obtenir le résultat suivant : 

```json
{
  "Amount Rule": "MEDIUM",
  "KYC": 25,
  "Fiscal Residency Rule": "LOW",
  "Amount": 250000,
  "PEP Rule": "LOW",
  "PEP": false,
  "Level": "function Level( input )",
  "Fiscal Residency": "JP"
}
```

Nous voyons qu'avec Kogito le détail de tous les calculs intermédiaires des `Decision` est disponible, jusqu'au calcul final au niveau de la valeur KYC ici dans notre exemple ci-dessus. Cela est intéressant à la fois pour du debugging ou bien pour une problématique d'auditabilité du moteur. Cette transparence est particulièrement utile dans les domaines où la traçabilité des décisions est une exigence réglementaire.

## Exemples

Des exemples sont disponibles dans le répertoire `data` du projet que l'on vient de cloner. Ces exemples vous permettent de tester différents scénarios de KYC avec des valeurs prédéfinies pour comprendre comment le moteur de règles réagit à différentes entrées.

# Conclusion

Avec cette exemple, nous voyons que la complexité technique d'utiliser un moteur DMN est très faible via Kogito qui propose directement une API métier. Il n'y a plus d'excuse pour ne pas utiliser à minima le standard `DMN` dans vos applications. Le projet Kogito est encore récent mais rien ne vous empêche de proposer des améliorations et/ou suggestions. L'utilisation de standards comme DMN combinée à des outils comme Kogito permet de réduire considérablement le temps de développement tout en améliorant la maintenabilité et la lisibilité des règles métier.
