---
title: "Pattern Découpler la Réception et Utilisation des Signaux avec jBPM & Drools"
date: 2021-09-26 15:00:00
categories: ["blog"]
tags: ["fr", "jBPM", "Drools", "Pattern", "Signal", "Reception"]
---

Pour mon activité professionnelle, je me déplace[^2020] chez les clients afin d'expertiser les solutions qu'ils mettent en place dans leur système d'information et notamment le produit [RHPAM](https://developers.redhat.com/products/rhpam/overview)[^jbpm]. Pour le compte d'un client donc, j'ai travaillé sur les processus métiers qu'il a mis en place chez lui. Ces processus de type BPMN permettent de gérer des processus de gestion sur lesquels nous n'allons pas nous étendre ici. Nous allons plutôt nous concentrer sur un patron de conception particulièrement intéressant tant par sa fonctionnalité que par son implémentation technique.

[^2020]: Sur site ou bien à distance depuis mars 2020 :-(.
[^jbpm]: RHPAM est un produit Red Hat, jBPM est le projet communautaire à la base de RHPAM.

> Découplage de la réception du signal de son utilisation.

Il est vrai qu'en anglais cela rendrait plutôt "Decoupling Signal Reception".

## Rappel des processus BPMN

Les Processus BPMN permettent de décrire des processus métier de haut niveau sous la forme de graphiques standardisés par Object Management Group (OMG) specification.
Ces processus métiers facilitent la communication car ils peuvent être écrits par les métiers via des outils de design de type NoCode et déployés sans changement par les intégrateurs sur des moteurs prévus à cet effet. Le standard BPMN normalise les processus métiers avec des concepts largement éprouvés au fil du temps (notion de timer, de signaux, de message, d'appel, etc...).

![Exemple de sous-processus BPMN](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/aee1d31b5af75c88df09df6e0f551b2c/subprocess.png)

### Les signaux dans BPMN

Les signaux dans le standard BPMN servent à communiquer des événements métiers aux processus.
Les processus peuvent être à la fois émetteurs ou récepteurs des événements de type signal.
En fonction des besoins, les processus communiquent les uns avec les autres sur la base de signaux.
Les signaux peuvent être exogènes au système BPM, c'est-à-dire provenir de systèmes externes.

#### Nomenclature

* Voici le noeud pour démarrer une instance de processus après avoir reçu un message.

![Signal Start event](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/9cc74191cdf22549a73ad8f904f8754d/bpmn-signal-start.png)

* Pour écouter puis continuer l'exécution d'une instance de processus après avoir reçu le bon signal, on utilisera ce noeud.

![Signal Catching Event](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/3d9480f8f2c20c306c21f2d16a8c1db8/bpmn-intermediate-signal.png)

{{< notice warning >}}
Ce noeud est bloquant, l'instance de processus est en attente de la réception du signal.
{{< /notice >}}

* L'envoi d'un signal en cours de traitement est possible avec le noeud suivant.

![Signal Throwing Event](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/90694fc3ec2964e0f43245281ed87df1/bpmn-signal-throwing.png)

* Et enfin le noeud permettant de finir une instance de processus tout en envoyant un signal.

![Signal End Event](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/f262354a95af508ef2fd529635b79a55/bpmn-end-signal.png)

Dans tous les cas, il est nécessaire de donner un nom de signal. Ce nom doit être le plus parlant possible tout en évitant d'être trop technique. 

- RELANCE_CLIENT
- NOTIFICATION_FOURNISSEUR
- ERREUR_PROCEDURE

{{< notice info >}}
Avec jBPM/RHPAM, les noms des signaux peuvent être variabilisés comme ceci : ALERTE_#{ID_CLIENT}
{{< /notice >}}

#### Scope des Signaux

En fonction du fournisseur BPM, le scope d'émission du message peut être modulé. Le scope correspond à la portée du signal qui peut être envoyé _plus ou moins loin_.

* _Instance de processus_
	* Le signal est envoyé au niveau d'instance de processus 
* _Model de processus_
	* Le signal est envoyé au niveau de la définition du model du processus courant
* _Project/déploiement_
	* Le signal est envoyé à un ensemble des processus d'un ou plusieurs projets techniques.
* _Global_
	* Le signal est envoyé à tous les processus du moteur
* _Externe_ 
    * Le signal est diffusé plus largement à l'extérieur de l'instance du moteur de processus.

Mal définir le scope peut avoir un impact significatif sur les performances en fonction des moteurs, car plus ou moins d'instances de processus peuvent réceptionner le signal, ce qui peut entraîner un traitement supplémentaire non nécessaire.

{{< notice warning >}}
Les scopes ne sont pas forcément tous implémentés dans les solutions.
{{< /notice >}}

#### Interaction

Les différentes implémentations des moteurs BPM fournissent des interfaces afin de dialoguer via des signaux aux instances de processus.

* __IHM__
	* Le logiciel fournit une interface graphique (web, desktop) afin d'émettre le signal à un ou plusieurs processus.
* __API REST__
	* Une API REST (ou SOAP) est proposée et permet d'interagir via un appel REST/HTTP/JMS[^api] au moteur de processus.
* __API code__
	* Selon le logiciel BPM, celui-ci est muni d'une (ou plusieurs) librairie(s)[^lt] technique.

[^api]: peut dépendre du fournisseur
[^lt]: pour différents langages de programmation Java, C/C++, Python, JS etc...

Voici un tutorial (en anglais) d'un de mes collègues [Donato Marrazzo](https://github.com/dmarrazzo) présentant l'utilisation des signaux avec jBPM/RHPAM

![Tutoriel sur les signaux jBPM](http://www.youtube.com/embed/hAH9kDfMFHQ)

## Découplage de signaux

Lors de l'activation d'un signal "Signal Step", le processus va se mettre en "écoute" pour réceptionner le signal.
Il se peut que le signal, pour des besoins métiers, soit lancé (bien) avant l'activation du noeud signal, donc le processus peut manquer la réception du signal, le signal sera donc perdu et le processus restera toujours bloqué. 
Il est bien sûr possible d'avoir une branche incluant un délai afin de créer une branche de sortie et donc débloquer le processus. Mais en toute logique, la branche de délestage ne sera pas la branche nominale.

![Processus avec signal bloquant](/img/2021-09-26-jbpm-signal-pattern/processus-signal-bloquant.png)

Mais qu'en est-il si l'on souhaite tout de même recevoir le signal à n'importe quel moment[^duree], notamment si les actions avant la réception du signal sont longues "Long running Sub-Process", et tout de même réagir à l'événement signal? 

![Signal Catching Event](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/3d9480f8f2c20c306c21f2d16a8c1db8/bpmn-intermediate-signal.png)

Car comme nous l'avons vu précédemment, la réception du signal sera possible dès que le moteur BPM arrivera sur le noeud "Catching Signal", pas avant. Il nous faut donc essayer de trouver un nouveau pattern afin de découpler la réception du signal.

### Sous-Processus 

Pour cela nous allons créer un sous-processus attenant au processus principal. L'idée principale de ce sous-processus est de se mettre en écoute de l'événement signal même si on ne va pas utiliser cette information tout de suite dans le processus principal.

![Sous-processus de réception de signal](/img/2021-09-26-jbpm-signal-pattern/sous-processus-reception-signal.png)

Avec ce sous-processus nous allons simplement recevoir le signal via le noeud "Signal Start Event", à n'importe quel moment du cycle de vie du processus.

![Signal Start Event](https://access.redhat.com/webassets/avalon/d/Red_Hat_Process_Automation_Manager-7.3-Process_designer_Business_Process_Model_and_Notation_BPMN2_reference_guide-en-US/images/9cc74191cdf22549a73ad8f904f8754d/bpmn-signal-start.png)

Le deuxième noeud "Script Node" va stocker l'événement signal dans la session Drools.
Et comme la session Drools est difficilement auditable nous copions aussi l'événement dans une variable de processus [^var].

```java
// Fact insertion into Drools Session
kcontext.getKieRuntime().insert("SUB_PROCESS_SIGNAL");

// Coping variable of the signal event into process variables 
kcontext.setVariable("SubProcessSignalFlag", "Received");
```

Drools est le moteur de règles intégré à jBPM. Il fournit à la fois un langage de programmation pour concevoir des règles métiers et un moteur d'inférence qui réagit automatiquement à chaque changement de contexte. Ici notre contexte sera la session Drools de l'instance de processus dans laquelle on insère un nouvel objet [^obj].

[^var]: On peut bien entendu utiliser les fonctions de "Data Assignments" pour le stockage de l'événement signal dans la table d'audit (activer le mécanisme d'audit de jBPM) ou bien les listeners afin de tracer le signal via un code spécifique.
[^obj]: Objet plus ou moins complexe, dans notre cas une simple chaîne de caractères.

Ensuite, on termine simplement le sous-processus et on rend la main.

[^duree]: pendant la durée du processus uniquement. 

Avec ce sous-processus de réception de signal, nous stockons dans la session (Drools) et/ou une variable de processus l'événement signal. L'événement signal est bien sauvegardé dans l'instance de processus. Il va falloir maintenant exploiter cette information disponible dans les infos du processus.

### Branche de traitement

Afin d'exploiter l'événement signal stocké dans les infos de l'instance de processus, nous allons modifier notre processus.
Voici maintenant le mécanisme d'utilisation de l'événement signal. 

![Flux Drools pour traitement du signal](/img/2021-09-26-jbpm-signal-pattern/drools-flow-signal.png)

Nous remplaçons l'attente du signal par une condition particulière. Cette condition, dans notre cas, est stockée dans la session Drools. 

![Implémentation Drools du signal](/img/2021-09-26-jbpm-signal-pattern/drools-implementation-signal.png)

Le noeud "Drools Step" configure le "Conditional Event" sous la forme d'une règle Drools. Ici, ce noeud vérifie la présence de l'objet String dans la session, cette chaîne de caractère devra être égale à "SUB_PROCESS_SIGNAL" pour valider la condition. 

La session Drools, mise à jour via le sous-processus de réception du signal, est utilisée quand il le faut par l'instance de processus.
L'avantage de l'utilisation du conditional event est qu'il peut être rafraîchi à tout moment si la session change, donc la session peut être mise à jour avant ou pendant l'activation du noeud et donc faire avancer l'instance de processus comme il se doit.

## Final

Voici donc, le schéma complet du processus implémentant le pattern que nous venons de voir. Ce schéma générique ne gère pour l'instant qu'un signal et un type de condition, mais il est tout à fait possible d'avoir une implémentation plus complexe en fonction du besoin métier (plusieurs signaux, plusieurs variables, plusieurs conditions).

![Processus complet avec pattern de découplage](/img/2021-09-26-jbpm-signal-pattern/processus-complet-pattern.png)

{{< notice warning >}}
Ce pattern possède néanmoins le défaut de perdre la signification, dans la branche de traitement, de la source du "Conditional Event". En effet, le signal est réceptionné dans un sous-processus dédié, il est donc important de bien documenter l'élément déclencheur du "Conditional Event".
{{< /notice >}}

## Conclusion

Ce pattern permet de répondre au besoin de découplage de la réception du signal de son utilisation plus tard dans le processus. Il n'y a plus besoin donc de bloquer le processus principal sur le signal et donc il est possible d'effectuer des traitements relativement longs tout en continuant à utiliser les signaux.
Cela apporte plus de flexibilité dans le design de conception des processus sans trop perdre dans la lisibilité des modèles. Cette approche est particulièrement utile dans les environnements où les signaux peuvent arriver de manière asynchrone et imprévisible, permettant ainsi une meilleure résilience du système.

<!-- ### Links

* [The Full project](https://github.com/gautric/bpmn-pattern) but you have to do some cleanup. -->


### Remerciements

* Un grand remerciement à T. B., mon contact client qui se reconnaîtra.
* À [Rachid Snoussi](https://fr.linkedin.com/in/snoussi) pour la relecture.
* Thx [Donato Marrazzo](http://dmarrazzo.github.io/) for your tutorial.

