---
title:  "Quarkus & Java 11-17 et GitHub Action feat. Matrix"
date:   2022-06-08 15:00:00
categories: ["blog"]
tags: ["fr","Java","CI/CD","Quarkus"]
##url: /blog/2022/06/08/GitHub-Matrix.html
---

La construction des applications modernes et dites cloud natives passent obligatoirement par la case CI/CD. Les pipelines de type GitHub Action d'applications permettent de standardiser les processus de constructions, de tests, de versionning ainsi que de déploiement des applications. L'avantage des pipelines de constructions est le rapide feedback aux développeurs des erreurs dans la chaîne de traitement. Ainsi, il est facile de modifier un élément de configuration pour voir le résultat. 
Les applications modernes nécessitent de pouvoir migrer des socles techniques de manière transparente.

> Compiler en Quarkus/Java 11 et 17 avec GitHub Action les Matrix

L'idée dans ce post est de montrer très simplement un exemple de double compilation Java 11 et Java 17. Ces versions de Java sont des versions LTS[^lts] c'est-à-dire qu'elles disposent d'un support long terme. Cette approche est particulièrement utile pour assurer la compatibilité de votre application avec différentes versions de l'environnement d'exécution Java, facilitant ainsi la transition vers des versions plus récentes.

[^lts]: https://fr.wikipedia.org/wiki/Long-term_support

Regardons rapidement le pipeline GitHub Action[^gha] avec la possibilité de compiler sur deux versions de Java différentes. Comme toutes les GitHub Action le fichier doit se trouver dans le répertoires .github/workflows de votre projet. Cette configuration permet d'exécuter automatiquement les tests sur chaque version spécifiée, garantissant ainsi que votre code fonctionne correctement dans tous les environnements cibles.

[^gha]: https://docs.github.com/en/actions

```yaml
name: eaas-ci-matrix

on: [push]

jobs:
  build:
    strategy:                        (1)
      matrix:
        version: [11, 17]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v3
      - name: Set up JDK {{ "${{ matrix.version " }}}}
        uses: actions/setup-java@v3
        with:
          java-version: {{ "${{ matrix.version " }}}}
          distribution: 'adopt'
      - name: Build with Maven {{ "${{ matrix.version " }}}}
        run: mvn --batch-mode --update-snapshots verify
```

Pour cela il faut simplement rajouter la section (1) dans la GitHub Action afin de configurer la matrice des versions de java avec lesquelles on souhaite compiler. La directive `matrix` permet de définir des variables qui seront substituées dans les étapes suivantes, créant ainsi plusieurs flux d'exécution parallèles.

Suite à une modification (push) dans le repository, la GitHub Action va être déclenchée. Le système va automatiquement créer des jobs distincts pour chaque combinaison définie dans la matrice.

![Vue d'ensemble des jobs dans la matrice](/img/gha-java-matrix.png)

GitHub Action va automatiquement créer autant de sous-pipeline que la matrice va prévoir. Chaque job s'exécute de manière indépendante, ce qui permet d'obtenir rapidement des résultats pour toutes les configurations.

![Compilation Java 11](/img/gha-java-11.png)

Voici l'exemple d'une compilation en Java 11. On peut observer les détails spécifiques à cette version dans les logs d'exécution.

![Compilation Java 17](/img/gha-java-17.png)

Et voici une compilation en Java 17. Les différences entre les deux environnements sont gérées automatiquement par GitHub Actions.

## Conclusion

Avec cet exemple très simple, nous voyons qu'il est possible d'ajouter rapidement des matrices de configuration afin de tester plusieurs cas en parallèle via les GitHub Action. Cette feature incluse dans GitHub facilite et permet d'accélérer les montées de version par exemple. On pourra utiliser cette feature pour changer de socle, de brique tech, de librairie, de framework en toute sérénité.

Cette approche est particulièrement précieuse dans le contexte de Quarkus, qui vise à être compatible avec différentes versions de Java. En testant systématiquement sur Java 11 et 17, vous vous assurez que votre application reste fonctionnelle indépendamment de l'environnement d'exécution choisi par vos utilisateurs ou imposé par votre infrastructure.

#### Footnotes
