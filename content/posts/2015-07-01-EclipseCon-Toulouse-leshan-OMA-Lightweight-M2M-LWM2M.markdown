---
layout: post
css: blog
title:  "Leshan et le standard Lightweight M2M à l'EclipseCon"
date:   2015-07-01 13:58:00
categories: ["blog"]
tags: ["fr","eclipsecon","CoAP","leshan","M2M","lightweight","Toulouse"]
#url: /blog/2015/07/01/EclipseCon-Toulouse-leshan-OMA-Lightweight-M2M-LWM2M.html
---

# Découverte du protocole LWM2M pour l'Internet des Objets

La semaine dernière, j'ai eu l'opportunité de participer à l'[EclipseCon](https://www.eclipsecon.org/france2015/) qui se déroulait à Toulouse. En tant que sponsor Bronze de cette édition, [Red Hat](https://www.redhat.com) (mon entreprise) était présente avec [un stand](https://www.flickr.com/groups/2812102@N25/pool/) pour échanger avec la communauté. C'est dans ce cadre que j'ai suivi une formation particulièrement enrichissante sur le protocole CoAP et [le standard LWM2M](https://www.eclipsecon.org/france2015/session/hands-lightweight-m2m-run-smartwatch-internet-things) dispensée par [Julien Vermillard](http://people.apache.org/~jvermillard/) de chez [Sierra Wireless](http://www.sierrawireless.com/), expert reconnu dans ce domaine.

## Le protocole CoAP : une alternative légère à HTTP pour l'IoT

Le protocole [**CoAP**](http://coap.technology/) (Constrained Application Protocol) a été spécifiquement conçu pour répondre aux contraintes particulières de l'Internet des Objets (IoT) et des communications Machine-to-Machine (M2M). Ces contraintes sont principalement :

- Une puissance de calcul limitée des appareils
- Une consommation énergétique qui doit rester minimale
- Une bande passante réseau souvent restreinte

CoAP peut être considéré comme l'équivalent de HTTP pour le monde des objets connectés, car il reprend de nombreux concepts et terminologies similaires, tout en les adaptant aux contraintes mentionnées :

* **Architecture RESTful** avec des ressources accessibles via des URI
* **Méthodes similaires** à HTTP : GET, POST, DELETE, PUT (mais encodées au format binaire pour réduire la taille)
* **Codes de retour** comparables : 2.01, 2.03, 4.01, 4.03, 4.04 (également au format binaire)

### Principales fonctionnalités de CoAP

Voici un aperçu des caractéristiques essentielles du protocole CoAP, telles que définies dans la [RFC 7252](https://tools.ietf.org/html/rfc7252) :

* **Protocole RESTful** implémentant l'ensemble des contraintes M2M
* **Transport basé sur UDP** avec gestion de confirmation, support unicast et multicast
* **Sécurité intégrée** via Datagram Transport Layer Security version 1.2 (DTLS)
* **Support des URI et Content-types** comme dans le monde web
* **Mode Observe** permettant les notifications push (sans polling)
* **Empreinte réseau réduite** grâce à des en-têtes et métadonnées au format binaire
* **Intégration possible** avec des mécanismes de proxy et de cache
* **Passerelle transparente** entre CoAP et HTTP

## Le standard LWM2M : une couche d'abstraction pour la gestion des objets connectés

Le standard Lightweight M2M (LWM2M) développé par l'Open Mobile Alliance (OMA) ajoute une couche d'abstraction au-dessus du protocole CoAP. Cette couche permet de résoudre plusieurs problématiques spécifiques à la gestion des objets connectés déployés sur le terrain.

En effet, les appareils IoT déployés dans le monde physique doivent non seulement remplir leur fonction principale, mais aussi communiquer diverses informations de gestion et permettre des opérations de maintenance à distance. Par exemple, il est souvent nécessaire de :

* Vérifier l'état de la batterie d'un capteur
* Redémarrer un appareil à distance
* Mettre à jour le firmware d'un dispositif
* Consulter ou modifier des paramètres de configuration

Le standard LWM2M s'occupe également de la gestion complète du cycle de vie des objets déployés avec des mécanismes standardisés pour :

* **Le provisionnement des appareils** : configuration initiale et paramétrage
* **L'enregistrement des appareils** : découverte et intégration au système
<img src="/img/RDR.png" style="max-width:100%;" height="110" hspace="30" alt="Diagramme d'enregistrement d'un appareil LWM2M"/>

* **La gestion des appareils** : contrôle et configuration à distance
<img src="/img/RWE.png" style="max-width:100%;"  height="110" hspace="30" alt="Diagramme de gestion d'un appareil LWM2M"/>

* **Les notifications de changement** : alertes et mises à jour d'état
<img src="/img/ONCO.png" style="max-width:100%;" height="110" hspace="30" alt="Diagramme de notification de changement LWM2M"/>

### Modèle de données LWM2M : Clients, Objects et Resources

[**LWM2M**](http://technical.openmobilealliance.org/Technical/technical-information/omna/lightweight-m2m-lwm2m-object-registry) définit un modèle de données hiérarchique clair pour organiser les fonctionnalités et informations des appareils connectés. Ce modèle s'articule autour de trois concepts fondamentaux :

1. **Client** : représente l'appareil connecté lui-même (par exemple, un capteur de température, un GPS, etc.)
2. **Object** : regroupe un ensemble cohérent de fonctionnalités ou d'informations liées à un même concept
3. **Resource** : représente une donnée ou une action spécifique au sein d'un Object

Par exemple, un GPS est un *Client* qui possède plusieurs *Objects*, chacun regroupant plusieurs *Resources*. Un *Object* peut représenter la localisation (avec des *Resources* comme longitude, latitude, altitude, horodatage), tandis qu'un autre *Object* peut contenir les informations sur l'appareil lui-même (numéro de modèle, numéro de série, version du firmware, niveau de batterie, etc.).

Le serveur LWM2M peut interagir avec ces *Resources* de différentes manières :
- Lecture de valeurs
- Écriture de paramètres
- Exécution d'actions (comme un redémarrage)

Grâce à l'utilisation des URI, le serveur peut accéder précisément à l'information souhaitée :
- `/3/0` pour accéder à toutes les informations de l'Object Device
- `/3/0/2` pour accéder spécifiquement au numéro de série (Resource 2 de l'Object Device)

### Objects standardisés par l'OMA

L'OMA a standardisé plusieurs *Objects* avec leurs *Resources* associées pour garantir l'interopérabilité entre les différentes implémentations :

Object Name     | id | singleton |  
--------------- |:--:|:----------:
Security        |0 | false
Server          |1 | false
Access Control  | 2 | false
Device          | 3 | true
Connectivity Monitoring  | 4 | true
Firmware        | 5 | true
Location        | 6 | true
Connectivity Statistics | 7 | true

<br/>

Voici un exemple détaillé des Resources disponibles dans l'Object **Connectivity Statistics** :

Attribut | id | type | R/W/E | units
---------|:--:|:----:|:---:| -----:
SMS Tx Counter | 0 | int | R |
SMS Rx Counter | 1 | int | R |
Tx Data        | 2 | int | R | Kilo-Bytes
Rx Data        | 3 | int | R | Kilo-Bytes
Max Message Size     | 4 | int | R | Byte
Average Message Size | 5 | int | R | Byte
StartOrReset   | 5 |  | E |

<br/>

En complément des Objects définis par l'OMA, l'IPSO Alliance propose des Objects de plus haut niveau pour représenter des capteurs et actionneurs courants (GPIO analogique/numérique, capteur de luminosité, capteur de température, accéléromètre, etc.).

Voici un exemple des Resources disponibles dans l'Object **IPSO Illuminance (3301)** :

Attribut | id | type | R/W/E | units
---------|:--:|:----:|:---:| -----
Min Measured Value | 5601 | float | R |
Max Measured Value | 5602 | float | R |
Min Range Value       | 5603 | float | R |
Max Range Value      | 5604 | float | R |
Reset Min and Max Measured Values    | 5605 |   | E |
Sensor Value | 5606 | float | R |
Sensor Units  | 5607 | string | R |

## Mise en pratique avec Leshan : implémentation d'un client GPIO

Passons maintenant à la partie pratique avec [*Leshan*](https://github.com/eclipse/leshan), l'implémentation de référence du standard LWM2M développée par la [*Fondation Eclipse*](https://eclipse.org/org/).

Pour illustrer le fonctionnement, nous allons créer un client LWM2M simulant une broche GPIO numérique. La classe `GPIOClient` ci-dessous contient deux sous-classes importantes :
- `Device` : représente les métadonnées de l'appareil physique
- `GPIO` : simule une broche de sortie numérique

```java
// Extrait de la classe GPIOClient
public class GPIOClient {
    // Classe représentant les métadonnées de l'appareil
    private class Device extends BaseInstanceEnabler {
        private static final int MANUFACTURER = 0;
        private static final int MODEL_NUMBER = 1;
        private static final int SERIAL_NUMBER = 2;
        // ... autres constantes ...

        @Override
        public ReadResponse read(int resourceId) {
            switch (resourceId) {
                case MANUFACTURER:
                    return ReadResponse.success(resourceId, "Eclipse Leshan");
                case MODEL_NUMBER:
                    return ReadResponse.success(resourceId, "Model 500");
                case SERIAL_NUMBER:
                    return ReadResponse.success(resourceId, "LT-500-000-0001");
                // ... autres cas ...
                default:
                    return super.read(resourceId);
            }
        }
        // ... autres méthodes ...
    }

    // Classe simulant une broche GPIO numérique
    private class GPIO extends BaseInstanceEnabler {
        private static final int STATE = 5500;
        private static final int POLARITY = 5501;
        private static final int APPLICATION_TYPE = 5750;
        
        private boolean state = false;
        private boolean polarity = false;
        private String applicationType = "GPIO";
        
        @Override
        public ReadResponse read(int resourceId) {
            System.out.println("Read value " + resourceId);
            switch (resourceId) {
                case STATE:
                    return ReadResponse.success(resourceId, state);
                case POLARITY:
                    return ReadResponse.success(resourceId, polarity);
                case APPLICATION_TYPE:
                    return ReadResponse.success(resourceId, applicationType);
                default:
                    return super.read(resourceId);
            }
        }
        
        @Override
        public WriteResponse write(int resourceId, LwM2mResource value) {
            System.out.println("Write value " + resourceId + " : " + value.getValue());
            switch (resourceId) {
                case STATE:
                    state = (boolean) value.getValue();
                    return WriteResponse.success();
                case POLARITY:
                    polarity = (boolean) value.getValue();
                    return WriteResponse.success();
                case APPLICATION_TYPE:
                    applicationType = (String) value.getValue();
                    return WriteResponse.success();
                default:
                    return super.write(resourceId, value);
            }
        }
    }
    
    // ... méthode main et autres méthodes ...
}
```

<script src="https://gist.github.com/gautric/9db1570898c3487f3829.js##file-gpioclient-java-L102"></script>

### Démonstration et captures d'écran

Voici les résultats obtenus lors de l'exécution de notre client LWM2M avec le serveur Leshan :

1. **Enregistrement du client auprès du serveur**

<img src="/img/leshan_1.png" style="max-width:75%;" alt="Capture d'écran montrant l'enregistrement du client GPIO auprès du serveur Leshan"/>

2. **Lecture de l'ensemble des ressources du client**

<img src="/img/leshan_2.png" style="max-width:75%;" alt="Capture d'écran montrant les ressources disponibles sur le client GPIO"/>

{{< notice warning >}}
L'instanciation de la GPIO / IPSO Digital Output se fait pour l'instant uniquement depuis le serveur via une requête CREATE. Cette fonctionnalité n'est pas encore disponible directement depuis le client.
{{< /notice >}}

3. **Création d'un objet GPIO depuis le serveur**

<img src="/img/leshan_3.png" style="max-width:75%;" alt="Capture d'écran montrant la création d'un objet GPIO depuis l'interface du serveur"/>

{{< notice warning >}}
Les paramètres ne sont pas encore correctement envoyés lors de la création de l'objet. Il est nécessaire de les définir un par un après la création.
{{< /notice >}}

4. **Modification des propriétés de l'objet GPIO**

<img src="/img/leshan_5.png" style="max-width:75%;" alt="Capture d'écran montrant la modification des propriétés de l'objet GPIO"/>

5. **Logs du client pendant l'interaction avec le serveur**

```log
juil. 02, 2015 6:48:19 PM org.eclipse.californium.core.network.config.NetworkConfig createStandardWithFile
INFOS: Loading standard properties from file Californium.properties
juil. 02, 2015 6:48:19 PM org.eclipse.californium.core.CoapServer start
INFOS: Starting server
juil. 02, 2015 6:48:19 PM org.eclipse.californium.core.network.CoAPEndpoint start
INFOS: Starting endpoint at /0.0.0.0:0
Registered with id: /rd/FU6hLfHTXZ
Write value state : true
Write value polarity : false
Write value applicationType : Ma nouvelle LED
Read value state : true
Read value state : false
Read value applicationType : Ma nouvelle LED
```

{{< notice warning >}}
Attention, le projet Leshan est encore en développement actif. Certaines fonctionnalités ne sont pas encore complètement implémentées ou peuvent présenter des limitations.
{{< /notice >}}

## Conclusion : LWM2M, un standard prometteur pour l'IoT

Le standard [**LWM2M**](http://technical.openmobilealliance.org/Technical/technical-information/omna/lightweight-m2m-lwm2m-object-registry) basé sur le protocole [**CoAP**](http://coap.technology/) offre une solution élégante à de nombreux défis de l'Internet des Objets. Il réalise un équilibre remarquable entre :

- La simplicité et l'approche RESTful du monde web
- Les contraintes spécifiques des objets connectés (faible consommation énergétique, ressources limitées, bande passante restreinte)

En conservant des concepts familiers du développement web (URI, ressources, méthodes HTTP-like), LWM2M facilite l'adoption par les développeurs déjà familiers avec les technologies web. La sécurité n'est pas négligée, avec l'intégration de mécanismes comme DTLS pour protéger les communications.

L'un des points forts de LWM2M est sa standardisation des objets et ressources, qui favorise l'interopérabilité entre différents fabricants et solutions. Cette approche structurée permet de construire des écosystèmes IoT cohérents et évolutifs.

Pour la suite de mes travaux, je prévois d'intégrer le framework Leshan dans le projet [**Camel IoT Labs**](https://github.com/camel-labs/camel-labs), ce qui permettra de connecter facilement des appareils LWM2M à d'autres systèmes d'entreprise via Apache Camel.

### Liens utiles pour approfondir

* [Support de formation de Julien Vermillard](http://fr.slideshare.net/jvermillard/hands-on-with-lightweight-m2m-and-leshan) - Présentation détaillée utilisée lors du training
* [Documentation technique sur LWM2M](http://fr.slideshare.net/zdshelby/oma-lightweightm2-mtutorial) - Ressource utilisée pour la rédaction de cet article
* [Site officiel du protocole CoAP](http://coap.technology/) - Documentation et spécifications complètes
* [Projet Leshan sur GitHub](https://github.com/eclipse/leshan) - Code source et documentation de l'implémentation Eclipse
* [Registre des objets LWM2M de l'OMA](http://technical.openmobilealliance.org/Technical/technical-information/omna/lightweight-m2m-lwm2m-object-registry) - Liste officielle des objets standardisés
