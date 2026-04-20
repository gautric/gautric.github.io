---
title: "Leshan et le standard Lightweight M2M à l'EclipseCon"
date: 2015-07-01 13:58:00
categories: ["blog"]
tags: ["fr", "eclipsecon", "CoAP", "leshan", "M2M", "lightweight", "Toulouse"]
---

# Découverte du protocole LWM2M pour l'Internet des Objets

Lors de l'[EclipseCon](https://www.eclipsecon.org/france2015/) à Toulouse, [Red Hat](https://www.redhat.com) était présent en tant que sponsor Bronze avec [un stand](https://www.flickr.com/groups/2812102@N25/pool/). L'occasion de suivre une formation sur le protocole CoAP et [le standard LWM2M](https://www.eclipsecon.org/france2015/session/hands-lightweight-m2m-run-smartwatch-internet-things) dispensée par [Julien Vermillard](http://people.apache.org/~jvermillard/) de [Sierra Wireless](http://www.sierrawireless.com/).

## Le protocole CoAP : une alternative légère à HTTP pour l'IoT

Le protocole [**CoAP**](http://coap.technology/) (Constrained Application Protocol) a été conçu pour répondre aux contraintes de l'IoT et des communications **M2M** (Machine-to-Machine) :

- Puissance de calcul limitée
- Consommation énergétique minimale
- Bande passante restreinte

CoAP peut être vu comme l'équivalent de HTTP pour les objets connectés. Il reprend des concepts similaires, adaptés aux contraintes :

* **Architecture RESTful** avec des ressources accessibles via des URI
* **Méthodes** similaires à HTTP : GET, POST, DELETE, PUT (encodées en binaire)
* **Codes de retour** comparables : 2.01, 2.03, 4.01, 4.03, 4.04 (format binaire)

### Principales fonctionnalités de CoAP

Caractéristiques définies dans la [RFC 7252](https://tools.ietf.org/html/rfc7252) :

* **Protocole RESTful** implémentant les contraintes M2M
* **Transport UDP** avec gestion de confirmation, support unicast et multicast
* **Sécurité** via DTLS (Datagram Transport Layer Security) 1.2
* **Support des URI et Content-types**
* **Mode Observe** pour les notifications push (sans polling)
* **Empreinte réseau réduite** grâce aux en-têtes binaires
* **Intégration** avec des mécanismes de proxy et de cache
* **Passerelle transparente** entre CoAP et HTTP

## Le standard LWM2M : gestion des objets connectés

Le standard **Lightweight M2M** (LWM2M) développé par l'**Open Mobile Alliance** (OMA) ajoute une couche d'abstraction au-dessus de CoAP. Cette couche résout plusieurs problématiques de gestion des objets connectés déployés sur le terrain :

* Vérifier l'état de la batterie d'un capteur
* Redémarrer un appareil à distance
* Mettre à jour le firmware
* Consulter ou modifier des paramètres de configuration

LWM2M gère également le **cycle de vie** des objets déployés :

* **Provisionnement** : configuration initiale et paramétrage
* **Enregistrement** : découverte et intégration au système
<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/lwm2m-registration-diagram.png" style="max-width:100%;" height="110" hspace="30" alt="Diagramme d'enregistrement LWM2M"/>

* **Gestion** : contrôle et configuration à distance
<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/lwm2m-management-diagram.png" style="max-width:100%;" height="110" hspace="30" alt="Diagramme de gestion LWM2M"/>

* **Notifications** : alertes et mises à jour d'état
<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/lwm2m-notification-diagram.png" style="max-width:100%;" height="110" hspace="30" alt="Diagramme de notification LWM2M"/>


### Modèle de données LWM2M : Clients, Objects et Resources

[**LWM2M**](http://technical.openmobilealliance.org/Technical/technical-information/omna/lightweight-m2m-lwm2m-object-registry) définit un modèle de données hiérarchique :

1. **Client** : l'appareil connecté (capteur de température, GPS, etc.)
2. **Object** : ensemble cohérent de fonctionnalités liées à un même concept
3. **Resource** : donnée ou action spécifique au sein d'un Object

Exemple : un GPS est un *Client* possédant plusieurs *Objects*. Un *Object* représente la localisation (longitude, latitude, altitude, horodatage), un autre contient les informations de l'appareil (modèle, numéro de série, firmware, batterie).

Le serveur LWM2M interagit avec les *Resources* par lecture, écriture ou exécution d'actions. Grâce aux URI, l'accès est précis :
- `/3/0` : toutes les informations de l'Object Device
- `/3/0/2` : le numéro de série (Resource 2 de l'Object Device)

### Objects standardisés par l'OMA

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

Exemple des Resources de l'Object **Connectivity Statistics** :

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

L'**IPSO Alliance** propose des Objects de plus haut niveau pour capteurs et actionneurs courants (GPIO, luminosité, température, accéléromètre, etc.).

Exemple des Resources de l'Object **IPSO Illuminance (3301)** :

Attribut | id | type | R/W/E | units
---------|:--:|:----:|:---:| -----
Min Measured Value | 5601 | float | R |
Max Measured Value | 5602 | float | R |
Min Range Value       | 5603 | float | R |
Max Range Value      | 5604 | float | R |
Reset Min and Max Measured Values    | 5605 |   | E |
Sensor Value | 5606 | float | R |
Sensor Units  | 5607 | string | R |

## Sous le capot : implémentation d'un client GPIO avec Leshan

[*Leshan*](https://github.com/eclipse/leshan) est l'implémentation de référence du standard LWM2M par la [*Fondation Eclipse*](https://eclipse.org/org/).

L'exemple suivant crée un client LWM2M simulant une broche **GPIO numérique**. La classe `GPIOClient` contient deux sous-classes :
- `Device` : métadonnées de l'appareil
- `GPIO` : simulation d'une broche de sortie numérique

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

### Démonstration

Résultats obtenus avec le serveur Leshan :

1. **Enregistrement du client auprès du serveur**

<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/leshan-client-registration.png" style="max-width:75%;" alt="Enregistrement du client GPIO auprès du serveur Leshan"/>

2. **Lecture des ressources du client**

<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/leshan-client-resources.png" style="max-width:75%;" alt="Ressources disponibles sur le client GPIO"/>

{{< notice warning >}}
L'instanciation de la GPIO / IPSO Digital Output se fait pour l'instant uniquement depuis le serveur via une requête CREATE.
{{< /notice >}}

3. **Création d'un objet GPIO depuis le serveur**

<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/leshan-gpio-creation.png" style="max-width:75%;" alt="Création d'un objet GPIO depuis le serveur"/>

{{< notice warning >}}
Les paramètres ne sont pas encore correctement envoyés lors de la création. Il faut les définir un par un après la création.
{{< /notice >}}

4. **Modification des propriétés de l'objet GPIO**

<img src="/img/2015-07-01-eclipsecon-leshan-lwm2m/leshan-gpio-properties.png" style="max-width:75%;" alt="Modification des propriétés GPIO"/>

5. **Logs du client**

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
Le projet Leshan est encore en développement actif. Certaines fonctionnalités ne sont pas complètement implémentées.
{{< /notice >}}

## Conclusion

Le standard [**LWM2M**](http://technical.openmobilealliance.org/Technical/technical-information/omna/lightweight-m2m-lwm2m-object-registry) basé sur [**CoAP**](http://coap.technology/) offre un bon équilibre entre :

- La simplicité RESTful du monde web
- Les contraintes des objets connectés (faible consommation, ressources limitées, bande passante restreinte)

En conservant des concepts familiers (URI, ressources, méthodes HTTP-like), LWM2M facilite l'adoption par les développeurs web. La sécurité est assurée par DTLS. La standardisation des Objects et Resources favorise l'**interopérabilité** entre fabricants.

La prochaine étape : intégrer Leshan dans le projet [**Camel IoT Labs**](https://github.com/camel-labs/camel-labs) pour connecter des appareils LWM2M à d'autres systèmes d'entreprise via Apache Camel.

### Liens

* [Support de formation de Julien Vermillard](http://fr.slideshare.net/jvermillard/hands-on-with-lightweight-m2m-and-leshan)
* [Documentation technique LWM2M](http://fr.slideshare.net/zdshelby/oma-lightweightm2-mtutorial)
* [Site officiel CoAP](http://coap.technology/)
* [Projet Leshan sur GitHub](https://github.com/eclipse/leshan)
* [Registre des objets LWM2M de l'OMA](http://technical.openmobilealliance.org/Technical/technical-information/omna/lightweight-m2m-lwm2m-object-registry)