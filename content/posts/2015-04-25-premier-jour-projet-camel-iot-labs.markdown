---
layout: post
css: blog
title:  "Les premiers jours du projet Camel IoT Labs"
date:   2015-04-25 13:58:00
categories: ["blog"]
tags: ["fr", "camel", "IoT", "RaspberryPi", "pi4j", "DeviceIO", "Tinkerforge", "Kura"]
#url: /blog/2015/04/25/premier-jour-projet-camel-iot-labs.html
---

Aujourd'hui, l'Internet des Objets (IoT) prend une place de plus en plus importante dans l'industrie informatique et au-delà. Des montres connectées [Withings](http://www.withings.com/fr/withings-activite.html), aux [Raspberry Pi](http://raspberrypi.org) vendus à plus de 5 millions d'unités, en passant par les cartes [Arduino](http://www.arduino.cc/) à bas coût et autres modules [Tessel](https://tessel.io/), la baisse du coût de production des objets électroniques a permis une large diffusion de ces nouvelles technologies.

<img src="/img/camel-labs.png" style="max-width:120%;" align="left" height="110" hspace="30"/> En 2012, les premiers Raspberry Pi sont lancés sur le marché, et j'en ai immédiatement acquis un. Depuis, j'ai collectionné presque tous les modèles : B rev1, B rev2, B+ et B2 ;-). J'ai également repris mon fer à souder, comme à l'époque du lycée. Mais contrairement à cette époque où l'on disposait de peu de ressources internet, peu de standards et peu de matériel, aujourd'hui nous avons presque tout à notre disposition. Il ne reste plus qu'à assembler des briques physiques avec des briques logicielles plus ou moins évoluées.

Un précédent projet pour un constructeur automobile m'avait particulièrement intéressé. Il s'agissait d'intégrer dans les voitures des applications web, un magasin d'applications et une connexion internet embarquée. J'ai alors commencé à me documenter sur les technologies M2M (Machine-to-Machine), ce qui m'a naturellement orienté vers des protocoles comme [MQTT](http://mqtt.org/) ou [AMQP](https://www.amqp.org/), les frameworks EIP (Enterprise Integration Patterns) et d'autres matériels que le Raspberry Pi.

Avec certains de mes amis de chez Red Hat (bonjour [Henryk](https://twitter.com/hekonsek), [Claus](https://twitter.com/davsclaus) et [Rob](https://twitter.com/rajdavies)), nous avons lancé un nouveau projet lié à [Apache Camel](http://camel.apache.org), ActiveMQ et à l'Internet des Objets. Ce projet, baptisé *[Camel IoT Labs](https://github.com/camel-labs/camel-labs)*, est disponible sur GitHub.

## Ce que nous sommes en train de réaliser

La première version du projet intégrera différents composants pour Camel :

* Support Raspberry Pi GPIO et I2C basé sur la bibliothèque [Pi4j](http://pi4j.com)
* Support Device IO basé sur l'API [Device IO](http://openjdk.java.net/projects/dio/)
* Intégration avec [Tinkerforge](http://www.tinkerforge.com/)
* Support [Eclipse Kura](https://eclipse.org/kura/) WiFi

## Le Matériel

Nous sommes également en train de créer un *Camel IoT DevKit*. Ce kit de développement permettra de construire rapidement des exemples d'intégration combinant les technologies suivantes : Camel, Raspberry Pi, LED, GPS, etc.
Un premier exemple est déjà disponible sur [ce blog ici](/blog/2015/04/03/apache-camel-raspberrypi-integration.html).

## Backend dans le cloud

Une solution IoT ne peut pas exister sans un backend dans le cloud. C'est pourquoi nous planifions la création de *Cloudlets* (microservices basés sur Apache Camel intégrant un certain nombre de fonctions de base pour le backend). La première cible sera Fabric8 avec OpenShift.

## Envie de contribuer ?

Ce projet vous semble intéressant ? Conjuguons nos efforts ! Parcourez la [liste des demandes](https://github.com/camel-labs/camel-labs/issues), nous sommes ouverts à toutes les nouvelles idées. Les Pull Requests sont les bienvenues ;-).

## Plus de liens

* Ce post est basé sur la [version anglaise](http://henryk-konsek.blogspot.fr/2015/04/camel-iot-labs-project-arrived.html) d'Henryk Konsek (merci à lui)
* Le [blog d'Henryk Konsek](http://henryk-konsek.blogspot.fr/) (IoT, MQTT, etc.)
* [Camel IoT Labs sur GitHub](https://github.com/camel-labs/camel-labs)
* [Bibliothèque Pi4j](http://pi4j.com)
* [Raspberry Pi](http://raspberrypi.org)
* [Apache Camel](http://camel.apache.org)
