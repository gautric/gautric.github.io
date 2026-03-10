---
layout: post
css: blog
title:  "JBoss EAP 7 connected to WebsphereMQ running on Docker"
date:   2016-08-03 14:00:00
categories: ["blog"]
tags: ["en", "JBoss", "redhat", "EAP7", "WebsphereMQ", "Docker"]
##url: /blog/2016/08/03/WebsphereMQ-JBoss-EAP-7-Docker.html
---

Last year for a previous customer I wrote an article/post about [WebsphereMQ Best Practice with JBoss EAP 6](/blog/2015/03/26/websphere-mq-jboss-eap-integration-english-version.html). Today we will make almost the same setup but with JBoss EAP 7, WebsphereMQ Sample IVT application, and both running on Docker. This tutorial demonstrates how to configure and connect these enterprise technologies in a containerized environment. I assume you have basic knowledge of Docker commands and concepts.

> Howto run JBoss EAP 7 connected to WebsphereMQ both running on Docker

## Prerequisites

For this lab, you need the following software:

* Package of JBoss EAP 7 [http://www.jboss.org/products/eap/download/](http://www.jboss.org/products/eap/download/)
* Docker for Linux, Mac, or Windows *>= 1.12* installed on your system

{{< notice warning >}}
Warning, this is for trial/demo purposes only. A production deployment requires the purchase of a subscription for JBoss and a license for IBM WebsphereMQ.
{{< /notice >}}

## Clone git project

First of all, clone the git repository project that contains all the necessary configuration files.

```bash
git clone git@github.com:gautric/JBoss-WMQ.git
cd JBoss-WMQ
```

## EAP 7 image creation

We need to [download the JBoss EAP 7 binary](https://access.redhat.com/jbossnetwork/restricted/listSoftware.html?product=appplatform&downloadType=distributions) and create the correct Docker image for EAP 7.

Copy the binary file to the JBoss-WMQ/jboss directory and navigate to this directory to build the image.

```bash
cd JBoss-WMQ
docker build -t jboss-ivt jboss
```

Here's the Dockerfile for the JBoss EAP 7 image:

```dockerfile
### Set the base image to Fedora
FROM jboss/base-jdk:8

## docker build -t jboss-ivt jboss
## docker run -p 8080:8080 -p 9990:9990 -t jboss-ivt

### File Author / Maintainer
MAINTAINER "Greg Autric" "gautric@redhat.com"

### Set Environment
ENV JBOSS_HOME  /opt/jboss/jboss-eap-7.0
ENV MQM_HOME    /opt/mqm
ENV MQM_URL     http://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/messaging/mqadv/mqadv_dev90_linux_x86-64.tar.gz

### Install EAP 7.0.0
COPY jboss-eap-7.0.0.zip /opt
RUN unzip /opt/jboss-eap-7.0.0.zip  1> /dev/null && echo "Install JBoss instance"

## Change user to install some
USER root
RUN cd /tmp && yum install -y wget && wget ${MQM_URL} && tar -zxvf ./*.tar.gz  1> /dev/null && cd MQServer && ./mqlicense.sh -text_only -accept  && rpm -ivh  MQSeriesJava*.rpm MQSeriesRuntime*.rpm
RUN rm -rf /tmp/*

### Create Admin EAP user
USER jboss
RUN $JBOSS_HOME/bin/add-user.sh admin admin123! --silent

## Copy EAR and RAR
RUN cp ${MQM_HOME}/java/lib/jca/wmq.jmsra.ivt.ear ${JBOSS_HOME}/standalone/deployments
RUN cp ${MQM_HOME}/java/lib/jca/wmq.jmsra.rar     ${JBOSS_HOME}/standalone/deployments

### JBoss configuration files
COPY jboss-overlay.cli  /opt
COPY jboss-ejb3.xml     /opt
COPY jboss-web.xml      /opt

### Configure EAP
RUN echo "JAVA_OPTS=\"\$JAVA_OPTS -Djboss.bind.address=0.0.0.0 -Djboss.bind.address.management=0.0.0.0\"" >> $JBOSS_HOME/bin/standalone.conf
RUN ${JBOSS_HOME}/bin/jboss-cli.sh --file=/opt/jboss-overlay.cli
RUN rm -rf ${JBOSS_HOME}/standalone/configuration/standalone_xml_history/current
RUN chown -R jboss:jboss ${JBOSS_HOME}

### Open Ports
EXPOSE 8080 9990

### Start EAP
CMD  ${JBOSS_HOME}/bin/standalone.sh -c standalone-full.xml
```

### Information about this image

* Admin User:
    * An *admin* user is created with a predefined password for management access
* Application and RAR:
    * The demo application and WMQ Resource Adapter come from the [official WMQ tgz](http://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/messaging/mqadv/mqadv_dev90_linux_x86-64.tar.gz)
    * We download it, install only the Java RPM packages, and copy the *rar* and *ear* files to the correct JBoss deployment directory
* JBoss CLI:
    * The CLI script consists of two specific parts:
      * Resource Adapter configuration - setting system properties for the RAR (user/pass/channel/queueManager, etc.)
      * Deployment overlay - used to adapt/provide correct configuration from JBoss to the application
        * jboss-web.xml to adapt **war** configuration
        * jboss-ejb3.xml for providing **ejb** configuration
    * It runs in embed-server mode (offline) to configure the server during image build

Here's the CLI file that configures JBoss EAP 7:

```
embed-server --server-config=standalone-full.xml

deployment-overlay add --name=jboss-ejb-overlay --content=/WMQ_IVT_MDB.jar/META-INF/jboss-ejb3.xml=/opt/jboss-ejb3.xml --deployments=wmq.jmsra.ivt.ear --redeploy-affected
deployment-overlay add --name=jboss-web-overlay --content=/WMQ_IVT.war/WEB-INF/jboss-web.xml=/opt/jboss-web.xml --deployments=wmq.jmsra.ivt.ear --redeploy-affected

# Remove unused stuff
/subsystem=datasources:remove
/subsystem=webservices:remove
/subsystem=jpa:remove
/subsystem=infinispan:remove

/subsystem=ejb3:write-attribute(name=default-resource-adapter-name, value=${ejb.resource-adapter-name:wmq.jmsra.rar})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar:add(archive=wmq.jmsra.rar,transaction-support=LocalTransaction,statistics-enabled=true)

/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF:add(class-name=com.ibm.mq.connector.outbound.ManagedConnectionFactoryImpl,jndi-name=JMS2CF, use-java-context=false)
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=hostName:add(value=${websphere.hostName:localhost})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=password:add(value=${websphere.password:mqm})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=queueManager:add(value=${websphere.queueManager:QUEUE.MANAGER})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=port:add(value=${websphere.port:1414})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=channel:add(value=${websphere.channel:SYSTEM.AUTO.SVRCONN})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=transportType:add(value=${websphere.transportType:CLIENT})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=JMS2CF/config-properties=username:add(value=${websphere.username:mqm})

/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF:add(class-name=com.ibm.mq.connector.outbound.ManagedConnectionFactoryImpl,jndi-name=jms/ivt/IVTCF, use-java-context=false)
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=hostName:add(value=${websphere.hostName:localhost})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=password:add(value=${websphere.password:mqm})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=queueManager:add(value=${websphere.queueManager:QUEUE.MANAGER})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=port:add(value=${websphere.port:1414})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=channel:add(value=${websphere.channel:SYSTEM.AUTO.SVRCONN})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=transportType:add(value=${websphere.transportType:CLIENT})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/connection-definitions=IVTCF/config-properties=username:add(value=${websphere.username:mqm})

/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/admin-objects=QueuePool:add(class-name=com.ibm.mq.connector.outbound.MQQueueProxy,jndi-name=jms/ivt/IVTQueue,use-java-context=true,enabled=true)
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/admin-objects=QueuePool/config-properties=baseQueueName:add(value=${websphere.queueName:Q_QUEUE})
/subsystem=resource-adapters/resource-adapter=wmq.jmsra.rar/admin-objects=QueuePool/config-properties=baseQueueManagerName:add(value=${websphere.queueManager:QUEUE.MANAGER})

# Websphere MQ Host and Port
#/system-property=websphere.hostName:add(value=wmq-ivt)
#/system-property=websphere.port:add(value=1414)

# Websphere MQ configuration
/system-property=websphere.transportType:add(value=CLIENT)
/system-property=websphere.username:add(value=alice)
/system-property=websphere.password:add(value=passw0rd)
/system-property=websphere.channel:add(value=PASSWORD.SVRCONN)
/system-property=websphere.queueManager:add(value=QM1)
/system-property=websphere.queueName:add(value=Q_QUEUE)
/system-property=websphere.resource.adapter:add(value=wmq.jmsra.rar)
/system-property=ejb.resource-adapter-name:add(value=wmq.jmsra.rar)

reload --admin-only=false
```

## WMQ image creation

Now we'll create the WebsphereMQ Docker image. We'll reuse a public image to build our own version with custom configurations.
Navigate back to our git repository root to build our custom image:

```bash
cd JBoss-WMQ
docker build -t wmq-ivt wmq
```

Here's the Dockerfile for the WebsphereMQ image:

```dockerfile
FROM ibmcom/mq
RUN useradd alice -G mqm && \
    echo alice:passw0rd | chpasswd
COPY config.mqsc /etc/mqm/
```

We use a minimal configuration for WebsphereMQ. The **alice** account is created with permissions to connect to WebsphereMQ, and we also create a simple queue for our application.

Here's the WebsphereMQ configuration file:

```
DEFINE CHANNEL(PASSWORD.SVRCONN) CHLTYPE(SVRCONN)
SET CHLAUTH(PASSWORD.SVRCONN) TYPE(BLOCKUSER) USERLIST('nobody') DESCR('Allow privileged users on this channel')
SET CHLAUTH('*') TYPE(ADDRESSMAP) ADDRESS('*') USERSRC(NOACCESS) DESCR('BackStop rule')
SET CHLAUTH(PASSWORD.SVRCONN) TYPE(ADDRESSMAP) ADDRESS('*') USERSRC(CHANNEL) CHCKCLNT(REQUIRED)
ALTER AUTHINFO(SYSTEM.DEFAULT.AUTHINFO.IDPWOS) AUTHTYPE(IDPWOS) ADOPTCTX(YES)
DEFINE QL(Q_QUEUE)
REFRESH SECURITY TYPE(CONNAUTH)
```

## Docker compose to run demo

Finally, we use Docker Compose to run both containers (JBoss and WebsphereMQ) together. We set up environment variables for flexible configuration, such as the WebsphereMQ hostname and port.

```yaml
version: '2'
services:
  jboss-ivt:
    image: jboss-ivt
    build: jboss
    ports:
     - "8080:8080"
     - "9990:9990"
    environment:
      JAVA_OPTS: "-Dwebsphere.hostName=wmq-ivt -Dwebsphere.port=1414"
    links:
      - wmq-ivt
    depends_on:
      - wmq-ivt
  wmq-ivt:
    image: wmq-ivt
    build: wmq
    environment:
      LICENSE: "accept"
      MQ_QMGR_NAME: "QM1"
    ports:
     - "1414:1414"
```

### Run it and check it

Use docker-compose to start both the **WebsphereMQ** and **JBoss EAP 7** containers:

```bash
docker-compose up
```

Once both containers are running, navigate to [IVT URL http://localhost:8080/WMQ_IVT/IVT](http://localhost:8080/WMQ_IVT) in your browser to see the web application.

### Web result

#### The Application page

![JBoss WebsphereMQ Application Page](/img/jboss-wmq-1.png)

#### The Result page

![JBoss WebsphereMQ Result Page](/img/jboss-wmq-2.png)

#### The JMS inspection (View Message Contents) page

![JBoss WebsphereMQ JMS Inspection Page](/img/jboss-wmq-3.png)

### Console output

When you run the containers, you should see output similar to this (truncated for brevity):

```
[mbp:~/Source/git/JBoss-WMQ]$> docker-compose up
Starting jbosswmq_wmq-ivt_1
Starting jbosswmq_jboss-ivt_1
Attaching to jbosswmq_wmq-ivt_1, jbosswmq_jboss-ivt_1
wmq-ivt_1    | ----------------------------------------
wmq-ivt_1    | Name:        IBM MQ
wmq-ivt_1    | Version:     9.0.0.0
wmq-ivt_1    | Level:       p900-L160520.DE
wmq-ivt_1    | BuildType:   IKAP - (Production)
wmq-ivt_1    | Platform:    IBM MQ for Linux (x86-64 platform)
wmq-ivt_1    | Mode:        64-bit
wmq-ivt_1    | O/S:         Linux 4.4.15-moby
wmq-ivt_1    | InstName:    Installation1
wmq-ivt_1    | InstDesc:    
wmq-ivt_1    | Primary:     Yes
wmq-ivt_1    | InstPath:    /opt/mqm
wmq-ivt_1    | DataPath:    /var/mqm
wmq-ivt_1    | MaxCmdLevel: 900
wmq-ivt_1    | LicenseType: Developer
wmq-ivt_1    | ----------------------------------------
wmq-ivt_1    | IBM MQ queue manager 'QM1' starting.
wmq-ivt_1    | The queue manager is associated with installation 'Installation1'.
wmq-ivt_1    | 5 log records accessed on queue manager 'QM1' during the log replay phase.
wmq-ivt_1    | Log replay for queue manager 'QM1' complete.
wmq-ivt_1    | Transaction manager state recovered for queue manager 'QM1'.
wmq-ivt_1    | IBM MQ queue manager 'QM1' started using V9.0.0.0.
wmq-ivt_1    | ----------------------------------------
wmq-ivt_1    | QMNAME(QM1)                                               STATUS(Running)
jboss-ivt_1  | JAVA_OPTS already set in environment; overriding default settings with values: -Dwebsphere.hostName=wmq-ivt -Dwebsphere.port=1414
jboss-ivt_1  | =========================================================================
jboss-ivt_1  |
jboss-ivt_1  |   JBoss Bootstrap Environment
jboss-ivt_1  |
jboss-ivt_1  |   JBOSS_HOME: /opt/jboss/jboss-eap-7.0
jboss-ivt_1  |
jboss-ivt_1  |   JAVA: /usr/lib/jvm/java/bin/java
jboss-ivt_1  |
jboss-ivt_1  |   JAVA_OPTS:  -server -verbose:gc -Xloggc:"/opt/jboss/jboss-eap-7.0/standalone/log/gc.log" -XX:+PrintGCDetails -XX:+PrintGCDateStamps -XX:+UseGCLogFileRotation -XX:NumberOfGCLogFiles=5 -XX:GCLogFileSize=3M -XX:-TraceClassUnloading -Dwebsphere.hostName=wmq-ivt -Dwebsphere.port=1414 -Djboss.bind.address=0.0.0.0 -Djboss.bind.address.management=0.0.0.0
jboss-ivt_1  |
jboss-ivt_1  | =========================================================================
```

## Conclusion

**JBoss EAP 7** proves to be highly flexible for enterprise messaging integration. In this tutorial, I used the Deployment Overlay feature for the first time, which is extremely useful when you cannot modify the original **ear** or **war** packages. We also utilized the **embed-server** mode to configure the JBoss instance offline during the Docker build process.

I would like to thank the *IBM Messaging team* for providing the [WMQ Docker hub image](https://hub.docker.com/r/ibmcom/mq/), which was instrumental in demonstrating the integration between JBoss EAP 7 and WebsphereMQ in a containerized environment.

### Useful links

* [Download JBoss](https://access.redhat.com/jbossnetwork/restricted/listSoftware.html?product=appplatform&downloadType=distributions)
* [Deployment overlay model reference](https://wildscribe.github.io/Wildfly/10.0.0.Final/deployment-overlay/index.html)
* [Deployment overlay tip](https://access.redhat.com/solutions/383393)
* [Deployment overlay tutorial](https://docs.jboss.org/author/display/AS72/Deployment+Overlays)
* [Deployment overlay sample](https://blog.akquinet.de/2013/06/08/deployment-overlays-a-new-feature-of-the-jboss-eap-6-1/)
* [WMQ Docker repo](https://github.com/ibm-messaging/mq-docker)
* [WMQ tgz](http://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/messaging/mqadv/mqadv_dev90_linux_x86-64.tar.gz)
* [WMQ configuration](https://www.ibm.com/developerworks/community/blogs/messaging/entry/getting_going_without_turning_off_mq_security?lang=en)
* [WMQ info](http://www.ibm.com/developerworks/websphere/library/techarticles/1203_green/1203_green.html)

* [Demo URL http://localhost:8080/WMQ_IVT/IVT](http://localhost:8080/WMQ_IVT)
