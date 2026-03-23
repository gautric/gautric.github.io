---
layout: post
title:  "MQTTiser l'API Autolib avec Node-Red"
date:   2018-04-21 15:00:00
categories: ["blog"]
tags: ["fr","MQTT", "node-red", "flow", "api", "Paris", "Autolib"]
##url: /blog/2018/04/21/MQTTiser-l-API-Autolib-avec-Node-Red.html
---

{{< notice warning >}}
**Note (2024)** : Le service Autolib a été arrêté en juillet 2018. Cet article reste pertinent pour l'approche technique (Node-Red, MQTT, HomeAssistant) mais l'API de Paris utilisée ici n'est plus disponible.
{{< /notice >}}

Après un petit temps de silence, pour des raisons personnelles et notamment l'arrivée d'un petit Thomas, voici un nouveau post. Étant un utilisateur occasionnel d'[Autolib](<https://fr.wikipedia.org/wiki/Autolib%27_(Paris)>), j'ai besoin d'avoir en flux continu l'état des stations à côté de chez moi (nombre de voitures disponibles, nombre de places libres). Autour de mon domicile, j'ai plusieurs stations Autolib et je dois consulter régulièrement l'application iPhone en fonction de mes besoins. 

Afin de me simplifier la vie, j'ai installé et configuré chez moi la solution [HomeAssistant](https://www.home-assistant.io), qui est une plateforme de domotique open source très populaire. J'utilisais pour cela l'[API de Paris](https://opendata.paris.fr/page/home/) en mode [REST](https://fr.wikipedia.org/wiki/REST)/[HTTP](https://en.wikipedia.org/wiki/HTTP) pour récupérer les informations des stations Autolib.

Malheureusement, le nombre de requêtes est limité et plus on doit superviser de stations (voitures disponibles, places libres), plus on doit faire d'appels REST. HomeAssistant est un très bon outil mais un peu limité en terme de scripting du composant [RESTful](https://www.home-assistant.io/components/rest_command/).

Je me suis dit, pourquoi ne pas :

> MQTTiser l'API Autolib avec Node-Red

## Architecture

Voici en résumé l'architecture de la solution que l'on va mettre en place.

![MQTT Archi](/img/mqtt-archi.png)

* Description du schéma de principe :
  * Un flux/flow Node-Red va consommer régulièrement la *DataParis API*.
  * Le retour est parsé et découpé pour chacune des *stations Autolib*.
  * Chaque message est envoyé dans le *topic MQTT* correspondant à sa station.
  * Le client *HomeAssistant* s'abonne ensuite aux topics des stations souhaitées.


## API de Paris

L'API de Paris propose un grand nombre d'[Objets](https://opendata.paris.fr/explore/) sur lesquels il est possible de requêter (PLU, liste des prénoms, titularisations). La plupart du temps ces données sont des données froides, ce sont des extraits de bases de données internes à la Ville de Paris. 

Seules deux sources de données sont en temps réel, c'est-à-dire qu'elles sont mises à jour lors de chaque appel. Il s'agit du statut des stations [Velib](https://opendata.paris.fr/explore/dataset/velib-disponibilite-en-temps-reel/information/) et des stations [Autolib](https://opendata.paris.fr/explore/dataset/autolib-disponibilite-temps-reel/information/).

Dans notre cas, nous allons utiliser cette dernière :

Cette API indique en temps réel l'état des 1119 stations avec la requête HTTP suivante (on se limitera ici à 2 stations) :

```bash
curl https://opendata.paris.fr/api/records/1.0/search/?dataset=autolib-disponibilite-temps-reel&rows=2
```

```json
{
    "nhits": 1119,
    "parameters": {
        "dataset": ["autolib-disponibilite-temps-reel"],
        "timezone": "UTC",
        "rows": 2,
        "format": "json"
    },
    "records": [{
        "datasetid": "autolib-disponibilite-temps-reel",
        "recordid": "a1c22a2c66ac55e6de9b0badcf5fe4f71c33e652",
        "fields": {
            "status": "ok",
            "city": "Paris",
            "kind": "STATION",
            "station_type": "station",
            "charging_status": "operational",
            "rental_status": "operational",
            "cars_counter_bluecar": 3,
            "cars": 3,
            "public_name": "Paris/Ordener/65",
            "geo_point": [48.8913517, 2.3507171],
            "charge_slots": 0,
            "postal_code": "75018",
            "cars_counter_utilib_1.4": 0,
            "subscription_status": "nonexistent",
            "slots": 1,
            "id": "paris-ordener-65",
            "address": "65 rue Ordener",
            "cars_counter_utilib": 0
        },
        "geometry": {
            "type": "Point",
            "coordinates": [2.3507171, 48.8913517]
        }
    }, {
        "datasetid": "autolib-disponibilite-temps-reel",
        "recordid": "8b1396096c4c2761ec5120ffdd3fd824b18a824d",
        "fields": {
            "status": "ok",
            "city": "Paris",
            "kind": "STATION",
            "station_type": "station",
            "charging_status": "operational",
            "rental_status": "operational",
            "cars_counter_bluecar": 5,
            "cars": 5,
            "public_name": "Paris/Raymond Losserand/229",
            "geo_point": [48.828, 2.306022],
            "charge_slots": 0,
            "postal_code": "75014",
            "cars_counter_utilib_1.4": 0,
            "subscription_status": "nonexistent",
            "slots": 1,
            "id": "paris-raymondlosserand-229",
            "address": "229 Rue Raymond Losserand",
            "cars_counter_utilib": 0
        },
        "geometry": {
            "type": "Point",
            "coordinates": [2.306022, 48.828]
        }
    }]
}
```

Il n'est pas difficile de comprendre le schéma et le résultat obtenu. L'ensemble des informations nécessaires à notre besoin sont là :

* cars :
  * nombre de voitures disponibles sur la station.
* slots :
  * nombre de places libres sur la station.

Nous avons aussi des informations de type descriptif (nom de la station, coordonnées GPS, etc.). Elles pourront être utilisées dans d'autres cas d'usage bien sûr, comme l'affichage sur une carte par exemple.

## MQTT

Le Protocole MQTT est un protocole MoM (Message-oriented Middleware) dans le domaine de l'IoT. Ce protocole est largement utilisé dans le monde de l'Internet des Objets car il est ouvert, léger et consomme peu de ressources réseau. 

Dans la version 3.x, il n'implémente pas de gestion de Transaction, et se limite au mode Topic ou autrement appelé Publish/Subscribe. Plusieurs niveaux de QoS (Quality of Service) sont définissables tant sur le message, sur le topic que sur le broker lui-même. 

Plusieurs fonctionnalités sont intéressantes, notamment la notion d'adressage hiérarchique des topics. Il est possible de s'abonner dans ce cas-là à tout un sous-groupe de topics :

* **/nasdaq/#**
  * Pour tous les indices du nasdaq
* **/meteo/fr/92/#**
  * Pour toutes les villes du département du 92.

Utilisé au-dessus de TCP/IP et bindé sur le port 1883, il est standardisé par l'[OASIS](https://www.oasis-open.org/), l'[ISO](https://www.iso.org) et [IANA](http://www.iana.org/).

### Broker MQTT

Plusieurs Brokers MQTT existent sur le marché. Nous allons en voir deux OpenSource développés sur des langages différents. Nous allons ainsi tester leur interopérabilité.

#### [Mosquitto](https://mosquitto.org/)

Développé par la Fondation Eclipse, il est écrit en C. Il possède un bon support de la communauté et est régulièrement mis à jour.
Disponible sur l'ensemble des environnements Unix-like, il est distribué par les systèmes de packaging de chaque OS.

| Caractéristique | Détail |
| --------------- | ------ |
| _Version_ | 1.4.15 |
| _Date_ | Fév 2018 |
| _License_ | EPL/EDL |
| _Langage_ | C |

{{< notice warning >}}
Je n'ai pas encore trouvé de système de supervision un peu sérieux, je suis preneur de vos retours.
{{< /notice >}}

Dans ce post, nous allons simplement utiliser le client mosquitto qui est très facile d'utilisation.

```bash
$> mosquitto_sub -i <id client> -h <host> -t <topic> -v

$> mosquitto_sub -i mosquitto_client -h localhost -t "/autolib/boulognebillancourt/#" -v
```

{{< notice info >}}
Mosquitto est disponible en mode container Docker.
{{< /notice >}}


#### ActiveMQ Artemis

La fondation Apache quant à elle propose le projet communautaire [Apache ActiveMQ Artemis](https://activemq.apache.org/artemis/). Il s'agit du petit frère du projet [Apache ActiveMQ](https://activemq.apache.org/). Comme souvent dans les projets de la Fondation, le projet est développé en Java. 

Au contraire de Mosquitto qui est mono-protocole, Artemis supporte un grand nombre de protocoles ouverts comme : [AMQP v1.0](http://www.amqp.org/), MQTT, [STOMP](https://stomp.github.io/), [OpenWire](http://activemq.apache.org/openwire.html). Il est compatible [JMS 1.0](https://jcp.org/en/jsr/detail?id=170) et [2.0](https://jcp.org/en/jsr/detail?id=368) pour les utilisateurs de l'API JMS. Il est aussi facilement clusterisable afin de garantir une haute disponibilité.

| Caractéristique | Détail |
| --------------- | ------ |
| _Version_ | 2.5.0 |
| _Date_ | Mars 2018 |
| _License_ | Apache 2.0 |
| _Langage_ | Java |

{{< notice info >}}
ActiveMQ Artemis vient en standard avec un outil de monitoring.
{{< /notice >}}

## Node-red

Le projet Node-Red est un outil de création et d'exécution [EIP](http://www.enterpriseintegrationpatterns.com/) (Enterprise Integration Patterns) dédié à l'IoT et exécuté sur la plateforme [NodeJs](https://nodejs.org/en/). C'est un outil léger tout en disposant d'une IHM complète de création de flow. L'IHM permet de créer des flows de traitement en assemblant et reliant des composants d'entrée et/ou sortie entre eux via des liens.

Voici une liste non exhaustive des composants disponibles :

* mqtt in/out
* email in/out
* file in/out
* http/tcp/udp in/out
* timer, switch, change, range, join, sort, batch, function, debug, log
* csv, html, json, yaml, xml, html

Lorsque le flow est validé, il suffit simplement de le déployer pour l'exécuter directement.

| Caractéristique | Détail |
| --------------- | ------ |
| Version | v0.18.4 |
| Date | Jan 2018 |
| License | Apache 2.0 |
| Langage | JavaScript |

{{< notice info >}}
Node-Red s'exécute très bien sur un RaspberryPi.
{{< /notice >}}

## Flow Autolib

Pour notre use-case, nous allons faire un appel toutes les 20s (cf info) sur l'API de Paris. On vérifie rapidement que l'on récupère bien un retour HTTP/200.
On découpe ensuite la liste des stations message par message. Puis on crée dynamiquement pour chaque message, et donc chaque station, le bon adressage de Topic pour l'envoi au broker MQTT. Le composant RBE est simplement là pour faire transiter le message uniquement s'il y a effectivement un changement de contenu.

![MQTT Autolib flow](/img/mqtt-autolib-flow.png)

{{< notice info >}}
L'API de Paris est limitée à 5000 requêtes par jour.
Cela fait dans une journée, pas plus d'une requête toutes les 17s.
Donc pour être large, j'ai choisi un intervalle de 20s.
{{< /notice >}}

Le code du flow est disponible sur le repository suivant :

[https://github.com/gautric/mqtt-4-autolib/blob/master/flows_mbp.g.a.net.json](https://github.com/gautric/mqtt-4-autolib)

## Résultat

### Monitoring ActiveMQ

Nous voyons bien dans l'outil de monitoring les divers topics qui dépendent directement des stations Autolib. Nous voyons aussi la connexion de deux clients MQTT, l'un étant le Node-Red, l'autre le client Mosquitto.

![Monitoring](/img/mqtt-artemis-monitoring.png)

J'ai configuré les messages MQTT afin d'être en mode "retain" à minima, c'est pour cela que l'on retrouve un préfixe technique à l'adressage des topics des stations Autolib. Cette fonctionnalité permettra de conserver une dernière valeur si HomeAssistant tombe ou bien si le flux Node-Red s'arrête.

### Dashboard HomeAssistant

Mon Dashboard HomeAssistant commence à être bien complet avec plusieurs onglets pour chaque cas d'usage. J'ai un onglet en particulier qui affiche l'ensemble des informations de transport dont Autolib, la RATP ainsi que le trafic des voitures en Île-de-France.

#### Configuration

Après avoir envoyé les messages dans le broker ActiveMQ Artemis, il faut que le Dashboard HomeAssistant puisse lire correctement les données. Pour cela, il suffira de rajouter dans sa liste dans le fichier sensor.yaml, les sensors de type MQTT. Il suffit de comprendre le schéma du message reçu et de récupérer le bon élément du message.

```yaml
- platform: mqtt
  name: "Autolib Boulogne-Billancourt/Henri Martin/2 Cars"
  state_topic: "/autolib/boulognebillancourt/henrimartin/2"
  value_template: '{{value_json.fields.cars}}'
  unit_of_measurement: ''

- platform: mqtt
  name: "Autolib Boulogne-Billancourt/Henri Martin/2 Slots"
  state_topic: "/autolib/boulognebillancourt/henrimartin/2"
  value_template: '{{value_json.fields.slots}}'
  unit_of_measurement: ''

.....

- platform: mqtt
  name: "Autolib Last Update"
  state_topic: "/autolib/_lastCall"
  unit_of_measurement: ''
```

#### ScreenShot

Et pour finir, voici le résultat dans le Dashboard HomeAssistant. J'ai rajouté un petit hook dans le flow nominal afin d'avoir l'heure de la dernière mise à jour des données. Il s'agit de vérifier si tout se passe bien.

![HA](/img/mqtt-homeassistant.png)

#### Mosquitto Client

L'utilisation du client mosquitto est interopérable facilement avec le broker ActiveMQ Artemis.

```
$> mosquitto_sub -i mosquitto_client -h localhost -t "/autolib/boulognebillancourt/#" -v

/autolib/boulognebillancourt/henrimartin/2 {"datasetid":"autolib-disponibilite-temps-reel","recordid":"a165c1342525a1c27a24eb1cdf781eddf6aaa149","fields":{"status":"ok","city":"Boulogne-Billancourt","kind":"STATION","station_type":"station","charging_status":"nonexistent","rental_status":"operational","cars_counter_bluecar":1,"cars":1,"public_name":"Boulogne-Billancourt/Henri Martin/2","geo_point":[48.8365078,2.2524132],"charge_slots":0,"postal_code":"92100","cars_counter_utilib_1.4":0,"subscription_status":"nonexistent","slots":1,"id":"boulognebillancourt-henrimartin-2","address":"2 rue Henri Martin","cars_counter_utilib":0},"geometry":{"type":"Point","coordinates":[2.2524132,48.8365078]}}

/autolib/boulognebillancourt/reine/12 {"datasetid":"autolib-disponibilite-temps-reel","recordid":"885e5ba23a48e4c519ed9eded9422628dec6ef14","fields":{"status":"ok","city":"Boulogne-Billancourt","kind":"STATION","station_type":"station","charging_status":"nonexistent","rental_status":"operational","cars_counter_bluecar":4,"cars":4,"public_name":"Boulogne-Billancourt/Reine/12","geo_point":[48.8388074,2.2505008],"charge_slots":0,"postal_code":"92100","cars_counter_utilib_1.4":0,"subscription_status":"nonexistent","slots":1,"id":"boulognebillancourt-reine-12","address":"12 bis Route de la Reine","cars_counter_utilib":0},"geometry":{"type":"Point","coordinates":[2.2505008,48.8388074]}}
```

## Conclusion

En conclusion, pourquoi faire simple quand on peut faire compliqué ? En fait, j'utilise un broker MQTT pour d'autres cas d'usage dans ma domotique, donc je rentabilise bien l'utilisation de mon broker. 

Pour être totalement transparent, le broker Mosquitto est largement suffisant pour ma domotique, Artemis bien que beaucoup plus complet est un peu "overkill" pour mon usage. Je voulais simplement remercier la limite de l'API de Paris qui m'a permis de faire un petit projet d'intégration bien sympa je trouve, et toujours dans la philosophie des standards ouverts, de l'interopérabilité et des projets communautaires OpenSource.

Cette solution me permet désormais de consulter en temps réel l'état des stations Autolib à proximité de chez moi directement depuis mon dashboard HomeAssistant, sans avoir à ouvrir constamment l'application mobile.

En espérant vous avoir intéressé par ce post, n'hésitez pas à me faire vos retours.
