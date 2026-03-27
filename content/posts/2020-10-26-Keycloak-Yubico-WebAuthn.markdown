---
layout: post
css: blog
title:  "Keycloak, les clefs Yubico et le standard Webauthn"
date:   2020-10-26 15:00:00
tags: ["fr" ,"Keycloak", "Yubico" ,"2fa", "webauthn"]
categories: ["blog"]
##url: /blog/2020/10/26/Keycloak-Yubico-WebAuthn.html
---

Depuis quelque temps j'interviens chez mes clients afin de mener des études d'architecture autour de Keycloak/RHSSO. Comme son nom l'indique, il s'agit d'une solution de [SSO](https://en.wikipedia.org/wiki/Single_sign-on) c'est à dire d'un système unique d'authentification et d'authorisation. Le projet Keycloak a débuté en 2014 et est donc relativement mature, la communauté autour de ce projet est très importante et continue de croître, ce qui en fait une solution fiable et pérenne pour la gestion des identités.

Il y a quelques temps déjà, j'ai acheté et configuré des clefs Yubico afin de faire du [2FA](https://en.wikipedia.org/wiki/Multi-factor_authentication) avec mes principaux comptes en ligne. Les principaux acteurs du web (Google, Facebook, AWS, etc...) proposent ce type d'authentification qui apporte une sécurité supplémentaire des comptes en ligne. Cette méthode d'authentification à deux facteurs est devenue essentielle dans un contexte où les attaques par hameçonnage et le vol d'identifiants sont de plus en plus sophistiqués.

Keycloak depuis fin 2019 dispose d'une intégration du standard Webauthn du W3C. Nous allons voir comment faire cette configuration dans le produit et comment elle peut renforcer significativement la sécurité de vos applications.

> Intégration/Configuration d'une authentification Webauthn avec Keycloak

## Le standard WebAuthn

Le standard WebAuthn est une généralisation d'un autre standard le FIDO. Ces deux standards ont pour but de proposer une authentification forte des utilisateurs lors de leurs connexions en ligne. Il existe déjà des systèmes de double authentification via SMS par exemple, mais il est possible, avec un peu de moyen, de hacker/casser soit techniquement soit socialement ce type d'authentification. Les attaques par interception de SMS ou par ingénierie sociale sont malheureusement devenues courantes, rendant ces méthodes moins fiables qu'auparavant.

Auparavant le standard FIDO était très axé sur des clefs matérielles via USB beaucoup plus difficile à casser (par clonage par ex) et une API dans le browser, WebAuthn supporte quant à lui d'autre type de device comme les montres connectées, les téléphones portables et d'autres types de protocole comme le BLE et/ou le NFC. WebAuthn apporte aussi au browser une API standard en Javascript qui est maintenant supportée dans la plupart des navigateurs (Chrome, Firefox, Edge, Safari, etc...), ce qui facilite grandement son adoption par les développeurs. 

Lorsque d'un utilisateur se connecte à son compte en ligne le service via le browser demande à l'utilisateur d'insérer sa clef (ici : Yubikey) dans son ordinateur (utiliser sa clef NFC si il s'agit d'un téléphone ou d'une tablette). Le browser dialogue donc avec le système d'authentification afin de vérifier un challenge de sécurité, le tout est renvoyé au service pour vérification finale avant l'accès au dit service. L'avantage est que l'on peut utiliser la même clef d'un service en ligne à l'autre, car le standard défini que le challenge doit être fait par nom de domaine. Cette approche basée sur les domaines garantit qu'une clé compromise sur un site ne compromet pas les autres sites utilisant la même clé physique.

Un des avantages de ce standard est son faible coût de déploiement à la fois pour l'utilisateur final que pour le service en ligne, grâce à la standardisation il existe un certain nombre d'acteurs et de fournisseur de solution WebAuthn compatible. Une clef Yubico est aux alentours d'une cinquantaine d'euros piece, donc pour un Architecte IT comme moi cela est très raisonnable. Le service en ligne peut facilement intégrer cette fonctionnalité dans le processus d'authentification de ses utilisateurs, comme nous allons le voir dans le chapitre suivant. De plus, le coût d'implémentation est largement compensé par la réduction des risques de compromission de comptes et des coûts associés aux incidents de sécurité.

## Installation de Keycloak

L'installation de Keycloak est tout aussi simple que l'installation d'un serveur Wildfly/JBoss EAP, il suffit simplement [télécharger le zip serveur](https://www.keycloak.org/downloads) puis de le dézipper dans le répertoire de son choix. Cette simplicité d'installation permet de rapidement mettre en place un environnement de test ou de développement.

### Utilisateur root
Ajouter l'utilisateur root pour la gestion des Realm (Royaume) dans Keycloak via la commande suivante : 

```bash
$> bin/add-user-keycloak.sh
```

En production, on passera par un Realm (Royaume) n'utilisant pas le système de fichier de stockage des utilisateurs/mots de passe mais plutôt un annuaire LDAP disponible dans la plupart des systèmes d'information. Cette approche permet une meilleure intégration avec l'infrastructure existante et facilite la gestion centralisée des identités.

### Démarrer Keycloak/RHSSO
Le démarrage de Keycloak se fait comme un Wildfly/JBoss EAP via la commande `standalone.sh`.

```bash
$> bin/standalone.sh -b 0.0.0.0
```

Il est bien sûr possible d'utiliser toute les fonctionnalités de Wildlfy/JBoss EAP en terme d'administration centralisée avec le mode domain, le clustering des sessions HTTP via la solution Infinispan intégrée ou bien le mod_cluster/Apache qui facilite le cycle de vie et l'administration des clusters Apache/JBoss. Ces fonctionnalités avancées sont particulièrement utiles dans un environnement de production à haute disponibilité.

## Configuration du Realm, Client et Flow

Configurer maintenant le Realm qui va contenir l'ensemble des utilisateurs et des clients (applications). Un Realm dans Keycloak est un espace isolé qui contient ses propres utilisateurs, rôles, groupes et applications.

![Configuration Realm](/img/2020-10-26-keycloak-webauthn/keycloak-configure-realm.png)

Pour la demo, nous utilisons une application cliente de type Javascript donc n'oubliez pas de configurer en mode `public` l'option `Access Type`. Cette configuration est nécessaire pour les applications frontend qui s'exécutent entièrement dans le navigateur du client.

![Configuration Client](/img/2020-10-26-keycloak-webauthn/keycloak-configure-client.png)

Dans Browser Flow il suffit de rajouter le `WebAuthn Authenticator` executor dans le flow normal. Les flows d'authentification dans Keycloak permettent de définir des séquences personnalisées d'étapes d'authentification.

![Configuration Flow](/img/2020-10-26-keycloak-webauthn/keycloak-configure-flow.png)

Dans la configuration du WebAuthn, n'oubliez pas de configurer le `Relying Party Entity Name`. Ce paramètre est crucial car il identifie votre application auprès du navigateur et des dispositifs d'authentification.

![Configuration 2fa](/img/2020-10-26-keycloak-webauthn/keycloak-configure-2fa.png)

## Enregistrement d'un utilisateur

Passons maintenant à l'enregistrement d'un utilisateur. Cette étape est nécessaire pour associer une clé physique à un compte utilisateur spécifique.

![Register User](/img/2020-10-26-keycloak-webauthn/keycloak-register-user.png)

Le browser demande ensuite l'enregistrement de la clef pour l'authentification future (cf la dialogue box avec l'empreinte digitale). Cette étape est cruciale car elle établit l'association entre l'identité numérique de l'utilisateur et sa clé physique.

![Register Key](/img/2020-10-26-keycloak-webauthn/keycloak-register-key.png)

Il suffit d'insérer sa clef Yubico FIDO2 compatible WebAuthn. La clé génère alors une paire de clés cryptographiques unique pour ce site.

![Yubico Key](/img/2020-10-26-keycloak-webauthn/yubico-fido2-key.jpg)

Ensuite il est possible de configurer un label pour ce processus d'authentification `WebAuthn Yubico Blue`. Ce label est particulièrement utile si l'utilisateur possède plusieurs dispositifs d'authentification.

![Register Key Label](/img/2020-10-26-keycloak-webauthn/keycloak-register-key-label.png)

## Authentification de l'utilisateur

L'authentification de l'utilisateur est maintenant possible. Le processus commence par la saisie classique du nom d'utilisateur et du mot de passe.

![Authn User](/img/2020-10-26-keycloak-webauthn/keycloak-authn-login.png)

Dans ce cas le browser demande cette fois une authentification via la clef Yubico (cf la dialogue box avec l'empreinte digitale). Cette seconde étape d'authentification garantit que même si les identifiants sont compromis, l'accès reste sécurisé.

![Authn User Key](/img/2020-10-26-keycloak-webauthn/keycloak-authn-key-prompt.png)

Dans le cas où l'utilisateur s'est trompé de clef ou bien a oublié sa clef, voici le message d'erreur. Keycloak propose généralement des mécanismes de récupération alternatifs configurables par l'administrateur.

![Authn User Key Failed](/img/2020-10-26-keycloak-webauthn/keycloak-authn-key-failed.png)

Mais dans le cas où tout ce passe bien l'utilisateur sera correctement authentifié et redirigé vers l'application cliente. Le processus complet garantit une authentification forte tout en restant relativement simple pour l'utilisateur final.

![User Authentification Ok](/img/2020-10-26-keycloak-webauthn/keycloak-authn-success.png)

## Information utilisateur

Si l'on retourne sur la console d'administration web des utilisateurs dans Keycloak/RHSSO, on peut vérifier que l'enregistrement de la clef Yubico a bien été fait. L'enregistrement contient notamment la clef publique de la clef Yubico. Cette clé publique est utilisée pour vérifier les signatures générées par la clé privée stockée de manière sécurisée dans le dispositif physique.

![User Detail](/img/2020-10-26-keycloak-webauthn/keycloak-user-detail.png)

## Conclusion

Nous avons vu que la configuration et authentification via le standard WebAuthn est relativement simple avec Keycloak. Alors n'hésitez pas à améliorer l'expérience de vos utilisateurs ainsi que la sécurité de leur compte en activant très simplement cette option dans Keycloak/RHSSO. 

L'adoption de WebAuthn représente une avancée significative dans la sécurisation des accès en ligne. Non seulement elle réduit considérablement les risques d'attaques par hameçonnage et de vol d'identifiants, mais elle offre également une expérience utilisateur plus fluide que d'autres méthodes d'authentification à deux facteurs. La facilité d'intégration avec Keycloak en fait une solution accessible même pour les équipes disposant de ressources limitées.

### NB

Les fichiers de configuration seront disponibles bientôt dans un repo github. Ces exemples pourront vous servir de base pour implémenter votre propre solution d'authentification WebAuthn avec Keycloak.
