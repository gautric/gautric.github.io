---
layout: post
css: blog
title:  "Best Practices Websphere MQ/JBoss EAP 6"
date:   2015-03-25 13:58:00
categories: ["blog"]
tags: ["fr", "jboss", "eap", "wildfly", "websphereMQ", "JCA"]
#url: /blog/2015/03/25/websphere-mq-jboss-eap-integration.html
---

# Intégration de WebSphere MQ avec JBoss EAP 6 : Bonnes pratiques

L'intégration entre différents systèmes d'entreprise est un défi courant dans les architectures informatiques modernes. Dans cet article, nous allons explorer comment connecter efficacement le serveur d'application JBoss EAP 6 avec le système de messagerie IBM WebSphere MQ, en utilisant les standards Java EE et en suivant les meilleures pratiques d'intégration.

## Introduction au standard JCA et à l'intégration JMS

Le serveur d'application [JBoss EAP](http://www.jboss.org/products/eap/overview/) est [certifié JAVA EE 6](http://www.oracle.com/technetwork/java/javaee/overview/compatibility-jsp-136984.html), ce qui signifie qu'il implémente l'ensemble des spécifications de cette version de la plateforme Java Enterprise Edition. Parmi ces spécifications, le standard Java EE Connector Architecture (JCA) est implémenté via le framework [IronJacamar](http://www.ironjacamar.org/).

Le standard JCA permet de connecter les applications Java EE à des ressources externes comme :
- Des brokers de messagerie (JMS)
- Des systèmes de fichiers
- Des mainframes
- D'autres systèmes d'information d'entreprise (EIS)

On peut faire l'analogie entre JCA et JDBC : alors que JDBC se limite aux bases de données relationnelles, JCA a une portée beaucoup plus large et permet d'intégrer pratiquement n'importe quel système d'information d'entreprise.

### Fonctionnalités prises en charge par JCA

Le standard JCA prend en charge un ensemble complet de fonctionnalités essentielles pour l'intégration d'applications :

* **Connectivité** : Établissement et gestion des connexions aux systèmes externes (sockets, IPC, etc.)
* **Transactions** : Support des transactions locales et distribuées (XA)
* **Sécurité** : Authentification et autorisation pour l'accès aux ressources distantes
* **Gestion des ressources** : Management du cycle de vie des connexions et du threading
* **Contrats de service** : Interfaces standardisées entre le serveur d'application et les systèmes externes

Pour utiliser JCA, le fournisseur du système externe (dans notre cas, IBM pour WebSphere MQ) fournit un composant appelé **Resource Adapter** (adaptateur de ressources), qui joue le rôle de driver entre le serveur d'application et le système externe.

> **Objectif de cet article** : Présenter les meilleures pratiques d'intégration JMS entre WebSphere MQ (WMQ) et JBoss EAP 6, en utilisant le standard JCA pour une solution robuste et maintenable.

## Prérequis et environnement technique

Pour mettre en place cette intégration, vous aurez besoin des composants suivants :

* **Un serveur JBoss EAP** : Téléchargeable sur [http://www.jboss.org/products/eap/download/](http://www.jboss.org/products/eap/download/)
* **Un serveur WebSphere MQ** : Disponible sur [http://www.ibm.com/developerworks/downloads/ws/wmq/](http://www.ibm.com/developerworks/downloads/ws/wmq/)
* **Le Resource Adapter WebSphere MQ** : Généralement disponible dans le répertoire **/opt/mqm/java/lib/jca** après l'installation de WebSphere MQ

{{< notice warning >}}
Attention, il s'agit de versions d'essai ou d'évaluation uniquement. Le déploiement en production nécessite l'achat d'une souscription pour JBoss EAP et d'une licence pour IBM WebSphere MQ.
{{< /notice >}}

## Développement des composants d'intégration

Pour tester notre intégration, nous allons développer deux composants essentiels :
1. Un client pour l'envoi de messages JMS
2. Un Message-Driven Bean (MDB) pour la réception des messages

### Composant d'envoi de messages

Pour l'envoi de messages, nous allons créer un EJB Stateless. Cette approche est recommandée dans un environnement Java EE, mais d'autres mécanismes comme une servlet pourraient également être utilisés.

```java
// ..OMIT .. //

@Stateless
public class MoMSenderBean {

  // ..OMIT .. //

  @Resource(name = "jms/connectionFactory")
  ConnectionFactory factory;

  @Resource(name = "jms/queue/Queue")
  Queue queue;

  public void sendMessage(String message) throws JMSException {

            Connection connection = factory.createConnection();
            LOGGER.trace("Recuperation d'une connexion {}", connection);

            Session session = connection.createSession(false, AUTO_ACKNOWLEDGE);
            MessageProducer producer = session.createProducer(queue);
            LOGGER.trace("Creation du sender {} sur la queue {}", producer, queue);

            TextMessage textMessage = session.createTextMessage(message);
            textMessage.setJMSCorrelationID(UUID.randomUUID().toString());
            producer.send(textMessage);
            producer.close();
            session.close();
            connection.close();
  }
}
```

{{< notice notice >}}
Points importants à noter dans ce code :
1. Les ressources JMS (ConnectionFactory et Queue) sont injectées via l'annotation @Resource
2. Ces ressources sont récupérées du scope courant du module
3. Un identifiant de corrélation unique (UUID) est généré pour chaque message
4. Les ressources sont correctement fermées après utilisation
{{< /notice >}}

Pour plus d'informations sur la configuration JNDI avec JBoss, consultez la [documentation officielle](https://docs.jboss.org/author/display/AS72/JNDI+Reference).

### Composant de réception de messages

Dans l'architecture Java EE, la réception de messages JMS se fait généralement via un Message-Driven Bean (MDB). Ce type de bean est spécifiquement conçu pour être activé par l'arrivée d'un message dans une file d'attente ou un topic.

Pour créer un MDB, la classe doit implémenter l'interface **javax.jms.MessageListener** :

```java
// ..OMIT .. //

public class MoMMDB implements MessageListener {

  // ..OMIT .. //

  public void onMessage(Message message) {
    LOGGER.info("Received Message from queue: {}" + (TextMessage) message);
  }
}
```

{{< notice notice >}}
Bien qu'il soit possible de configurer le MDB directement avec des annotations ActivationSpec, cette approche n'est pas recommandée car elle mélange dans le code des préoccupations techniques liées à l'environnement d'exécution. Nous préférons externaliser cette configuration dans les descripteurs de déploiement, comme nous le verrons plus loin.
{{< /notice >}}

## Configuration de l'application

Maintenant que nous avons développé les composants de base, nous devons configurer l'application pour qu'elle se connecte correctement à WebSphere MQ. Cette configuration se fait principalement à travers deux fichiers descripteurs :

1. **ejb-jar.xml** : Définition standard Java EE des composants
2. **jboss-ejb3.xml** : Configuration spécifique à JBoss pour l'intégration avec WebSphere MQ

### Définition Java EE (ejb-jar.xml)

Le fichier **ejb-jar.xml** définit les composants EJB de notre application selon le standard Java EE :

```xml
<ejb-jar xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://java.sun.com/xml/ns/javaee" xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/ejb-jar_3_0.xsd" version="3.0">
  <description>MoM Application EJB / MDB </description>
  <display-name>MoM Application EJB / MDB</display-name>
  <enterprise-beans>
    <message-driven>
      <description>MoM MDB</description>
      <ejb-name>MessageDrivenBean</ejb-name>
      <ejb-class>net.a.g.jee.mom.mdb.MoMMDB</ejb-class>
      <transaction-type>Container</transaction-type>
      <message-destination-type>javax.jms.Queue</message-destination-type>
    </message-driven>
    <session>
      <ejb-name>MoMSenderBean</ejb-name>
      <ejb-class>net.a.g.jee.mom.ejb.MoMSenderBean</ejb-class>
    </session>
  </enterprise-beans>
</ejb-jar>
```

Ce fichier définit :
- Un Message-Driven Bean nommé "MessageDrivenBean" qui écoute une file d'attente JMS
- Un EJB de session nommé "MoMSenderBean" qui sera utilisé pour envoyer des messages

### Configuration spécifique à JBoss (jboss-ejb3.xml)

Le fichier **jboss-ejb3.xml** contient la configuration spécifique à JBoss pour l'intégration avec WebSphere MQ :

```xml
<jboss:ejb-jar xmlns:jboss="http://www.jboss.com/xml/ns/javaee"
  xmlns="http://java.sun.com/xml/ns/javaee" xmlns:jee="http://java.sun.com/xml/ns/javaee"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:mdb="urn:resource-adapter-binding"
  xsi:schemaLocation="http://www.jboss.com/xml/ns/javaee http://www.jboss.org/j2ee/schema/jboss-ejb3-2_0.xsd http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/ejb-jar_3_1.xsd"
  version="3.1" impl-version="2.0">
  <jee:enterprise-beans>
    <jee:message-driven>
      <jee:ejb-name>MessageDrivenBean</jee:ejb-name>
      <jee:ejb-class>net.a.g.jee.mom.mdb.MoMMDB</jee:ejb-class>
      <jee:transaction-type>Container</jee:transaction-type>
      <jee:message-destination-type>javax.jms.Queue</jee:message-destination-type>
      <jee:activation-config>
        <jee:activation-config-property>
          <jee:activation-config-property-name>channel</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.channel}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>queueManager</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.queueManager}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>transportType</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.transportType}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>hostName</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.hostName}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>port</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.port}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>username</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.username}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>password</jee:activation-config-property-name>
          <jee:activation-config-property-value>${websphere.password}</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>destination</jee:activation-config-property-name>
          <jee:activation-config-property-value>java:/jboss/jms/wmq/queue/Queue</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>useJNDI</jee:activation-config-property-name>
          <jee:activation-config-property-value>true</jee:activation-config-property-value>
        </jee:activation-config-property>
        <jee:activation-config-property>
          <jee:activation-config-property-name>destinationType</jee:activation-config-property-name>
          <jee:activation-config-property-value>javax.jms.Queue</jee:activation-config-property-value>
        </jee:activation-config-property>
      </jee:activation-config>
    </jee:message-driven>
    <jee:session>
      <jee:ejb-name>MoMSenderBean</jee:ejb-name>
      <jee:ejb-class>net.a.g.jee.mom.ejb.MoMSenderBean</jee:ejb-class>
      <jee:resource-ref>
        <jee:res-ref-name>jms/connectionFactory</jee:res-ref-name>
        <jee:res-type>javax.jms.ConnectionFactory</jee:res-type>
        <jee:lookup-name>java:/jboss/jms/wmq/connectionFactory</jee:lookup-name>
      </jee:resource-ref>
      <jee:resource-env-ref>
        <jee:resource-env-ref-name>jms/queue/Queue</jee:resource-env-ref-name>
        <jee:lookup-name>java:/jboss/jms/wmq/queue/Queue</jee:lookup-name>
      </jee:resource-env-ref>
    </jee:session>
  </jee:enterprise-beans>
  <jee:assembly-descriptor>
    <mdb:resource-adapter-binding>
      <jee:ejb-name>MessageDrivenBean</jee:ejb-name>
      <mdb:resource-adapter-name>${websphere.resource.adapter}</mdb:resource-adapter-name>
    </mdb:resource-adapter-binding>
  </jee:assembly-descriptor>
</jboss:ejb-jar>
```

#### Points clés de cette configuration

Cette configuration contient plusieurs éléments importants à comprendre :

1. **Utilisation de placeholders** : Toutes les informations techniques sont externalisées via des placeholders (variables) qui seront remplacés par les valeurs définies dans le fichier standalone.xml :
   - `${websphere.hostName}` : Nom d'hôte du serveur WebSphere MQ
   - `${websphere.port}` : Port d'écoute
   - `${websphere.queueManager}` : Nom du gestionnaire de files d'attente
   - etc.

2. **Activation de l'utilisation JNDI** : La propriété `useJNDI` est définie à `true` pour permettre la récupération de la file d'attente par son nom JNDI.

3. **Mapping des noms JNDI** : Les noms JNDI utilisés dans l'application sont mappés aux noms JNDI configurés dans le serveur JBoss :
   - Nom JNDI dans le serveur : `java:/jboss/jms/wmq/queue/Queue`
   - Nom JNDI utilisé dans l'application : `jms/queue/Queue`

4. **Binding du Resource Adapter** : Le MDB est explicitement lié au Resource Adapter WebSphere MQ via la balise `<mdb:resource-adapter-binding>`.

{{< notice warning >}}
Dans un contexte d'entreprise, il est fortement recommandé d'utiliser des fichiers XML de configuration plutôt que des annotations Java. Cette approche facilite les changements d'environnement (développement, test, production) sans nécessiter de recompilation du code. Le code Java doit rester aussi indépendant que possible de l'environnement d'exécution et des détails d'implémentation des systèmes externes.
{{< /notice >}}

{{< notice info >}}
Si votre application doit se connecter à plusieurs systèmes JMS différents, il est recommandé de créer un fichier jboss-ejb3.xml distinct pour chaque système. Cela permet de maintenir une séparation claire des configurations et facilite la maintenance.
{{< /notice >}}

## Configuration du serveur JBoss EAP

Après avoir configuré l'application, nous devons maintenant configurer le serveur JBoss EAP pour qu'il puisse communiquer avec WebSphere MQ. Cette configuration se fait dans le fichier **standalone.xml** de l'instance JBoss.

### Définition des propriétés système

Commençons par définir les propriétés système qui seront utilisées pour remplacer les placeholders dans notre configuration :

```xml
<system-properties>
  <property name="websphere.hostName"         value="localhost"/>
  <property name="websphere.port"             value="1414"/>
  <property name="websphere.username"         value="mqm"/>
  <property name="websphere.password"         value="mqm"/>
  <property name="websphere.channel"          value="SYSTEM.AUTO.SVRCONN"/>
  <property name="websphere.transportType"    value="CLIENT"/>
  <property name="websphere.queueManager"     value="QUEUE.MANAGER"/>
  <property name="websphere.queueName"        value="Q_QUEUE"/>
  <property name="websphere.resource.adapter" value="wmq.jmsra.rar"/>
</system-properties>
```

Ces propriétés définissent tous les paramètres nécessaires pour se connecter au serveur WebSphere MQ :
- Informations de connexion (hôte, port)
- Identifiants d'authentification (nom d'utilisateur, mot de passe)
- Configuration du canal et du gestionnaire de files d'attente
- Nom du Resource Adapter à utiliser

{{< notice info >}}
WebSphere MQ propose deux modes de transport principaux :
- **CLIENT** : Mode utilisé ici, qui fonctionne via TCP/IP et ne nécessite pas d'installation locale de WebSphere MQ
- **BINDING** : Mode qui offre de meilleures performances mais nécessite l'installation de composants binaires spécifiques au système d'exploitation sur la même machine que JBoss
{{< /notice >}}

### Configuration du mécanisme de remplacement des propriétés

JBoss EAP offre un mécanisme puissant pour remplacer les placeholders par les valeurs des propriétés système dans différents types de fichiers de configuration. Voici comment l'activer :

```xml
<subsystem xmlns="urn:jboss:domain:ee:1.2">
  <spec-descriptor-property-replacement>false</spec-descriptor-property-replacement>
  <jboss-descriptor-property-replacement>true</jboss-descriptor-property-replacement>
  <annotation-property-replacement>false</annotation-property-replacement>
</subsystem>
```

Cette configuration active le remplacement des propriétés uniquement dans les descripteurs spécifiques à JBoss (comme jboss-ejb3.xml), mais pas dans les descripteurs standard Java EE ni dans les annotations.

Les trois options disponibles sont :
- **spec-descriptor-property-replacement** : Pour les fichiers descripteurs standard Java EE (web.xml, ejb-jar.xml, etc.)
- **jboss-descriptor-property-replacement** : Pour les fichiers descripteurs spécifiques à JBoss (jboss-web.xml, jboss-ejb3.xml, etc.)
- **annotation-property-replacement** : Pour les annotations Java

{{< notice note >}}
Il est recommandé d'activer le remplacement uniquement pour les descripteurs JBoss, car cela maintient une séparation claire entre la configuration standard Java EE et la configuration spécifique à l'environnement d'exécution.
{{< /notice >}}

### Configuration du Resource Adapter WebSphere MQ

Enfin, nous devons configurer le Resource Adapter WebSphere MQ dans le serveur JBoss :

```xml
<subsystem xmlns="urn:jboss:domain:resource-adapters:1.1">
  <resource-adapters>
    <resource-adapter id="wmq.jmsra.rar">
      <archive>wmq.jmsra.rar</archive>
      <transaction-support>LocalTransaction</transaction-support>
      <connection-definitions>
        <connection-definition class-name="com.ibm.mq.connector.outbound.ManagedConnectionFactoryImpl" jndi-name="java:/jboss/jms/wmq/connectionFactory" use-java-context="true" pool-name="MQConnectionFactory">
          <config-property name="port">${websphere.port:1414}</config-property>
          <config-property name="hostName">${websphere.hostName:localhost}</config-property>
          <config-property name="username">${websphere.username:mqm}</config-property>
          <config-property name="password">${websphere.password:mqm}</config-property>
          <config-property name="channel">${websphere.channel:SYSTEM.AUTO.SVRCONN}</config-property>
          <config-property name="transportType">${websphere.transportType:CLIENT}</config-property>
          <config-property name="queueManager">${websphere.queueManager:QUEUE.MANAGER}</config-property>
          <security>
            <application/>
          </security>
        </connection-definition>
      </connection-definitions>
      <admin-objects>
        <admin-object class-name="com.ibm.mq.connector.outbound.MQQueueProxy" jndi-name="java:/jboss/jms/wmq/queue/Queue" use-java-context="true" pool-name="QueuePool">
          <config-property name="baseQueueManagerName">${websphere.queueManager:QUEUE.MANAGER}</config-property>
          <config-property name="baseQueueName">${websphere.queueName:Q_QUEUE}</config-property>
        </admin-object>
      </admin-objects>
    </resource-adapter>
  </resource-adapters>
</subsystem>
```

Cette configuration définit :

1. **Le Resource Adapter** : Identifié par "wmq.jmsra.rar", qui est le fichier RAR fourni par IBM
2. **Le support transactionnel** : Ici configuré pour les transactions locales
3. **La ConnectionFactory** : Exposée via JNDI sous le nom "java:/jboss/jms/wmq/connectionFactory"
4. **La file d'attente** : Exposée via JNDI sous le nom "java:/jboss/jms/wmq/queue/Queue"

{{< notice info >}}
Notez l'utilisation des placeholders avec des valeurs par défaut (par exemple `${websphere.port:1414}`). Cette syntaxe permet de spécifier une valeur par défaut qui sera utilisée si la propriété système n'est pas définie.
{{< /notice >}}

## Déploiement et mise en œuvre

Une fois toutes les configurations effectuées, il ne reste plus qu'à déployer les composants nécessaires :

1. Copiez le Resource Adapter WebSphere MQ (**wmq.jmsra.rar**) dans le répertoire de déploiement de JBoss : `${JBOSS_HOME}/standalone/deployments`
2. Déployez votre application (WAR ou EAR) dans le même répertoire

JBoss détectera automatiquement ces nouveaux déploiements et les activera. Votre application sera alors capable de communiquer avec WebSphere MQ.

## Conclusion : Avantages de cette approche d'intégration

L'intégration entre JBoss EAP et WebSphere MQ via le standard JCA présente de nombreux avantages :

1. **Modularité et maintenabilité** : La séparation claire entre le code applicatif et la configuration d'intégration facilite la maintenance et l'évolution du système.

2. **Portabilité entre environnements** : Le déploiement sur différents environnements (développement, test, production) est simplifié, car seules les variables d'environnement dans le fichier standalone.xml doivent être modifiées.

3. **Utilisation des standards** : L'approche basée sur JCA et les standards Java EE garantit une meilleure interopérabilité et pérennité de la solution.

4. **Gestion des ressources optimisée** : JCA fournit des mécanismes avancés pour la gestion des connexions, des transactions et de la sécurité, ce qui améliore les performances et la fiabilité du système.

5. **Flexibilité** : Cette architecture permet de changer facilement de fournisseur JMS si nécessaire, en modifiant uniquement la configuration et non le code applicatif.

En suivant les bonnes pratiques présentées dans cet article, vous pouvez mettre en place une intégration robuste et évolutive entre JBoss EAP et WebSphere MQ, qui répondra aux exigences des applications d'entreprise modernes.

### Ressources utiles pour approfondir

* [Documentation Red Hat sur le déploiement du WebSphere MQ Resource Adapter](https://access.redhat.com/documentation/en-US/JBoss_Enterprise_Application_Platform/6/html/Administration_and_Configuration_Guide/Deploy_the_WebSphere_MQ_Resource_Adapter.html)
* [Discussion sur le forum JBoss Developer](https://developer.jboss.org/message/738670)
* [Wiki sur l'intégration WebSphere MQ](https://developer.jboss.org/wiki/WebsphereMQIntegration)
* [Programme de test de vérification d'installation pour le WebSphere MQ resource adapter](http://www-01.ibm.com/support/knowledgecenter/SSFKSJ_7.5.0/com.ibm.mq.dev.doc/q031760_.htm)
* <img id="en" src="/img/flag-uk.png" width="23" height="23" alt="English version"/> [Version anglaise](/blog/2015/03/26/websphere-mq-jboss-eap-integration-english-version.html)

### Remerciements

* Akram B. A. @RedHat pour certaines ressources de ce post
* Guillaume C. @RedHat pour ses conseils
