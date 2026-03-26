---
layout: post
css: blog
title:  "Best Practices Websphere MQ/JBoss EAP 6"
date:   2015-03-25 13:58:00
categories: ["blog"]
tags: ["fr", "jboss", "eap", "wildfly", "websphereMQ", "JCA"]
#url: /blog/2015/03/25/websphere-mq-jboss-eap-integration.html
---

# Intégration de WebSphere MQ avec JBoss EAP 6 : bonnes pratiques

L'intégration entre systèmes d'entreprise reste un défi récurrent dans les architectures modernes. Cet article détaille comment connecter **JBoss EAP 6** avec **IBM WebSphere MQ** en s'appuyant sur les standards Java EE et les bonnes pratiques d'intégration.

## Introduction au standard JCA et à l'intégration JMS

Le serveur d'application [JBoss EAP](http://www.jboss.org/products/eap/overview/) est [certifié Java EE 6](http://www.oracle.com/technetwork/java/javaee/overview/compatibility-jsp-136984.html). Parmi les spécifications implémentées, le standard **Java EE Connector Architecture** (JCA) repose sur le framework [IronJacamar](http://www.ironjacamar.org/).

JCA permet de connecter les applications Java EE à des ressources externes :
- Brokers de messagerie (JMS)
- Systèmes de fichiers
- Mainframes
- Autres systèmes d'information d'entreprise (EIS)

L'analogie avec JDBC est pertinente : JDBC se limite aux bases de données relationnelles, JCA couvre un périmètre bien plus large.

### Fonctionnalités du standard JCA

* **Connectivité** : établissement et gestion des connexions aux systèmes externes (sockets, IPC, etc.)
* **Transactions** : support des transactions locales et distribuées (XA)
* **Sécurité** : authentification et autorisation pour l'accès aux ressources distantes
* **Gestion des ressources** : cycle de vie des connexions et threading
* **Contrats de service** : interfaces standardisées entre le serveur d'application et les systèmes externes

Le fournisseur du système externe (ici IBM) fournit un **Resource Adapter**, qui joue le rôle de driver entre le serveur d'application et le système cible.

> **Objectif** : Présenter les bonnes pratiques d'intégration JMS entre **WebSphere MQ** et **JBoss EAP 6** via le standard JCA, pour une solution robuste et maintenable.

## Prérequis et environnement technique

Composants nécessaires :

* **JBoss EAP** : [http://www.jboss.org/products/eap/download/](http://www.jboss.org/products/eap/download/)
* **WebSphere MQ** : [http://www.ibm.com/developerworks/downloads/ws/wmq/](http://www.ibm.com/developerworks/downloads/ws/wmq/)
* **Resource Adapter WebSphere MQ** : généralement dans **/opt/mqm/java/lib/jca** après installation

{{< notice warning >}}
Il s'agit de versions d'essai. Le déploiement en production nécessite une souscription JBoss EAP et une licence IBM WebSphere MQ.
{{< /notice >}}

## Développement des composants d'intégration

Deux composants sont nécessaires pour valider l'intégration :
1. Un client pour l'envoi de messages JMS
2. Un **Message-Driven Bean** (MDB) pour la réception

### Composant d'envoi de messages

L'envoi passe par un **EJB Stateless**. D'autres mécanismes (servlet, etc.) sont possibles.

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
Points à noter :
1. Les ressources JMS (**ConnectionFactory** et **Queue**) sont injectées via `@Resource`
2. Elles proviennent du scope courant du module
3. Un identifiant de corrélation unique (UUID) est généré par message
4. Les ressources sont fermées après utilisation
{{< /notice >}}

Pour la configuration JNDI avec JBoss, consulter la [documentation officielle](https://docs.jboss.org/author/display/AS72/JNDI+Reference).

### Composant de réception de messages

La réception JMS passe par un **Message-Driven Bean** (MDB), activé à l'arrivée d'un message dans une file d'attente ou un topic.

La classe doit implémenter **javax.jms.MessageListener** :

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
Configurer le MDB avec des annotations **ActivationSpec** est possible mais déconseillé : cela mélange préoccupations techniques et code applicatif. Mieux vaut externaliser cette configuration dans les descripteurs de déploiement — un choix classique de **separation of concerns**.
{{< /notice >}}

## Configuration de l'application

Les composants développés, reste à configurer l'application pour la connexion à WebSphere MQ. Deux fichiers descripteurs entrent en jeu :

1. **ejb-jar.xml** : définition standard Java EE des composants
2. **jboss-ejb3.xml** : configuration spécifique JBoss pour l'intégration WebSphere MQ

### Définition Java EE (ejb-jar.xml)

Le fichier **ejb-jar.xml** définit les composants EJB selon le standard Java EE :

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

Ce fichier déclare :
- Un MDB nommé « MessageDrivenBean » à l'écoute d'une file JMS
- Un EJB de session « MoMSenderBean » pour l'envoi de messages

### Configuration spécifique JBoss (jboss-ejb3.xml)

Le fichier **jboss-ejb3.xml** porte la configuration d'intégration avec WebSphere MQ :

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

1. **Placeholders** : toutes les informations techniques sont externalisées via des variables remplacées par les valeurs du fichier standalone.xml (`${websphere.hostName}`, `${websphere.port}`, `${websphere.queueManager}`, etc.)

2. **JNDI** : la propriété `useJNDI` à `true` permet la récupération de la file d'attente par son nom JNDI

3. **Mapping JNDI** : les noms JNDI applicatifs sont mappés vers les noms configurés côté serveur :
   - Serveur : `java:/jboss/jms/wmq/queue/Queue`
   - Application : `jms/queue/Queue`

4. **Binding du Resource Adapter** : le MDB est lié au Resource Adapter WebSphere MQ via `<mdb:resource-adapter-binding>`

{{< notice warning >}}
En contexte d'entreprise, privilégier les fichiers XML de configuration aux annotations Java. Cette approche facilite les changements d'environnement (développement, test, production) sans recompilation. Le code Java doit rester indépendant de l'environnement d'exécution — un principe de **separation of concerns** fondamental.
{{< /notice >}}

{{< notice info >}}
Pour une application connectée à plusieurs systèmes JMS, créer un fichier jboss-ejb3.xml distinct par système. Cela maintient une séparation claire des configurations et facilite la maintenance.
{{< /notice >}}

## Configuration du serveur JBoss EAP

L'application configurée, reste à paramétrer le serveur JBoss EAP pour la communication avec WebSphere MQ. La configuration se fait dans le fichier **standalone.xml**.

### Définition des propriétés système

Les propriétés système remplacent les placeholders de la configuration applicative :

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

Ces propriétés couvrent l'ensemble des paramètres de connexion : hôte, port, identifiants, canal, gestionnaire de files d'attente et Resource Adapter.

{{< notice info >}}
WebSphere MQ propose deux modes de transport :
- **CLIENT** : utilisé ici, fonctionne via TCP/IP sans installation locale de WebSphere MQ
- **BINDING** : meilleures performances, mais nécessite des composants binaires spécifiques installés sur la même machine que JBoss
{{< /notice >}}

### Mécanisme de remplacement des propriétés

JBoss EAP permet de remplacer les placeholders par les valeurs des propriétés système dans différents types de fichiers. Activation :

```xml
<subsystem xmlns="urn:jboss:domain:ee:1.2">
  <spec-descriptor-property-replacement>false</spec-descriptor-property-replacement>
  <jboss-descriptor-property-replacement>true</jboss-descriptor-property-replacement>
  <annotation-property-replacement>false</annotation-property-replacement>
</subsystem>
```

Le remplacement est activé uniquement pour les descripteurs JBoss (jboss-ejb3.xml, etc.), pas pour les descripteurs standard Java EE ni les annotations.

Les trois options :
- **spec-descriptor-property-replacement** : descripteurs standard Java EE (web.xml, ejb-jar.xml, etc.)
- **jboss-descriptor-property-replacement** : descripteurs JBoss (jboss-web.xml, jboss-ejb3.xml, etc.)
- **annotation-property-replacement** : annotations Java

{{< notice note >}}
Activer le remplacement uniquement pour les descripteurs JBoss maintient une séparation nette entre configuration standard Java EE et configuration spécifique à l'environnement.
{{< /notice >}}

### Configuration du Resource Adapter WebSphere MQ

Dernière étape côté serveur, la déclaration du Resource Adapter :

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

Cette configuration déclare :

1. **Le Resource Adapter** : identifié par « wmq.jmsra.rar », le fichier RAR fourni par IBM
2. **Le support transactionnel** : transactions locales
3. **La ConnectionFactory** : exposée en JNDI sous `java:/jboss/jms/wmq/connectionFactory`
4. **La file d'attente** : exposée en JNDI sous `java:/jboss/jms/wmq/queue/Queue`

{{< notice info >}}
La syntaxe `${websphere.port:1414}` permet de définir une valeur par défaut utilisée si la propriété système n'est pas définie.
{{< /notice >}}

## Déploiement

Les configurations en place, il reste à déployer :

1. Copier le Resource Adapter (**wmq.jmsra.rar**) dans `${JBOSS_HOME}/standalone/deployments`
2. Déployer l'application (WAR ou EAR) dans le même répertoire

JBoss détecte automatiquement les nouveaux déploiements. L'application peut alors communiquer avec WebSphere MQ.

## Conclusion

L'intégration JBoss EAP / WebSphere MQ via **JCA** offre plusieurs avantages architecturaux :

| **Critère** | **Bénéfice** |
|---|---|
| **Découplage** | Séparation nette entre code applicatif et configuration d'intégration |
| **Portabilité** | Seules les variables du standalone.xml changent entre environnements |
| **Standards** | JCA et Java EE garantissent interopérabilité et pérennité |
| **Gestion des ressources** | Connexions, transactions et sécurité gérées par le conteneur |
| **Flexibilité** | Changement de fournisseur JMS sans modification du code applicatif |

Cette approche, fondée sur les standards et le **découplage**, permet de bâtir une intégration robuste et évolutive entre JBoss EAP et WebSphere MQ.

### Ressources

* [Documentation Red Hat — Déploiement du WebSphere MQ Resource Adapter](https://access.redhat.com/documentation/en-US/JBoss_Enterprise_Application_Platform/6/html/Administration_and_Configuration_Guide/Deploy_the_WebSphere_MQ_Resource_Adapter.html)
* [Discussion JBoss Developer](https://developer.jboss.org/message/738670)
* [Wiki WebSphere MQ Integration](https://developer.jboss.org/wiki/WebsphereMQIntegration)
* [Programme de vérification d'installation du Resource Adapter](http://www-01.ibm.com/support/knowledgecenter/SSFKSJ_7.5.0/com.ibm.mq.dev.doc/q031760_.htm)
* <img id="en" src="/img/flag-uk.png" width="23" height="23" alt="English version"/> [Version anglaise](/blog/2015/03/26/websphere-mq-jboss-eap-integration-english-version.html)

### Remerciements

* Akram B. A. @RedHat pour certaines ressources de ce post
* Guillaume C. @RedHat pour ses conseils