---
layout: post
css: blog
title:  "Lancement de JBoss EAP 7"
date:   2016-06-27 14:00:00
categories: ["blog"]
tags: ["en", "JBoss", "redhat", "EAP7"]
#url: /blog/2016/06/27/Lancement-JBoss-EAP-7.html
---

Cela fait exactement 5 ans que je travaille pour [Red Hat](https://www.redhat.com) et pour mon cadeau d'anniversaire [Red Hat](https://www.redhat.com) vient de sortir sa nouvelle version de son serveur d'application phare à savoir [JBoss EAP 7](https://en.wikipedia.org/wiki/JBoss_Enterprise_Application_Platform).

Cette nouvelle version de JBoss EAP 7 présente certaines évolutions intéressantes par rapport à la version 6, tout en gardant la philosophie et l'architecture générale du serveur d'application. Les améliorations apportées visent principalement à moderniser la plateforme, améliorer ses performances et faciliter son utilisation dans des environnements cloud et conteneurisés.

Nous allons voir dans ce post les principaux éléments qui me semblent les plus intéressants à retenir de cette nouvelle version.

## Java EE7

* JBoss EAP 7 implémente les standards Java EE 7
  * Batch 1.0
    * Pour la création et le management des services de batch en Java
    * Permet l'automatisation des traitements par lots avec reprise sur erreur
  * WebSocket 1.1
    * Pour la création d'applications en mode push
    * Facilite le développement d'applications web temps réel avec communication bidirectionnelle
  * JMS 2.0
    * Évolution du standard de JMS avec une API simplifiée
    * Réduction significative du code nécessaire pour les opérations courantes
  * JAX-WS 2.2
    * Pour le développement des Webservices basés sur SOAP
    * Support amélioré des standards WS-*
  * JAX-RS 2.0
    * Pour le développement des services REST
    * Introduction du client API et des filtres intercepteurs
  * CDI 1.2
    * Injection de dépendance via Weld
    * Amélioration du support des événements et des conversations
  * JSF 2.2
    * Pour les applications de type IHM / Web

## Compatibilité et Interopérabilité

* Les clients EJB, JMS et WS seront compatibles entre toutes les versions mineures de JBoss EAP 7.
  * Cela va faciliter les migrations progressives entre les versions mineures de JBoss EAP 7.
  * Les applications clientes n'auront pas besoin d'être recompilées lors des mises à jour du serveur.
* JBoss EAP 7 a la possibilité de manager des instances JBoss EAP 6 et toutes les versions JBoss EAP 7.
  * Cela va aussi permettre la montée de version de la 6 vers la 7 pour les clients utilisant le mode domaine.
  * Cette fonctionnalité est particulièrement utile dans les environnements hétérogènes pendant les phases de migration.
* Outil de migration de la configuration EAP 6 vers EAP 7
  * Il est possible d'utiliser une configuration EAP 6 pour effectuer la migration de celle-ci vers une version EAP 7
  * L'outil analyse et adapte automatiquement les configurations pour assurer la compatibilité

## Management

* L'IHM de la console d'administration a été revue, simplifiée et unifiée.
  * La web console est plus claire et moins confuse.
  * L'expérience utilisateur a été améliorée avec une navigation plus intuitive.
* Les fichiers de logs sont disponibles sous la forme d'une ressource.
  * Il n'est pas nécessaire de se connecter via SSH pour récupérer les fichiers de logs
  * Cette approche facilite la centralisation et l'analyse des logs dans des environnements distribués.
* Le mode offline autorise la modification du serveur via la CLI sans ouvrir de port TCP
  * Cette option sécurise et facilite la configuration interne des instances JBoss.
  * Particulièrement utile dans les environnements où la sécurité réseau est critique.

## Moteur HTTP

* Remplacement de [JBoss Web](http://jbossweb.jboss.org/) (moteur tomcat) par [Undertow](http://undertow.io/)
  * Undertow utilise nativement les bibliothèques NIO
  * Les performances sont significativement améliorées, notamment pour les connexions concurrentes
* Support des handlers bloquants ou non bloquants, des servlets synchrones et asynchrones et websocket ([JSR 356](https://jcp.org/en/jsr/detail?id=356))
  * Cette flexibilité permet d'optimiser le traitement selon le type de requête
* Configuration d'Undertow comme loadbalancer pour des instances en back office
  * Undertow permet dans ce cas de supprimer le traditionnel serveur Apache en frontal
  * Réduction de la complexité de l'architecture et des coûts de maintenance

## Broker JMS

* JBoss EAP 7 intègre maintenant [ActiveMQ/Artemis](https://activemq.apache.org/artemis/)
  * Il s'agit d'une donation d'[HornetQ](http://hornetq.jboss.org/) à la communauté [Apache ActiveMQ](http://hornetq.blogspot.fr/2015/06/hornetq-apache-donation-and-apache.html)
  * Artemis combine les meilleures fonctionnalités d'HornetQ et d'ActiveMQ pour offrir un broker de messages haute performance

## Java 8

* La version JBoss EAP 7 nécessite une machine virtuelle Java 8 à minima
  * Support de OpenJDK (RHEL / Linux), Oracle JDK (Windows), IBM JDK (AIX) et HP JDK (HP-UX)
  * Cette exigence permet d'exploiter les améliorations de performance et les nouvelles fonctionnalités de Java 8

## Server Suspend Mode/Graceful Shutdown

* JBoss EAP 7 permet maintenant de gérer correctement l'arrêt du serveur.
  * Le système dans ce mode refuse les nouvelles sessions (HTTP) mais laisse les anciennes toujours actives.
  * Cela va donc faciliter la montée de version des applications et/ou du serveur sans arrêt complet des services (rolling upgrade).
  * Cette fonctionnalité est essentielle pour garantir la haute disponibilité des applications critiques.

## Réduction des ports

* Le serveur JBoss EAP 7 n'expose maintenant que 2 ports seulement
  * Un port de Management et un port Applicatif
  * Cette simplification réduit la surface d'attaque et facilite la configuration des pare-feu
* Il utilise le mécanisme d'[upgrade du protocole HTTP](https://en.wikipedia.org/wiki/HTTP/1.1_Upgrade_header)
  * Cette approche permet de multiplexer différents protocoles sur un même port
* Cela est relativement utile dans un monde conteneurisé (Docker / Openshift)
  * La réduction du nombre de ports simplifie considérablement le déploiement dans des environnements cloud

## Tech preview

* Support du protocole HTTP/2
  * Évolution du standard HTTP 1.1 vers HTTP 2 ([voir mes posts modulo quelques modifications 1](/blog/2015/07/03/wildfly-offline-cli-http-2.html) ou [2](/blog/2015/07/09/wildfly-docker-offline-cli-http-2.html))
  * HTTP/2 offre des améliorations significatives en termes de performance et d'efficacité
* Singleton MDB en mode cluster
  * Possibilité d'avoir un Message Driven Bean unique sur cluster
  * Cette fonctionnalité est particulièrement utile pour les traitements qui ne doivent être exécutés qu'une seule fois
* PowerShell Scripts
  * Possibilité de scripter avec le shell de Windows
  * Améliore l'intégration dans les environnements Windows et facilite l'automatisation

## Conclusion

Cette nouvelle version EAP 7 est, c'est vrai, plus une grosse évolution du produit qu'une révolution de paradigme. Cela va faciliter la migration des différents utilisateurs de leur parc de JBoss EAP 6 vers cette nouvelle version. Les améliorations de performance, la réduction de la complexité et la meilleure intégration avec les environnements cloud et conteneurisés font de JBoss EAP 7 une plateforme solide pour les applications d'entreprise modernes.

Les [nombreux quickstarts](https://github.com/jboss-developer/jboss-eap-quickstarts) disponibles permettent aux développeurs la prise en main rapide des différentes fonctionnalités de JBoss EAP 7.

### Liens Utiles

* [Announcing JBoss EAP 7 (en)](http://middlewareblog.redhat.com/2016/06/27/announcing-jboss-eap-7/#more-432)
* [Support configuration](https://access.redhat.com/articles/2026253)
* [Liste des frameworks](https://access.redhat.com/articles/112673#EAP_7)
