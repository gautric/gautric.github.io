---
layout: post
css: blog
title:  "JConsole & Java Mission Control with JBoss EAP 7"
date:   2016-07-19 14:00:00
categories: ["blog"]
tags: ["en", "JBoss", "redhat", "jvm", "jmc"]
#url: /blog/2016/07/19/JConsole-JavaMissionControl-JBoss-EAP-7.html
---

During Red Hat summit, [Red Hat releases the new version of its JBoss Application Server](http://middlewareblog.redhat.com/2016/06/27/announcing-jboss-eap-7/#more-432). JBoss App Server provides a new JMX Remote Management protocol to connect with. A common JMX tool is [JConsole](http://docs.oracle.com/javase/7/docs/technotes/guides/management/jconsole.html) and we will see how to use it with remote mode. We also configure an other tool called [Java Mission Control](http://www.oracle.com/technetwork/java/javaseproducts/mission-control/java-mission-control-1998576.html) for a cooler JMX monitoring solution. These tools provide powerful capabilities for monitoring and troubleshooting Java applications in production environments.

Sorry my platform is a MacOS X, but I am sure your skill is enough to adapt these instructions into your environment.

## JConsole

JConsole is a graphical monitoring tool to monitor [Java Virtual Machine](https://en.wikipedia.org/wiki/Java_virtual_machine) and Java applications both on a local or remote machine.
JConsole uses underlying features of Java Virtual Machine to provide information on performance and resource consumption of applications running on the Java platform using [Java Management Extensions](https://en.wikipedia.org/wiki/Java_Management_Extensions) technology. JConsole comes as part of [Java Development Kit](https://en.wikipedia.org/wiki/Java_Development_Kit) and the graphical console can be started using "jconsole" command. [from wikipedia](https://en.wikipedia.org/wiki/JConsole)

JConsole is provided both with [OpenJDK](http://openjdk.java.net/) and [Oracle JDK](http://www.oracle.com/technetwork/java/javase/overview/index.html) virtual machine implementations, making it widely available across different Java environments.

### JMX connection

JConsole can connect directly to local Java process (via PID) or, can also connect to remote application via a standard JMX protocol or a custom JMX protocol. Standard JMX protocol is not very flexible and should be not use directly, this protocol has got limitations about account management. **JBoss EAP 7** provides more flexible protocol called **remote+http**. JBoss uses [HTTP Upgrade](https://tools.ietf.org/html/rfc7230#section-6.7) to change protocol from **HTTP** to **jboss-remoting** without changing TCP port at all. This approach simplifies firewall configurations and reduces the number of ports needed for monitoring.

Here is a *tcpdump* capture showing the protocol upgrade in action:

```
GET / HTTP/1.1
Sec-JbossRemoting-Key: t/V5HWbok5e1KAYs22zDrQ==
Upgrade: jboss-remoting
Host: localhost:8080
Connection: upgrade

HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: jboss-remoting
Sec-JbossRemoting-Accept: +F31ah8B270e5BrbWr6Ig90t+NM=
Date: Tue, 19 Jul 2016 16:40:28 GMT

........localhost...3......endpoint....4.0.18.Final-redhat-1....
.(.....(...R......localhost..JBOSS-LOCAL-USER...................
DIGEST-MD5....4.0.18.Final-redhat-1.....(.....(.................
DIGEST-MD5...k.realm="ApplicationRealm",nonce="2LD3fnFJ3Nbsjfj+k
XXXXXXXXXXXXXXXXXXXXXXX",charset=utf-8,algorithm=md5-sess.....ch
arset=utf-8,username="appli",realm="ApplicationRealm",nonce="2LD
3fnFJ3Nbsjfj+XXXXXXXXXXXXXXXXXXXXXXXX",nc=00000001,cnonce="bCz1B
XXXXXXXXXXXXXXXXX/fnQTL5S279++KbxG2",digest-uri="remoting/localh
ost",maxbuf=65536,response=e723bee2cffaddd9c1a3fa8925a106ad,qop=
....
```

### JConsole from JBoss EAP

**JBoss EAP 7** is shipped with a *JConsole* wrapped script. This script injects into the JConsole classpath CLI lib and **remote+http** protocol lib.
It is available into **${JBOSS_HOME}/bin** directory. This wrapper makes it easier to connect to JBoss instances without manually configuring the classpath.

## JConsole connection to JBoss EAP

### with ManagementRealm

Out of the box, JConsole could use **remote+http** protocol for connecting to JBoss Management port **9990**. This is the default configuration and requires minimal setup.

To launch JConsole with the proper configuration:

```
> ${JBOSS_HOME}/bin/jconsole.sh
```

Configure correct JMX url (correct **management** interface and **management-http** port):

```
service:jmx:remote+http://localhost:9990
```

and use *ManagementRealm* account to connect with (don't forget to use **${JBOSS_HOME}/bin/add-user.sh** to configure account). The ManagementRealm is specifically designed for administrative access to the server.

### with ApplicationRealm

You can use an account from *ApplicationRealm* for connecting to **JBoss EAP 7** server but you have to change port connection too. This approach might be useful when you want to use application-level credentials rather than management credentials.

Change *standalone.xml* with CLI command below:

```
/subsystem=jmx/remoting-connector=jmx:write-attribute(name=use-management-endpoint,value=false)
```

Then launch JConsole:

```
> ${JBOSS_HOME}/bin/jconsole.sh
```

Configure correct JMX url (correct **public** interface and **http** port):

```
service:jmx:remote+http://localhost:8080
```

and use *ApplicationRealm* account to connect with (don't forget to use **${JBOSS_HOME}/bin/add-user.sh** to configure account).

{{< notice warning >}}
Be careful, if you use this configuration you couldn't connect anymore via Management interface/port and ManagementRealm's account.
{{< /notice >}}

## Java Mission Control

**Java Mission Control** can collect low level (CPU, I/O, R/W file, etc...) informations about **JVM** and can record them (for offline diagnostic).
It can also collect **JMX** information with JMX system. This makes it a more comprehensive tool than JConsole for performance analysis and troubleshooting.

This tool comes with **Oracle JDK** and is based on **Eclipse** technology. It provides a rich user interface with various views and analysis capabilities.

### Configuration JMC

In order to use JMC with **JBoss EAP 7**, we have to configure JMC classpath for providing correct **remote+http** protocol lib. This step is crucial for establishing a proper connection to the JBoss server.

Edit **jmc.ini** file:

```
Java\ Mission\ Control.app/Contents/MacOS/jmc.ini
```

and add line below at this end of file:

```
-Xbootclasspath/a:${JBOSS_HOME}/bin/client/jboss-client.jar
```

File should look like this after modification:

```
[mbp:~]$> cat /Library/Java/JavaVirtualMachines/jdk1.8.0_92.jdk/Contents/Home/lib/missioncontrol/Java\ Mission\ Control.app/Contents/MacOS/jmc.ini
-startup
../../../plugins/org.eclipse.equinox.launcher_1.3.0.v20140415-2008.jar
--launcher.library
../../../plugins/org.eclipse.equinox.launcher.cocoa.macosx.x86_64_1.1.200.v20141007-2033
-ws
cocoa
--launcher.appendVmargs
-vm
../../../../../jre/bin/
-vmargs
-XX:+UseG1GC
-XX:+UnlockCommercialFeatures
-XX:+FlightRecorder
-XX:FlightRecorderOptions=defaultrecording=true
-Djava.net.preferIPv4Stack=true
-XstartOnFirstThread
-Dorg.eclipse.swt.internal.carbon.smallFonts
-Xbootclasspath/a:/Users/gautric/Application/redhat/eap/jboss-eap-7.0/bin/client/jboss-client.jar
```

## JMC connection to JBoss EAP

After that you could start **JMC** application and add a new connection:

![JMC Connection Screen](/img/jmc-1.png)

Configure correctly JVM connection parameters:

1. to configure custom url
2. to choice custom protocol *(check it first)*
3. for account credential
4. to test connection
5. to save and connect

![JMC Connection Parameters](/img/jmc-2.png)

Now you can now view live all informations about JVM and **JBoss EAP 7** application. The dashboard provides a comprehensive overview of the server's performance metrics.

![JMC Dashboard](/img/jmc-3.png)

You can also check all JMX MBean. This allows you to dive deeper into specific components and their attributes.

![JMC MBean Browser](/img/jmc-4.png)

## Conclusion

**JBoss EAP 7** simplifies remote JMX connection. With *port reduction* and *HTTP upgrade* features, **JBoss EAP 7** monitoring fits perfectly containerization (aka Docker) context. Now both developers and admin system guys can monitor JMX or low level with minimal configuration into constraint environment.

The combination of JConsole and Java Mission Control provides a powerful toolkit for monitoring and troubleshooting JBoss EAP 7 applications. While JConsole offers quick access to basic JMX information, Java Mission Control provides more in-depth analysis capabilities, especially for performance-related issues.

Please feel free to send me your feed back below.

### Useful link

[JMX Wildlfy 10](https://docs.jboss.org/author/display/WFLY10/JMX+subsystem+configuration)
