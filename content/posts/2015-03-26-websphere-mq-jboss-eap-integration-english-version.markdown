---
title: "Best Practices Websphere MQ/JBoss EAP 6 English Version"
date: 2015-03-26 13:58:00
categories: ["blog"]
tags: ["en", "jboss", "eap", "wildfly", "websphereMQ", "JCA"]
---

# Integrating WebSphere MQ with JBoss EAP 6: Best Practices

Enterprise application integration remains one of the most challenging aspects of modern IT architectures. This article details how to connect **JBoss EAP 6** with **IBM WebSphere MQ** using Java EE standards and industry best practices.

## Introduction to JCA and Enterprise Integration

[JBoss EAP](http://www.jboss.org/products/eap/overview/) is [Java EE 6 certified](http://www.oracle.com/technetwork/java/javaee/overview/compatibility-jsp-136984.html). Among the implemented specifications, the **Java EE Connector Architecture** (JCA) standard relies on the [IronJacamar](http://www.ironjacamar.org/) framework.

JCA enables Java EE applications to connect to external enterprise information systems:
- JMS message brokers
- File systems
- Mainframes
- Other enterprise information systems (EIS)

The analogy with JDBC is relevant: JDBC is limited to relational databases, JCA covers a much broader scope.

### Key Features of the JCA Standard

* **Connectivity**: establishing and managing connections to external systems (sockets, IPC, etc.)
* **Transaction Management**: supporting both local and distributed (XA) transactions
* **Security**: authentication and authorization for accessing remote resources
* **Resource Management**: lifecycle and thread management
* **Service Contracts**: standardized interfaces between the application server and external systems

The external system provider (here IBM for WebSphere MQ) supplies a **Resource Adapter**, which acts as a driver between the application server and the external system.

> **Goal**: Present best practices for JMS integration between **WebSphere MQ** and **JBoss EAP 6** using the JCA standard for a robust and maintainable solution.

## Prerequisites and Technical Environment

Required components:

* **JBoss EAP**: [http://www.jboss.org/products/eap/download/](http://www.jboss.org/products/eap/download/)
* **WebSphere MQ**: [http://www.ibm.com/developerworks/downloads/ws/wmq/](http://www.ibm.com/developerworks/downloads/ws/wmq/)
* **WebSphere MQ Resource Adapter**: typically in **/opt/mqm/java/lib/jca** after installation

{{< notice warning >}}
These are trial versions only. Production deployment requires a JBoss EAP subscription and an IBM WebSphere MQ license.
{{< /notice >}}

## Development of Integration Components

Two components are needed to validate the integration:
1. A client for sending JMS messages
2. A **Message-Driven Bean** (MDB) for receiving messages

### Message Sending Component

Sending is handled by a **Stateless EJB**. Other mechanisms (servlet, etc.) are possible.

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
            LOGGER.trace("Getting a connection {}", connection);

            Session session = connection.createSession(false, AUTO_ACKNOWLEDGE);
            MessageProducer producer = session.createProducer(queue);
            LOGGER.trace("Creating sender {} for queue {}", producer, queue);

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
Key points:
1. JMS resources (**ConnectionFactory** and **Queue**) are injected via `@Resource`
2. They come from the current module's scope
3. A unique correlation ID (UUID) is generated per message
4. Resources are properly closed after use
{{< /notice >}}

For JNDI configuration with JBoss, see the [official documentation](https://docs.jboss.org/author/display/AS72/JNDI+Reference).

### Message Receiving Component

JMS message reception is handled by a **Message-Driven Bean** (MDB), activated upon message arrival in a queue or topic.

The class must implement **javax.jms.MessageListener**:

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
Configuring the MDB with **ActivationSpec** annotations is possible but not recommended: it mixes technical environment concerns with application code. Externalizing this configuration in deployment descriptors is a better approach — a classic **separation of concerns** decision.
{{< /notice >}}

## Application Configuration

With the components developed, the application must be configured for WebSphere MQ connectivity. Two descriptor files are involved:

1. **ejb-jar.xml**: standard Java EE component definition
2. **jboss-ejb3.xml**: JBoss-specific configuration for WebSphere MQ integration

### Java EE Definition (ejb-jar.xml)

The **ejb-jar.xml** file defines EJB components according to the Java EE standard:

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

This file declares:
- An MDB named "MessageDrivenBean" listening to a JMS queue
- A session EJB "MoMSenderBean" for sending messages

### JBoss-Specific Configuration (jboss-ejb3.xml)

The **jboss-ejb3.xml** file carries the WebSphere MQ integration configuration:

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

#### Key Configuration Elements

1. **Placeholders**: all technical information is externalized via variables replaced by values from standalone.xml (`${websphere.hostName}`, `${websphere.port}`, `${websphere.queueManager}`, etc.)

2. **JNDI**: the `useJNDI` property set to `true` enables queue retrieval by JNDI name

3. **JNDI Name Mapping**: application JNDI names are mapped to server-side JNDI names:
   - Server: `java:/jboss/jms/wmq/queue/Queue`
   - Application: `jms/queue/Queue`

4. **Resource Adapter Binding**: the MDB is bound to the WebSphere MQ Resource Adapter via `<mdb:resource-adapter-binding>`

{{< notice warning >}}
In an enterprise context, XML configuration files should be preferred over Java annotations. This approach facilitates environment changes (development, testing, production) without recompilation. Java code should remain independent from the runtime environment — a fundamental **separation of concerns** principle.
{{< /notice >}}

{{< notice info >}}
For applications connecting to multiple JMS systems, create a separate jboss-ejb3.xml file per system. This maintains clear configuration separation and simplifies maintenance.
{{< /notice >}}


## JBoss Server Configuration

With the application configured, the JBoss EAP server must be set up for WebSphere MQ communication. Configuration is done in the **standalone.xml** file.

### System Properties Definition

System properties replace the placeholders in the application configuration:

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

These properties cover all connection parameters: host, port, credentials, channel, queue manager and Resource Adapter.

{{< notice info >}}
WebSphere MQ offers two main transport modes:
- **CLIENT**: used here, works over TCP/IP without local WebSphere MQ installation
- **BINDING**: better performance, but requires OS-specific binary components on the same machine as JBoss
{{< /notice >}}

### Property Replacement Configuration

JBoss EAP can replace placeholders with system property values in different configuration file types:

```xml
<subsystem xmlns="urn:jboss:domain:ee:1.2">
  <spec-descriptor-property-replacement>false</spec-descriptor-property-replacement>
  <jboss-descriptor-property-replacement>true</jboss-descriptor-property-replacement>
  <annotation-property-replacement>false</annotation-property-replacement>
</subsystem>
```

Property replacement is enabled only for JBoss-specific descriptors (jboss-ejb3.xml, etc.), not for standard Java EE descriptors or annotations.

The three options:
- **spec-descriptor-property-replacement**: standard Java EE descriptors (web.xml, ejb-jar.xml, etc.)
- **jboss-descriptor-property-replacement**: JBoss-specific descriptors (jboss-web.xml, jboss-ejb3.xml, etc.)
- **annotation-property-replacement**: Java annotations

{{< notice note >}}
Enabling replacement only for JBoss descriptors maintains a clear separation between standard Java EE configuration and runtime-specific configuration.
{{< /notice >}}

### WebSphere MQ Resource Adapter Configuration

Final server-side step — declaring the Resource Adapter:

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

This configuration declares:

1. **The Resource Adapter**: identified as "wmq.jmsra.rar", the RAR file provided by IBM
2. **Transaction support**: local transactions
3. **The ConnectionFactory**: exposed via JNDI as `java:/jboss/jms/wmq/connectionFactory`
4. **The Queue**: exposed via JNDI as `java:/jboss/jms/wmq/queue/Queue`

{{< notice info >}}
The `${websphere.port:1414}` syntax defines a default value used when the system property is not set.
{{< /notice >}}

## Deployment

With all configurations in place, deploy:

1. Copy the Resource Adapter (**wmq.jmsra.rar**) to `${JBOSS_HOME}/standalone/deployments`
2. Deploy the application (WAR or EAR) to the same directory

JBoss automatically detects new deployments. The application can then communicate with WebSphere MQ.

## Conclusion

The JBoss EAP / WebSphere MQ integration via **JCA** offers several architectural benefits:

| **Criteria** | **Benefit** |
|---|---|
| **Decoupling** | Clean separation between application code and integration configuration |
| **Portability** | Only standalone.xml variables change between environments |
| **Standards** | JCA and Java EE ensure interoperability and longevity |
| **Resource Management** | Connections, transactions and security handled by the container |
| **Flexibility** | JMS provider can be changed without modifying application code |

This approach, built on standards and **decoupling**, enables a robust and scalable integration between JBoss EAP and WebSphere MQ.

### Resources

* [Deploy the WebSphere MQ Resource Adapter (Red Hat Documentation)](https://access.redhat.com/documentation/en-US/JBoss_Enterprise_Application_Platform/6/html/Administration_and_Configuration_Guide/Deploy_the_WebSphere_MQ_Resource_Adapter.html)
* [JBoss Developer Forum Discussion](https://developer.jboss.org/message/738670)
* [WebSphere MQ Integration Wiki](https://developer.jboss.org/wiki/WebsphereMQIntegration)
* [Installation Verification Test Program for the WebSphere MQ Resource Adapter](http://www-01.ibm.com/support/knowledgecenter/SSFKSJ_7.5.0/com.ibm.mq.dev.doc/q031760_.htm)
* [French version of this article](/blog/2015/03/25/websphere-mq-jboss-eap-integration.html)

### Acknowledgements

* Akram B. A. @RedHat for resources
* Guillaume C. @RedHat for advice
* Jean-Yves C. for corrections