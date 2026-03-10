---
title:  "Activer & Désactiver sa camera PoE via son routeur Cisco"
date:   2024-01-28 09:00:00
#categories: ["blog"]
tags: ["fr","Cisco","PoE","WebCam"]
#url: /blog/2024/01/28/activer-desactiver-sa-camera-poe-via-son-routeur-cisco
---

Dans cet article, nous allons découvrir comment activer ou désactiver une caméra via un routeur Cisco. Chez moi, j'ai mis en place une installation permettant la télésurveillance en mode DIY. J'utilise une caméra en mode PoE avec un routeur Small Business de la marque Cisco. Plus précisément, il s'agit du [Cisco Commutateur Intelligent SG250-10P](https://www.amazon.fr/Cisco-SG250-10P-10-Ports-Gigabit-Switch/dp/B01GZ1VXYO), qui offre la fonctionnalité PoE (Power over Ethernet) permettant d'alimenter des périphériques directement via le câble réseau, éliminant ainsi le besoin d'une alimentation séparée.

> Activer/Désactiver sa camera PoE depuis son routeur Cisco

### Prérequis

Avant de commencer, il faut pouvoir [se connecter en SSH sur le routeur](https://www.cisco.com/c/en/us/td/docs/switches/lan/csbms/250_/2_5_7/Admin_guide/tesla-250-ag/cb_250_chapter_15.html#ID-00006535). 
Il est possible de créer un compte de service (service account) auquel on configurera une clé SSH pour une connexion à distance. Cette approche est recommandée pour des raisons de sécurité et facilite l'automatisation des tâches de gestion.

Ensuite, il est nécessaire de connaître sur quel port physique la caméra est connectée. Dans mon cas, il s'agit du port n°2. Vous pouvez identifier le port utilisé en vérifiant les connexions physiques ou en consultant l'interface d'administration du routeur.

## Activation

Après avoir établi la connexion SSH avec le périphérique, vous allez pouvoir utiliser les commandes suivantes pour effectuer différentes opérations :

```cisco
cisco-sg250-10p# config
cisco-sg250-10p(config)# no logging console
cisco-sg250-10p(config)# int gi 2
cisco-sg250-10p(config-if)# power inline auto
cisco-sg250-10p(config-if)# exit
cisco-sg250-10p(config)# exit
cisco-sg250-10p# exit
```

1.  Accéder au mode configuration.
1.  Désactiver l'écho de logging.
1.  Sélectionner l'interface appropriée.
1.  Activer le mode Power over Ethernet (PoE).
1.  Quitter le mode interface.
1.  Quitter le mode configuration.
1.  Terminer la session SSH (Secure Shell).


## Désactivation

Dans le cas d'une désactivation, on utilisera simplement les commandes suivantes :

```cisco
cisco-sg250-10p# config
cisco-sg250-10p(config)# no logging console
cisco-sg250-10p(config)# int gi 2
cisco-sg250-10p(config-if)# power inline never
cisco-sg250-10p(config-if)# exit
cisco-sg250-10p(config)# exit
cisco-sg250-10p# exit
```

1.  Accéder au mode configuration.
1.  Désactiver l'écho de logging.
1.  Sélectionner l'interface appropriée.
1.  Désactiver le mode Power over Ethernet (PoE).
1.  Quitter le mode interface.
1.  Quitter le mode configuration.
1.  Terminer la session SSH (Secure Shell).

{{< notice note >}}
Dans le cas d'une caméra sur PoE et active par intermittence, il peut être utile de fixer l'adresse IP afin d'éviter qu'elle ne soit utilisée par un autre matériel. Vous pouvez configurer une réservation DHCP dans votre routeur en associant l'adresse MAC de la caméra à une adresse IP spécifique.
{{< /notice >}}

## Conclusion

J'espère que cet article vous a permis de comprendre comment gérer tout équipement PoE déployé sur votre routeur Cisco. Cela peut être utile si l'équipement n'a pas besoin d'être activé en permanence, comme c'est le cas pour une caméra de vidéosurveillance. Cette méthode vous permet non seulement d'économiser de l'énergie, mais aussi d'améliorer la sécurité en désactivant les périphériques lorsqu'ils ne sont pas nécessaires.

### URL

* [Cisco sg250 PoE](https://www.cisco.com/c/dam/en/us/products/collateral/switches/250-series-smart-switches/datasheet-c78-737061-french.pdf)
* [Documentation Cisco sur la configuration PoE](https://www.cisco.com/c/en/us/td/docs/switches/lan/csbms/350x/admin_guide/b_350x_admin_guide/b_350x_admin_guide_chapter_01101.html)
