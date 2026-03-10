---
layout: post
css: blog
title:  "Best Practices Websphere MQ/JBoss EAP 6 English Version"
date:   2015-03-26 13:58:00
categories: ["blog"]
tags: ["en","jboss","eap","wildfly","websphereMQ","JCA"]
#url: /blog/2015/03/26/websphere-mq-jboss-eap-integration-english-version.html
---

# Integrating WebSphere MQ with JBoss EAP 6: Best Practices

Enterprise application integration remains one of the most challenging aspects of modern IT architectures. This article explores how to effectively connect JBoss Enterprise Application Platform (EAP) 6 with IBM WebSphere MQ messaging system using Java EE standards and following industry best practices.

## Introduction to JCA and Enterprise Integration

[JBoss EAP](http://www.jboss.org/products/eap/overview/) application server is [Java EE 6 certified](http://www.oracle.com/technetwork/java/javaee/overview/compatibility-jsp-136984.html), which means it implements all specifications of this Java Enterprise Edition platform version. Among these specifications, the Java EE Connector Architecture (JCA) standard is implemented through the [IronJacamar](http://www.ironjacamar.org/) framework.

The JCA standard enables Java EE applications to connect to external enterprise information systems such as:
- JMS message brokers
- File systems
- Mainframes
- Other enterprise information systems (EIS)

JCA can be conceptually compared to JDBC: while JDBC is limited to relational databases, JCA has a much broader scope and can integrate with virtually any enterprise information system.

### Key Features of the JCA Standard

The JCA standard manages several critical aspects of enterprise integration:

* **Connectivity**: Establishing and managing connections to external systems (sockets, IPC, etc.)
* **Transaction Management**: Supporting both local and distributed (XA) transactions
* **Security**: Authentication and authorization for accessing remote resources
* **Resource Management**: Lifecycle and thread management
* **Service Contracts**: Standardized interfaces between the application server and external systems

To use JCA, the external system provider (in our case, IBM for WebSphere MQ) supplies a component called a **Resource Adapter**, which functions as a driver between the application server and the external system.

> **Goal of this post**: Present best practices for JMS integration between WebSphere MQ (WMQ) and JBoss EAP 6 using the JCA standard for a robust and maintainable solution.

## Prerequisites and Technical Environment

To implement this integration, you'll need the following components:

* **A JBoss EAP server**: Available for download at [http://www.jboss.org/products/eap/download/](http://www.jboss.org/products/eap/download/)
* **A WebSphere MQ server**: Available at [http://www.ibm.com/developerworks/downloads/ws/wmq/](http://www.ibm.com/developerworks/downloads/ws/wmq/)
* **The WebSphere MQ Resource Adapter**: Typically available in the **/opt/mqm/java/lib/jca** directory after installing WebSphere MQ

{{< notice warning >}}
Warning: These are trial or evaluation versions only. Production deployment requires purchasing a subscription for JBoss EAP and a license for IBM WebSphere MQ.
{{< /notice >}}

## Development of Integration Components

To test our integration, we need to develop two essential components:
1. A client for sending JMS messages
2. A Message-Driven Bean (MDB) for receiving messages

### Message Sending Component

For sending messages, we'll create a Stateless EJB. This approach is recommended in a Java EE environment, though other mechanisms like servlets could also be used.

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
Key points to note in this code:
1. JMS resources (ConnectionFactory and Queue) are injected via the @Resource annotation
2. These resources are retrieved from the current module's scope
3. A unique correlation ID (UUID) is generated for each message
4. Resources are properly closed after use
{{< /notice >}}

For more information about JNDI configuration with JBoss, see the [official documentation](https://docs.jboss.org/author/display/AS72/JNDI+Reference).

### Message Receiving Component

In the Java EE architecture, JMS message reception is typically handled through a Message-Driven Bean (MDB). This type of bean is specifically designed to be activated by the arrival of a message in a queue or topic.

To create an MDB, the class must implement the **javax.jms.MessageListener** interface:

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
While it's possible to configure the MDB directly with ActivationSpec annotations, this approach is not recommended as it mixes technical environment concerns with application code. We prefer to externalize this configuration in deployment descriptors, as we'll see later.
{{< /notice >}}

## Application Configuration

Now that we've developed the basic components, we need to configure the application to connect properly to WebSphere MQ. This configuration is primarily done through two descriptor files:

1. **ejb-jar.xml**: Standard Java EE component definition
2. **jboss-ejb3.xml**: JBoss-specific configuration for WebSphere MQ integration

### Java EE Definition (ejb-jar.xml)

The **ejb-jar.xml** file defines the EJB components of our application according to the Java EE standard:

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

This file defines:
- A Message-Driven Bean named "MessageDrivenBean" that listens to a JMS queue
- A Session EJB named "MoMSenderBean" that will be used to send messages

### JBoss-Specific Configuration (jboss-ejb3.xml)

The **jboss-ejb3.xml** file contains JBoss-specific configuration for WebSphere MQ integration:

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

This configuration contains several important elements to understand:

1. **Use of Placeholders**: All technical information is externalized via placeholders (variables) that will be replaced with values defined in the standalone.xml file:
   - `${websphere.hostName}`: WebSphere MQ server hostname
   - `${websphere.port}`: Listening port
   - `${websphere.queueManager}`: Queue manager name
   - etc.

2. **JNDI Usage Activation**: The `useJNDI` property is set to `true` to enable queue retrieval by its JNDI name.

3. **JNDI Name Mapping**: JNDI names used in the application are mapped to JNDI names configured in the JBoss server:
   - Server JNDI name: `java:/jboss/jms/wmq/queue/Queue`
   - Application JNDI name: `jms/queue/Queue`

4. **Resource Adapter Binding**: The MDB is explicitly bound to the WebSphere MQ Resource Adapter via the `<mdb:resource-adapter-binding>` tag.

{{< notice warning >}}
In an enterprise context, it's strongly recommended to use XML configuration files rather than Java annotations. This approach facilitates environment changes (development, testing, production) without requiring code recompilation. Java code should remain as independent as possible from the runtime environment and external system implementation details.
{{< /notice >}}

{{< notice info >}}
If your application needs to connect to multiple JMS systems, it's recommended to create a separate jboss-ejb3.xml file for each system. This approach maintains a clear separation of configurations and simplifies maintenance.
{{< /notice >}}

## JBoss Server Configuration

After configuring the application, we now need to configure the JBoss EAP server to communicate with WebSphere MQ. This configuration is done in the **standalone.xml** file of the JBoss instance.

### System Properties Definition

Let's start by defining the system properties that will be used to replace the placeholders in our configuration:

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

These properties define all the parameters needed to connect to the WebSphere MQ server:
- Connection information (host, port)
- Authentication credentials (username, password)
- Channel and queue manager configuration
- Resource Adapter name to use

{{< notice info >}}
WebSphere MQ offers two main transport modes:
- **CLIENT**: The mode used here, which works over TCP/IP and doesn't require local WebSphere MQ installation
- **BINDING**: A mode that offers better performance but requires OS-specific binary components to be installed on the same machine as JBoss
{{< /notice >}}

### Property Replacement Configuration

JBoss EAP provides a powerful mechanism to replace placeholders with system property values in different types of configuration files. Here's how to enable it:

```xml
<subsystem xmlns="urn:jboss:domain:ee:1.2">
  <spec-descriptor-property-replacement>false</spec-descriptor-property-replacement>
  <jboss-descriptor-property-replacement>true</jboss-descriptor-property-replacement>
  <annotation-property-replacement>false</annotation-property-replacement>
</subsystem>
```

This configuration enables property replacement only in JBoss-specific descriptors (like jboss-ejb3.xml), but not in standard Java EE descriptors or annotations.

The three available options are:
- **spec-descriptor-property-replacement**: For standard Java EE descriptor files (web.xml, ejb-jar.xml, etc.)
- **jboss-descriptor-property-replacement**: For JBoss-specific descriptor files (jboss-web.xml, jboss-ejb3.xml, etc.)
- **annotation-property-replacement**: For Java annotations

{{< notice note >}}
It's recommended to enable replacement only for JBoss descriptors, as this maintains a clear separation between standard Java EE configuration and runtime-specific configuration.
{{< /notice >}}

### WebSphere MQ Resource Adapter Configuration

Finally, we need to configure the WebSphere MQ Resource Adapter in the JBoss server:

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

This configuration defines:

1. **The Resource Adapter**: Identified as "wmq.jmsra.rar", which is the RAR file provided by IBM
2. **Transaction Support**: Configured for local transactions
3. **The ConnectionFactory**: Exposed via JNDI under the name "java:/jboss/jms/wmq/connectionFactory"
4. **The Queue**: Exposed via JNDI under the name "java:/jboss/jms/wmq/queue/Queue"

{{< notice info >}}
Note the use of placeholders with default values (e.g., `${websphere.port:1414}`). This syntax allows specifying a default value that will be used if the system property is not defined.
{{< /notice >}}

## Deployment and Implementation

Once all configurations are complete, the final step is to deploy the necessary components:

1. Copy the WebSphere MQ Resource Adapter (**wmq.jmsra.rar**) to the JBoss deployment directory: `${JBOSS_HOME}/standalone/deployments`
2. Deploy your application (WAR or EAR) to the same directory

JBoss will automatically detect these new deployments and activate them. Your application will then be able to communicate with WebSphere MQ.

## Conclusion: Benefits of This Integration Approach

The integration between JBoss EAP and WebSphere MQ via the JCA standard offers numerous advantages:

1. **Modularity and Maintainability**: The clear separation between application code and integration configuration facilitates maintenance and system evolution.

2. **Environment Portability**: Deployment across different environments (development, testing, production) is simplified, as only the environment variables in the standalone.xml file need to be modified.

3. **Standards-Based**: The approach based on JCA and Java EE standards ensures better interoperability and solution longevity.

4. **Optimized Resource Management**: JCA provides advanced mechanisms for connection management, transactions, and security, improving system performance and reliability.

5. **Flexibility**: This architecture allows easy switching between JMS providers if needed, by modifying only the configuration and not the application code.

By following the best practices presented in this article, you can establish a robust and scalable integration between JBoss EAP and WebSphere MQ that will meet the requirements of modern enterprise applications.

### Useful Resources for Further Learning

* [Deploy the WebSphere MQ Resource Adapter (Red Hat Documentation)](https://access.redhat.com/documentation/en-US/JBoss_Enterprise_Application_Platform/6/html/Administration_and_Configuration_Guide/Deploy_the_WebSphere_MQ_Resource_Adapter.html)
* [JBoss Developer Forum Discussion on WebSphere MQ](https://developer.jboss.org/message/738670)
* [WebSphere MQ Integration Wiki](https://developer.jboss.org/wiki/WebsphereMQIntegration)
* [The installation verification test program for the WebSphere MQ resource adapter](http://www-01.ibm.com/support/knowledgecenter/SSFKSJ_7.5.0/com.ibm.mq.dev.doc/q031760_.htm)
* [French version of this article](/blog/2015/03/25/websphere-mq-jboss-eap-integration.html)

### Acknowledgements

* Akram B. A. @RedHat for resources
* Guillaume C. @RedHat for advice
* Jean-Yves C. for corrections
