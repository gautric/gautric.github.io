---
layout: post
css: blog
title:  "Les premiers jours du projet Camel IoT Labs"
date:   2015-04-25 13:58:00
categories: ["blog"]
tags: ["fr", "camel", "IoT", "RaspberryPi", "pi4j", "DeviceIO", "Tinkerforge", "Kura"]
#url: /blog/2015/04/25/premier-jour-projet-camel-iot-labs.html
---

L'**Internet des Objets** (IoT) prend une place croissante dans l'industrie informatique et au-delà. Des montres connectées [Withings](http://www.withings.com/fr/withings-activite.html) aux [Raspberry Pi](http://raspberrypi.org) vendus à plus de 5 millions d'unités, en passant par les cartes [Arduino](http://www.arduino.cc/) à bas coût et les modules [Tessel](https://tessel.io/), la baisse du coût de production des composants électroniques a permis une large diffusion de ces technologies.

<img src="/img/camel-labs.png" style="max-width:120%;" align="left" height="110" hspace="30"/> En 2012, les premiers Raspberry Pi sont lancés sur le marché. Depuis, la collection s'est étoffée : B rev1, B rev2, B+ et B2. Le fer à souder a repris du service, comme à l'époque du lycée. Mais contrairement à cette époque où les ressources internet, les standards et le matériel étaient rares, aujourd'hui presque tout est à disposition. Il ne reste plus qu'à assembler des briques physiques avec des briques logicielles.

Un précédent projet pour un constructeur automobile avait ouvert la voie : intégrer dans les voitures des applications web, un magasin d'applications et une connexion internet embarquée. Cette expérience a conduit à explorer les technologies **M2M** (Machine-to-Machine), les protocoles comme [MQTT](http://mqtt.org/) ou [AMQP](https://www.amqp.org/), les frameworks **EIP** (Enterprise Integration Patterns) et d'autres matériels que le Raspberry Pi.

Avec des collègues de chez Red Hat ([Henryk](https://twitter.com/hekonsek), [Claus](https://twitter.com/davsclaus) et [Rob](https://twitter.com/rajdavies)), un nouveau projet lié à [Apache Camel](http://camel.apache.org), ActiveMQ et à l'Internet des Objets a vu le jour. Ce projet, baptisé *[Camel IoT Labs](https://github.com/camel-labs/camel-labs)*, est disponible sur GitHub.

## Ce qui est en cours de réalisation

La première version du projet intègre différents composants pour Camel :

* Support Raspberry Pi **GPIO** et **I2C** basé sur la bibliothèque [Pi4j](http://pi4j.com)
* Support **Device IO** basé sur l'API [Device IO](http://openjdk.java.net/projects/dio/)
* Intégration avec [Tinkerforge](http://www.tinkerforge.com/)
* Support [Eclipse Kura](https://eclipse.org/kura/) WiFi

## Le matériel

Un *Camel IoT DevKit* est également en cours de création. Ce kit de développement permettra de construire rapidement des exemples d'intégration combinant Camel, Raspberry Pi, LED, GPS, etc.
Un premier exemple est disponible sur [ce blog](/blog/2015/04/03/apache-camel-raspberrypi-integration.html).

## Backend dans le cloud

Une solution IoT ne peut pas exister sans un backend dans le cloud. D'où la création planifiée de *Cloudlets* — des microservices basés sur Apache Camel intégrant des fonctions de base pour le backend. La première cible sera **Fabric8** avec **OpenShift**.

## Envie de contribuer ?

Le projet semble intéressant ? La [liste des demandes](https://github.com/camel-labs/camel-labs/issues) est ouverte à toutes les nouvelles idées. Les Pull Requests sont les bienvenues.

## Liens

* Ce post est basé sur la [version anglaise](http://henryk-konsek.blogspot.fr/2015/04/camel-iot-labs-project-arrived.html) d'Henryk Konsek
* Le [blog d'Henryk Konsek](http://henryk-konsek.blogspot.fr/) (IoT, MQTT, etc.)
* [Camel IoT Labs sur GitHub](https://github.com/camel-labs/camel-labs)
* [Bibliothèque Pi4j](http://pi4j.com)
* [Raspberry Pi](http://raspberrypi.org)
* [Apache Camel](http://camel.apache.org)