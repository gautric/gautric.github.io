---
layout: post
css: blog
title:  "Wildfly 9.0 Offline CLI and HTTP/2"
date:   2015-07-03 13:58:00
categories: ["blog"]
tags: ["en","wildfly","Offline","CLI","HTTP/2","JDK8"]
#url: /blog/2015/07/03/wildfly-offline-cli-http-2.html
---

Yesterday, Wildfly community has just released [***Wildfly 9.0.0.Final***](http://wildfly.org/news/2015/07/02/WildFly9-Final-Released/), the last Application Server version. As I talked on my previous [French post about Wildfly](/blog/2015/05/04/wildfly-9-CR01-released-sortie.html) they are a lot of new cool stuffs. I noticed two of them we could use both together quickly. Into a datacenter, we want setup the first configuration without startup full process and open unnecessary port. I propose in this post to setup [***HTTP/2***](https://en.wikipedia.org/wiki/HTTP/2) with offline mode, it is quite useful because we could want to start a JBoss instance directly with HTTP/2 protocol enabled.

> How to setup HTTP/2 configuration into Wildfly 9.0.0.Final with offline mode.

## Download Wildfly

Please download it following [this link](http://wildfly.org/downloads/). The download page provides various distribution formats including zip and tar.gz files for different operating systems.

## Installation

After downloading it, you just have to unzip it into your folder like this:

```bash
tar -zxvf wildfly-9.0.0.Final.tar.gz
```

This will extract all necessary files into a directory named `wildfly-9.0.0.Final`.

## X509 Certificate

HTTP/2 doesn't need an encryption layer for transport, but we gonna implement it in this example to demonstrate a complete secure setup.

Create a self-signed certificate:

```bash
keytool -genkey -alias server -keyalg RSA -keystore server.keystore -validity 365 -keysize 2048 -dname "CN=localhost, OU=IT, O=Gautric, L=Paris, ST=IDF, C=FR" -keypass password -storepass password
```

Export it for your web browser:

```bash
keytool -export -alias server -keystore server.keystore -file server.crt -storepass password
keytool -import -v -trustcacerts -alias server -file server.crt -keystore server.truststore -keypass password -storepass password -noprompt
cp server.keystore $JBOSS_HOME/standalone/configuration/
cp server.truststore $JBOSS_HOME/standalone/configuration/
```

## Secure configuration

Due of some JDK 8 limitations, [ALPN](http://www.eclipse.org/jetty/documentation/current/alpn-chapter.html) isn't supported natively by JDK 8. We will download it from the [*Eclipse Foundation*](https://eclipse.org/org/). This feature is mandatory for the HTTP/2 protocol with encryption.

```bash
export ALPN_VERSION=8.1.3.v20150130
curl http://central.maven.org/maven2/org/mortbay/jetty/alpn/alpn-boot/$ALPN_VERSION/alpn-boot-$ALPN_VERSION.jar > `pwd`/alpn-boot-$ALPN_VERSION.jar
export JAVA_OPTS="$JAVA_OPTS -Xbootclasspath/p:`pwd`/alpn-boot-$ALPN_VERSION.jar"
```

The ALPN (Application-Layer Protocol Negotiation) extension allows the application layer to negotiate which protocol should be performed over a secure connection, which is essential for HTTP/2 implementation.

## Configure the HTTP/2 into Undertow

Now, the best part, Wildly isn't running yet and we will execute some Offline CLI commands to configure the standalone instance.
To use the offline mode, we just have to use the ***embed-server*** command. This command runs an internal Wildly process and will interact directly with it.

```bash
$JBOSS_HOME/bin/jboss-cli.sh
You are disconnected at the moment. Type 'connect' to connect to the server or 'help' for the list of supported commands.
[disconnected /] embed-server
[standalone@embedded /] /core-service=management/security-realm=https:add()
[standalone@embedded /] /core-service=management/security-realm=https/authentication=truststore:add(keystore-path=server.truststore, keystore-password=password, keystore-relative-to=jboss.server.config.dir)
[standalone@embedded /] /core-service=management/security-realm=https/server-identity=ssl:add(keystore-path=server.keystore, keystore-password=password, keystore-relative-to=jboss.server.config.dir)
[standalone@embedded /] /subsystem=undertow/server=default-server/https-listener=https:add(socket-binding=https, security-realm=https, enable-http2=true)
[standalone@embedded /] reload --admin-only=false
[standalone@embedded /] exit
```

As you should know [***Undertow***](http://undertow.io/) is now the JBoss embedded HTTP Webserver, we gonna configure it to enable http2 after we've configured the new security realm.
You should get an output result like this:

```
You are disconnected at the moment. Type 'connect' to connect to the server or 'help' for the list of supported commands.
[disconnected /] embed-server
[standalone@embedded /] /core-service=management/security-realm=https:add()
{"outcome" => "success"}
[standalone@embedded /] /core-service=management/security-realm=https/authentication=truststore:add(keystore-path=server.truststore, keystore-password=password, keystore-relative-to=jboss.server.config.dir)
{
    "outcome" => "success",
    "response-headers" => {
        "operation-requires-reload" => true,
        "process-state" => "reload-required"
    }
}
[standalone@embedded /] /core-service=management/security-realm=https/server-identity=ssl:add(keystore-path=server.keystore, keystore-password=password, keystore-relative-to=jboss.server.config.dir)
{
    "outcome" => "success",
    "response-headers" => {
        "operation-requires-reload" => true,
        "process-state" => "reload-required"
    }
}
[standalone@embedded /] /subsystem=undertow/server=default-server/https-listener=https:add(socket-binding=https, security-realm=https, enable-http2=true)
{
    "outcome" => "success",
    "response-headers" => {"process-state" => "reload-required"}
}
[standalone@embedded /] reload --admin-only=false
[standalone@embedded /]
```

The commands above create a new security realm, configure the truststore and keystore for SSL, and then add an HTTPS listener with HTTP/2 enabled. The `enable-http2=true` parameter is what activates the HTTP/2 protocol support.

## Startup JBoss

After a full correct configuration, you can startup the JBoss instance as usual.

```bash
$JBOSS_HOME/bin/standalone.sh
```

The server will start with HTTP/2 support already enabled thanks to our offline configuration.

## Check it

After a very quick JBoss startup (about 3s), you can check [***the welcome page***](https://localhost:8443/) with your favorite browser like Firefox.
I use to check HTTP/2 protocol, the network panel available inside Firefox. This panel will show you the protocol version being used for each request.

<img src="/img/wildfly9-http2-offline.png" style="max-width:75%;" />

You can see in the screenshot that the protocol column shows "h2" indicating that HTTP/2 is successfully being used.

### Useful links

 * [Offline CLI](https://developer.jboss.org/wiki/OfflineCLIWork) - Learn more about JBoss CLI offline mode
 * [HTTP/2](http://undertow.io/blog/2015/03/26/HTTP2-In-Wildfly.html) - Detailed information about HTTP/2 in Wildfly
