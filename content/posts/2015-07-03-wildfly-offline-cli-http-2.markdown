---
layout: post
css: blog
title:  "Wildfly 9.0 Offline CLI and HTTP/2"
date:   2015-07-03 13:58:00
categories: ["blog"]
tags: ["en","wildfly","Offline","CLI","HTTP/2","JDK8"]
#url: /blog/2015/07/03/wildfly-offline-cli-http-2.html
---

The Wildfly community has released [**Wildfly 9.0.0.Final**](http://wildfly.org/news/2015/07/02/WildFly9-Final-Released/). As mentioned in a [previous post about Wildfly](/blog/2015/05/04/wildfly-9-CR01-released-sortie.html), this version brings several notable features. Two of them combine well: **offline CLI** and **HTTP/2** support. In a datacenter context, the initial configuration should ideally happen without starting the full process or opening unnecessary ports. This post shows how to set up HTTP/2 using offline mode — useful for starting a JBoss instance with HTTP/2 already enabled.

> How to set up HTTP/2 in Wildfly 9.0.0.Final using offline mode.

## Download Wildfly

Available at [this link](http://wildfly.org/downloads/).

## Installation

```bash
tar -zxvf wildfly-9.0.0.Final.tar.gz
```

## X509 Certificate

**HTTP/2** does not strictly require encryption, but this example implements it for a complete secure setup.

Self-signed certificate creation:

```bash
keytool -genkey -alias server -keyalg RSA -keystore server.keystore -validity 365 -keysize 2048 -dname "CN=localhost, OU=IT, O=Gautric, L=Paris, ST=IDF, C=FR" -keypass password -storepass password
```

Export for the web browser:

```bash
keytool -export -alias server -keystore server.keystore -file server.crt -storepass password
keytool -import -v -trustcacerts -alias server -file server.crt -keystore server.truststore -keypass password -storepass password -noprompt
cp server.keystore $JBOSS_HOME/standalone/configuration/
cp server.truststore $JBOSS_HOME/standalone/configuration/
```

## Secure configuration

Due to JDK 8 limitations, [**ALPN**](http://www.eclipse.org/jetty/documentation/current/alpn-chapter.html) (Application-Layer Protocol Negotiation) is not supported natively. The library must be downloaded from the [Eclipse Foundation](https://eclipse.org/org/). ALPN is mandatory for HTTP/2 over TLS.

```bash
export ALPN_VERSION=8.1.3.v20150130
curl http://central.maven.org/maven2/org/mortbay/jetty/alpn/alpn-boot/$ALPN_VERSION/alpn-boot-$ALPN_VERSION.jar > `pwd`/alpn-boot-$ALPN_VERSION.jar
export JAVA_OPTS="$JAVA_OPTS -Xbootclasspath/p:`pwd`/alpn-boot-$ALPN_VERSION.jar"
```


## Configure HTTP/2 into Undertow

The key part: Wildfly is not running yet. The **offline CLI** commands configure the standalone instance directly. The `embed-server` command runs an internal Wildfly process and interacts with it.

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

[**Undertow**](http://undertow.io/) is the JBoss embedded HTTP server. The commands above create a security realm, configure the truststore and keystore for SSL, then add an HTTPS listener with `enable-http2=true`.

Expected output:

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

## Startup JBoss

```bash
$JBOSS_HOME/bin/standalone.sh
```

The server starts with HTTP/2 already enabled thanks to the offline configuration.

## Verification

After startup (~3s), the [welcome page](https://localhost:8443/) can be checked with Firefox. The network panel shows the protocol version for each request.

<img src="/img/wildfly9-http2-offline.png" style="max-width:75%;" />

The protocol column shows "h2", confirming HTTP/2 is active.

### Useful links

 * [Offline CLI](https://developer.jboss.org/wiki/OfflineCLIWork)
 * [HTTP/2 in Wildfly](http://undertow.io/blog/2015/03/26/HTTP2-In-Wildfly.html)