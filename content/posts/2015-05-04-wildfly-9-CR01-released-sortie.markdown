---
layout: post
css: blog
title:  "Sortie de wildfly 9.0 CR-01"
date:   2015-05-04 13:58:00
categories: ["blog"]
tags: ["fr", "wildfly"]
#url: /blog/2015/05/04/wildfly-9-CR01-released-sortie.html
---

La release candidate 01 de Wildfly 9.0.0 est sortie ce samedi. Elle est disponible en [téléchargement ici](http://wildfly.org/downloads/). Cette version corrige un certain nombre de bugs et apporte de nouvelles fonctionnalités que nous allons vous présenter rapidement ici. Cette version représente une étape importante avant la sortie finale et intègre des améliorations significatives en termes de performances et de stabilité. Je posterai plus tard des exemples complets pour illustrer ces nouvelles fonctionnalités.

### Java EE7

Wildfly 9 intègre les deux profils Web et Full du standard Java EE7. Cette implémentation complète permet aux développeurs de bénéficier de toutes les fonctionnalités de la spécification, notamment les dernières versions de JSF, JPA, JAX-RS et les autres technologies du standard.

### Le support de HTTP/2 & SPDY

Le standard HTTP/2 est maintenant [officiel depuis Février](https://lists.w3.org/Archives/Public/ietf-http-wg/2015JanMar/0478.html). Wildfly 9 inclut le support de ce protocole, mais nécessite une [procédure spéciale](http://undertow.io/blog/2015/03/26/HTTP2-In-Wildfly.html) pour l'activation. HTTP/2 offre des améliorations significatives en termes de performances par rapport à HTTP/1.1, notamment grâce au multiplexage des requêtes et à la compression des en-têtes.

{{< notice info >}}
Je l'ai testé sans problème avec Firefox 37.0.2 et Java 8u40, je ferai un post détaillé sur ce sujet dès que possible.
{{< /notice >}}

### Load balancer Wildfly en remplacement d'Apache

Anciennement, le load balancing des Wildfly ou JBoss était effectué le plus souvent via un Apache en frontal des instances. La configuration du load balancing se fait désormais directement via le serveur HTTP Undertow. Cette approche simplifie l'architecture globale et réduit la complexité de la configuration tout en améliorant les performances.

### Arrêt en douceur de Wildfly

Il est maintenant possible de refuser nativement les nouvelles sessions utilisateur lorsqu'une instance s'arrête. Cela permet de ne plus interrompre les traitements des utilisateurs déjà connectés et d'assurer une transition fluide lors des mises à jour ou des redémarrages planifiés. Cette fonctionnalité est particulièrement utile dans les environnements de production à haute disponibilité.

### Mise à jour de Framework

* Intégration de JBoss WS 5 basé sur CXF 3, apportant des améliorations de performances et de nouvelles fonctionnalités pour les services web
* Remplacement de JacORB par OpenJDK Orb pour l'implémentation du protocole IIOP, offrant une meilleure compatibilité et stabilité
* Montée de version vers IronJacamar 1.2.4.Final pour l'implémentation de JCA, avec des corrections de bugs et des optimisations

### Correction de bug

* [86 bugs corrigés depuis la version 9.0 Beta 2](https://issues.jboss.org/secure/ReleaseNote.jspa?projectId=12313721&version=12325387), améliorant considérablement la stabilité et la fiabilité du serveur

### Démarrage

Le démarrage se fait comme les versions précédentes. Voici un exemple de log de démarrage :

```bash
[mbp:~/Application/wildfly/wildfly-9.0.0.CR1]$> bin/standalone.sh
=========================================================================

  JBoss Bootstrap Environment

  JBOSS_HOME: /Users/gautric/Application/wildfly/wildfly-9.0.0.CR1

  JAVA: java

  JAVA_OPTS:  -server -XX:+UseCompressedOops  -server -XX:+UseCompressedOops -Xms64m -Xmx512m -XX:MaxPermSize=256m -Djava.net.preferIPv4Stack=true -Djboss.modules.system.pkgs=org.jboss.byteman -Djava.awt.headless=true

=========================================================================

Java HotSpot(TM) 64-Bit Server VM warning: ignoring option MaxPermSize=256m; support was removed in 8.0
13:31:40,503 INFO  [org.jboss.modules] (main) JBoss Modules version 1.4.3.Final
13:31:40,837 INFO  [org.jboss.msc] (main) JBoss MSC version 1.2.4.Final
13:31:40,941 INFO  [org.jboss.as] (MSC service thread 1-6) WFLYSRV0049: WildFly Full 9.0.0.CR1 (WildFly Core 1.0.0.CR1) starting
13:31:42,450 INFO  [org.jboss.as.controller.management-deprecated] (ServerService Thread Pool -- 11) WFLYCTL0028: Attribute enabled is deprecated, and it might be removed in future version!
13:31:42,479 INFO  [org.jboss.as.server] (Controller Boot Thread) WFLYSRV0039: Creating http management service using socket-binding (management-http)
13:31:42,515 INFO  [org.xnio] (MSC service thread 1-4) XNIO version 3.3.1.Final
13:31:42,534 INFO  [org.xnio.nio] (MSC service thread 1-4) XNIO NIO Implementation Version 3.3.1.Final
13:31:42,612 INFO  [org.wildfly.extension.io] (ServerService Thread Pool -- 37) WFLYIO001: Worker 'default' has auto-configured to 8 core threads with 64 task threads based on your 4 available processors
13:31:42,613 INFO  [org.jboss.as.clustering.infinispan] (ServerService Thread Pool -- 38) WFLYCLINF0001: Activating Infinispan subsystem.
13:31:42,629 INFO  [org.jboss.as.jsf] (ServerService Thread Pool -- 44) WFLYJSF0007: Activated the following JSF Implementations: [main]
13:31:42,632 INFO  [org.jboss.as.connector.subsystems.datasources] (ServerService Thread Pool -- 33) WFLYJCA0004: Deploying JDBC-compliant driver class org.h2.Driver (version 1.3)
13:31:42,679 INFO  [org.jboss.as.connector] (MSC service thread 1-6) WFLYJCA0009: Starting JCA Subsystem (IronJacamar 1.2.4.Final)
13:31:42,680 INFO  [org.jboss.as.connector.deployers.jdbc] (MSC service thread 1-3) WFLYJCA0018: Started Driver service with driver-name = h2
13:31:42,723 INFO  [org.jboss.as.naming] (ServerService Thread Pool -- 46) WFLYNAM0001: Activating Naming Subsystem
13:31:42,736 INFO  [org.jboss.as.security] (ServerService Thread Pool -- 53) WFLYSEC0002: Activating Security Subsystem
13:31:42,739 WARN  [org.jboss.as.txn] (ServerService Thread Pool -- 54) WFLYTX0013: Node identifier property is set to the default value. Please make sure it is unique.
13:31:42,742 INFO  [org.jboss.remoting] (MSC service thread 1-8) JBoss Remoting version 4.0.9.Final
13:31:42,743 INFO  [org.jboss.as.security] (MSC service thread 1-3) WFLYSEC0001: Current PicketBox version=4.9.0.Beta2
13:31:42,756 INFO  [org.jboss.as.webservices] (ServerService Thread Pool -- 56) WFLYWS0002: Activating WebServices Extension
13:31:42,768 INFO  [org.wildfly.extension.undertow] (MSC service thread 1-7) WFLYUT0003: Undertow 1.2.4.Final starting
13:31:42,769 INFO  [org.wildfly.extension.undertow] (ServerService Thread Pool -- 55) WFLYUT0003: Undertow 1.2.4.Final starting
13:31:42,790 INFO  [org.jboss.as.naming] (MSC service thread 1-5) WFLYNAM0003: Starting Naming Service
13:31:42,791 INFO  [org.jboss.as.mail.extension] (MSC service thread 1-2) WFLYMAIL0001: Bound mail session [java:jboss/mail/Default]
13:31:42,996 INFO  [org.wildfly.extension.undertow] (ServerService Thread Pool -- 55) WFLYUT0014: Creating file handler for path /Users/gautric/Application/wildfly/wildfly-9.0.0.CR1/welcome-content
13:31:43,010 INFO  [org.wildfly.extension.undertow] (MSC service thread 1-7) WFLYUT0012: Started server default-server.
13:31:43,041 INFO  [org.wildfly.extension.undertow] (MSC service thread 1-8) WFLYUT0018: Host default-host starting
13:31:43,158 INFO  [org.wildfly.extension.undertow] (MSC service thread 1-7) WFLYUT0006: Undertow HTTP listener default listening on /127.0.0.1:8080
13:31:43,290 INFO  [org.jboss.as.connector.subsystems.datasources] (MSC service thread 1-8) WFLYJCA0001: Bound data source [java:jboss/datasources/ExampleDS]
13:31:43,396 INFO  [org.jboss.as.server.deployment.scanner] (MSC service thread 1-4) WFLYDS0013: Started FileSystemDeploymentService for directory /Users/gautric/Application/wildfly/wildfly-9.0.0.CR1/standalone/deployments
13:31:43,609 INFO  [org.jboss.ws.common.management] (MSC service thread 1-3) JBWS022052: Starting JBoss Web Services - Stack CXF Server 5.0.0.Final
13:31:43,779 INFO  [org.jboss.as] (Controller Boot Thread) WFLYSRV0060: Http management interface listening on http://127.0.0.1:9990/management
13:31:43,786 INFO  [org.jboss.as] (Controller Boot Thread) WFLYSRV0051: Admin console listening on http://127.0.0.1:9990
13:31:43,787 INFO  [org.jboss.as] (Controller Boot Thread) WFLYSRV0025: WildFly Full 9.0.0.CR1 (WildFly Core 1.0.0.CR1) started in 3772ms - Started 202 of 379 services (210 services are lazy, passive or on-demand)
```

### Liens complémentaires

* [L'annonce en anglais](https://developer.jboss.org/wiki/WildFly900CR1ReleaseNotes) dont est issu ce post
* [L'annonce](http://blog.arungupta.me/wildfly-9-cr1-http2-intelligent-load-balancing-graceful-shutdown-offline-cli/?utm_source=feedburner&utm_medium=feed&utm_campaign=Feed%3A+MilesToGo+%28Miles+to+go+2.0%29) de mon collègue Arun Gupta avec des détails supplémentaires
