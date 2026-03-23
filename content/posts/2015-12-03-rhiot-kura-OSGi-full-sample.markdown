---
layout: post
css: blog
title:  "Rhiot Kura Gateway Sample (Emulator & RaspberryPi) "
date:   2015-12-03 14:00:00
categories: ["blog"]
tags: ["en", "rhiot", "RaspberryPi", "Kura", "Gateway"]
#url: /blog/2015/12/03/rhiot-kura-OSGi-full-sample.html
---

For a while, I have been developing during my free time for the [Rhiot project](http://rhiot.io) with my Red Hat colleague [Henryk](http://henryk-konsek.blogspot.fr/). We started by developing several [Camel components](http://camel.apache.org/components.html#Components-ExternalComponents) such as kura, pi4j, and bluetooth with other volunteers. Now we are focusing on developing and integrating these components for the [Kura Platform](http://www.eclipse.org/kura/). Kura is an [OSGi Platform](http://www.osgi.org) designed specifically for IoT, capable of running on RaspberryPi, BeagleBone, or Intel Edison devices.

The Kura Platform comes with many embedded services tailored for IoT contexts, including GPIO, USB, I2C, Cloud Service, and more. In this post, we will explore:

> How to use Kura Rhiot Quickstart in both emulator mode and real-life mode.

## Requisites

* [Eclipse Mars](https://projects.eclipse.org/releases/mars)
  - Linux or Mac only for emulation
* One [RaspberryPi](https://www.raspberrypi.org/products/raspberry-pi-2-model-b/)
  - tested w/ RPi B+
* Two LEDs
* Two Resistors
* Wires

## Kura Setup

### Emulator setup

First of all, you have to setup your Eclipse workspace with the [Kura eclipse workspace available for download](https://eclipse.org/kura/downloads.php).
[Just follow the instructions strictly](http://eclipse.github.io/kura/doc/raspberry-pi-quick-start.html).

{{< notice warning >}}
To avoid any compilation problems, please downgrade your JRE to a 1.7 version
{{< /notice >}}

{{< notice info >}}
You can test and configure your workspace with the Heater Demo Project
{{< /notice >}}


### Camel and Rhiot configuration into Emulator

#### Target Definition configuration

Before setting up Camel and Rhiot into the Kura Emulator, you need to download several Java libraries:

* camel-core-2.16.0.jar
  - From [ASF Camel](http://camel.apache.org)
* camel-core-osgi-2.16.0.jar
  - From [ASF Camel](http://camel.apache.org)
* camel-kura-2.16.0.jar
  - From [ASF Camel](http://camel.apache.org)
* camel-kura-0.1.3-SNAPSHOT.jar
  - From [Rhiot Project Camel](http://rhiot.io)

After downloading, create a new folder in the `target-definition` project like `camel/2.16.0` and copy all previously downloaded libraries into it.

<img src="/img/kura-camel-rhiot-1.png" style="max-width:33%;" />

Open the Target Definition panel and `Add...` a new `Installation` mapped to the new `camel/2.16.0` folder.

<img src="/img/kura-camel-rhiot-2.png" style="max-width:100%;" />

Verify that `Target Content` loads the Camel and Rhiot libraries correctly by clicking on the `Content` tab to check.

<img src="/img/kura-camel-rhiot-3.png" style="max-width:100%;" />

Save the configuration and click the `Set as Target Definition` action (top right).

#### Launch configuration

We have just finished setting up the `Target Definition` stack. Now we will see how to run it with the `Launch` command.

<img src="/img/kura-camel-rhiot-4.png" style="max-width:33%;" />
<img src="/img/kura-camel-rhiot-5.png" style="max-width:33%;" />

Edit it and select the correct libraries once again.

<img src="/img/kura-camel-rhiot-6.png" style="max-width:100%;" />

To check the installation, just run the `Launch` command as usual and check bundles loading via the OSGi `ss` command.

```
osgi> ss | grep camel
39	ACTIVE      org.apache.camel.camel-core_2.16.0
47	ACTIVE      org.apache.camel.camel-core-osgi_2.16.0
58	ACTIVE      org.apache.camel.camel-kura_2.16.0
61	ACTIVE      io.rhiot.camel-kura_0.1.3.SNAPSHOT
true
osgi>
```

<img src="/img/kura-camel-rhiot-7.png" style="max-width:100%;" />

*Great, everything looks good to run our example!*

## Test and run Kura Rhiot quickstart in emulator

### Import Quickstart Sample

Download our [Kura Rhiot quickstart directly from the GitHub repository](https://github.com/rhiot/quickstarts/tree/master/kura-camel).

Change the `GatewayRouter` class with:

<script src="https://gist.github.com/gautric/e478b4b28b40c8270257.js"></script>

`GatewayRouter` contains our Camel route as usual. It is an OSGi Service. Change the `GatewayRouter.xml` file with:

<script src="https://gist.github.com/gautric/2134986bb6114b035cd5.js"></script>

This OSGi file is needed to start the GatewayRouter service with the [Service Component Runtime](https://osgi.org/xmlns/scr/v1.1.0/scr.xsd) mechanism, as we use SCR and not BundleActivation.

Change the `io.rhiot.quickstarts.kura.camel.GatewayRouter.xml` file with:

<script src="https://gist.github.com/gautric/052adb5b2acf1b96c3cc.js"></script>

This last file provides configuration attributes used by the `GatewayRouter` route, such as `camel.kura.gpio.ouput.id`.

Compile via Maven using `mvn clean package -Dmaven.test.skip=true` to regenerate some MANIFEST and OSGi stuff via the Bnd Maven plugin.

You can also checkout the remote branch `https://github.com/rhiot/quickstarts/tree/kura-gpio`.

#### Emulator run

Use `Kura_Emulator_OSX` Eclipse to run Equinox OSGi.

Make a small log4j modification in the `${loc_workspace}/org.eclipse.kura.emulator/src/main/resources/log4j.properties` file:

```
## eclipse
log4j.logger.org.eclipse.kura.emulator.position=INFO
log4j.logger.org.eclipse=WARN
log4j.logger.io.rhiot=DEBUG
log4j.logger.org.eclipse.kura.emulator.gpio=DEBUG
log4j.logger.org.apache.camel=INFO
log4j.logger.org.apache.camel.core.osgi=INFO
```

The output should look like this:

```
SLF4J: Class path contains multiple SLF4J bindings.
SLF4J: Found binding in [bundleresource://28.fwk1988196802:1/org/slf4j/impl/StaticLoggerBinder.class]
SLF4J: Found binding in [bundleresource://28.fwk1988196802:2/org/slf4j/impl/StaticLoggerBinder.class]
SLF4J: See http://www.slf4j.org/codes.html#multiple_bindings for an explanation.
osgi> Framework is running in emulation mode
21:20:43,749 [Start Level Event Dispatcher] INFO  Activator:96  - Camel activator starting
21:20:43,766 [Start Level Event Dispatcher] INFO  Activator:102  - Camel activator started
21:20:44,114 [Component Resolve Thread] DEBUG GpioServiceImpl:21  - activating emulated GPIOService
21:20:44,825 [Component Resolve Thread] WARN  SystemServiceImpl:769  - Maximum command line upload size not available. Set default to 100 MB
21:20:44,825 [Component Resolve Thread] WARN  SystemServiceImpl:778  - Missing the parameter that specifies the maximum number of files uploadable using the command servlet. Set default to 1024 files
21:20:44,926 [Component Resolve Thread] DEBUG GatewayRouter:46  - Initializing bundle 40.
21:20:45,119 [Component Resolve Thread] INFO  CamelContextHelper:583  - No existing PropertiesComponent has been configured, creating a new default PropertiesComponent with name: properties
21:20:45,128 [Component Resolve Thread] INFO  OsgiDefaultCamelContext:2750  - Apache Camel 2.16.0 (CamelContext: camel-1) is starting
21:20:45,129 [Component Resolve Thread] INFO  ManagedManagementStrategy:191  - JMX is enabled
21:20:45,439 [Component Resolve Thread] INFO  DefaultRuntimeEndpointRegistry:203  - Runtime endpoint registry is in extended mode gathering usage statistics of all incoming and outgoing endpoints (cache limit: 1000)
21:20:45,565 [Component Resolve Thread] INFO  KuraServiceFactory:45  - Found Kura org.eclipse.kura.gpio.GPIOService in the registry. Kura component will use that instance.
21:20:45,576 [Component Resolve Thread] INFO  OsgiDefaultCamelContext:2983  - AllowUseOriginalMessage is enabled. If access to the original message is not needed, then its recommended to turn this option off as it may improve performance.
21:20:45,576 [Component Resolve Thread] INFO  OsgiDefaultCamelContext:2993  - StreamCaching is not in use. If using streams then its recommended to enable stream caching. See more details at http://camel.apache.org/stream-caching.html
21:20:45,608 [Component Resolve Thread] DEBUG KuraGPIOProducer:73  - Starting producer: Producer[kura-gpio://6?action=BLINK]
21:20:45,608 [Component Resolve Thread] INFO  EmulatedPin:76  - Emulated GPIO Pin 6 open.
21:20:45,684 [Component Resolve Thread] INFO  OsgiDefaultCamelContext:3514  - Route: route1 started and consuming from: Endpoint[timer://io.rhiot.kura.timer?period=5000]
21:20:45,686 [Component Resolve Thread] INFO  OsgiDefaultCamelContext:2785  - Total 1 routes, of which 1 is started.
21:20:45,687 [Component Resolve Thread] INFO  OsgiDefaultCamelContext:2786  - Apache Camel 2.16.0 (CamelContext: camel-1) started in 0.558 seconds
21:20:45,690 [Component Resolve Thread] DEBUG GatewayRouter:52  - Bundle 40 started.
21:20:45,690 [Component Resolve Thread] DEBUG GatewayRouter:48  - Refreshing SCR properties: org.eclipse.equinox.internal.ds.impl.ReadOnlyDictionary@283dd358
'21:20:46,698 [Camel (camel-1) thread #0 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:20:46,701 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to on
21:20:46,752 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to off
21:20:51,691 [Camel (camel-1) thread #0 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:20:51,692 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to on
21:20:51,745 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to off
21:20:56,692 [Camel (camel-1) thread #0 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:20:56,692 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to on
21:20:56,747 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to off
21:21:01,697 [Camel (camel-1) thread #0 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:01,698 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to on
21:21:01,752 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to off
21:21:06,703 [Camel (camel-1) thread #0 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:06,704 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to on
21:21:06,758 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to off
21:21:11,708 [Camel (camel-1) thread #0 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:11,709 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to on
21:21:11,763 [Camel (camel-1) thread #1 - kura-gpio-camel] DEBUG EmulatedPin:58  - Emulated GPIO Pin 6 changed to off'
21:21:13,798 [qtp1872598749-36] INFO  /:1947  - org.eclipse.kura.web.server.GwtSecurityTokenServiceImpl: Trying www resource2: /www/denali/CF261C606092B547DDA8A7EE4A5B1ADC.gwt.rpc
21:21:13,821 [qtp1872598749-34] INFO  /:1947  - org.eclipse.kura.web.server.GwtComponentServiceImpl: Trying www resource2: /www/denali/48673E1A90F237B138F81C0DF07ED6D7.gwt.rpc
21:21:13,914 [Component Resolve Thread (Bundle 58)] INFO  DefaultShutdownStrategy:190  - Starting to graceful shutdown 1 routes (timeout 10 seconds)
'21:21:13,920 [Camel (camel-1) thread #2 - ShutdownTask] INFO  DefaultShutdownStrategy:663  - Route: route1 shutdown complete, was consuming from: Endpoint[timer://io.rhiot.kura.timer?period=5000]'
21:21:13,921 [Component Resolve Thread (Bundle 58)] INFO  DefaultShutdownStrategy:254  - Graceful shutdown of 1 routes completed in 0 seconds
21:21:13,930 [Component Resolve Thread (Bundle 58)] DEBUG KuraGPIOProducer:82  - Stopping producer: Producer[kura-gpio://6?action=BLINK]
21:21:13,931 [Component Resolve Thread (Bundle 58)] INFO  EmulatedPin:81  - Emulated GPIO Pin 6 closed.
21:21:13,933 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:3311  - Route: route1 is stopped, was consuming from: Endpoint[timer://io.rhiot.kura.timer?period=5000]
21:21:13,947 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:3311  - Route: route1 is shutdown and removed, was consuming from: Endpoint[timer://io.rhiot.kura.timer?period=5000]
21:21:13,949 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:3010  - Apache Camel 2.16.0 (CamelContext: camel-1) is shutting down
21:21:13,957 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:3095  - Apache Camel 2.16.0 (CamelContext: camel-1) uptime 28.829 seconds
21:21:13,957 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:3096  - Apache Camel 2.16.0 (CamelContext: camel-1) is shutdown in 0.009 seconds
21:21:13,961 [Component Resolve Thread (Bundle 58)] DEBUG GatewayRouter:48  - Refreshing SCR properties: org.eclipse.equinox.internal.ds.impl.ReadOnlyDictionary@283dd358
21:21:13,961 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:2750  - Apache Camel 2.16.0 (CamelContext: camel-1) is starting
21:21:13,961 [Component Resolve Thread (Bundle 58)] INFO  ManagedManagementStrategy:191  - JMX is enabled
21:21:13,961 [Component Resolve Thread (Bundle 58)] INFO  DefaultRuntimeEndpointRegistry:203  - Runtime endpoint registry is in extended mode gathering usage statistics of all incoming and outgoing endpoints (cache limit: 1000)
21:21:14,167 [Component Resolve Thread (Bundle 58)] INFO  KuraServiceFactory:45  - Found Kura org.eclipse.kura.gpio.GPIOService in the registry. Kura component will use that instance.
21:21:14,171 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:2983  - AllowUseOriginalMessage is enabled. If access to the original message is not needed, then its recommended to turn this option off as it may improve performance.
21:21:14,171 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:2993  - StreamCaching is not in use. If using streams then its recommended to enable stream caching. See more details at http://camel.apache.org/stream-caching.html
21:21:14,183 [Component Resolve Thread (Bundle 58)] DEBUG KuraGPIOProducer:73  - Starting producer: Producer[kura-gpio://3?action=TOGGLE]
21:21:14,183 [Component Resolve Thread (Bundle 58)] INFO  EmulatedPin:76  - Emulated GPIO Pin 3 open.
21:21:14,224 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:3514  - Route: route1 started and consuming from: Endpoint[timer://io.rhiot.kura.timer?period=10000]
21:21:14,224 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:2785  - Total 1 routes, of which 1 is started.
21:21:14,225 [Component Resolve Thread (Bundle 58)] INFO  OsgiDefaultCamelContext:2786  - Apache Camel 2.16.0 (CamelContext: camel-1) started in 0.263 seconds
'21:21:15,228 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:15,228 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] DEBUG EmulatedPin:58  - Emulated GPIO Pin 3 changed to on
21:21:25,233 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:25,234 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] DEBUG EmulatedPin:58  - Emulated GPIO Pin 3 changed to off
21:21:35,238 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:35,239 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] DEBUG EmulatedPin:58  - Emulated GPIO Pin 3 changed to on
21:21:45,239 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:45,239 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] DEBUG EmulatedPin:58  - Emulated GPIO Pin 3 changed to off
21:21:55,244 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] INFO  heartbeat:96  - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
21:21:55,244 [Camel (camel-1) thread #3 - timer://io.rhiot.kura.timer] DEBUG EmulatedPin:58  - Emulated GPIO Pin 3 changed to on'
```

You can change some parameters via the Kura WebUI:

<img src="/img/kura-camel-rhiot-7bis.png" style="max-width:100%;" />

## Execution IRL (In Real Life)

Let's run it in real life with actual hardware.

### Wire, LED, RaspberryPi

Follow the schema below to connect your components:

<img src="/img/kura-camel-rhiot-8.png" style="max-width:80%;" />


### Bundles installation into RaspberryPi

Compile the Kura-Rhiot Sample via the common `mvn clean package` command.

After you have installed [Kura deb](https://s3.amazonaws.com/kura_downloads/raspbian/release/1.3.0/kura_1.3.0_raspberry-pi-bplus-nn_installer.deb) onto your RaspberryPi, you can start and install the bundles.

To start the Kura service:
```
rpbi> sudo service kura start  
```

You can use `tail -f /var/log/kura.log` to check if the Kura Platform is running.

Copy to RaspberryPi and install all bundles via command line. Connect to Kura OSGi via the telnet protocol:
```
rpbi> telnet 127.0.0.1 5002
Trying 127.0.0.1...
Connected to 127.0.0.1.
Escape character is '^]'.

osgi>
osgi> install file:///home/pi/kura/camel-core-2.16.0.jar
osgi> install file:///home/pi/kura/camel-core-osgi-2.16.0.jar
osgi> install file:///home/pi/kura/camel-kura-2.16.0.jar              
osgi> install file:///home/pi/kura/camel-kura-0.1.3-SNAPSHOT.jar      
osgi> install file:///home/pi/kura/rhiot-kura-camel-1.0.0-SNAPSHOT.jar
```

And start all INSTALLED bundles:
```
start 69 70 71 72 73  // for example
```

The output should look like this:
```
2015-12-02 21:37:24,414 [Component Resolve Thread (Bundle 6)] DEBUG i.r.q.k.c.GatewayRouter - Initializing bundle 75.
2015-12-02 21:37:24,424 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.u.CamelContextHelper - No existing PropertiesComponent has been configured, creating a new default PropertiesComponent with name: properties
2015-12-02 21:37:24,432 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Apache Camel 2.16.0 (CamelContext: camel-2) is starting
2015-12-02 21:37:24,433 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.m.ManagedManagementStrategy - JMX is enabled
2015-12-02 21:37:24,934 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.i.DefaultRuntimeEndpointRegistry - Runtime endpoint registry is in extended mode gathering usage statistics of all incoming and outgoing endpoints (cache limit: 1000)
2015-12-02 21:37:25,242 [Component Resolve Thread (Bundle 6)] INFO  i.r.c.k.u.KuraServiceFactory - Found Kura org.eclipse.kura.gpio.GPIOService in the registry. Kura component will use that instance.
2015-12-02 21:37:25,260 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - AllowUseOriginalMessage is enabled. If access to the original message is not needed, then its recommended to turn this option off as it may improve performance.
2015-12-02 21:37:25,263 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - StreamCaching is not in use. If using streams then its recommended to enable stream caching. See more details at http://camel.apache.org/stream-caching.html
2015-12-02 21:37:25,330 [Component Resolve Thread (Bundle 6)] DEBUG i.r.c.k.g.KuraGPIOProducer - Starting producer: Producer[kura-gpio://3?action=BLINK]
2015-12-02 21:37:25,619 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Route: route2 started and consuming from: Endpoint[timer://io.rhiot.kura.timer?period=1000]
2015-12-02 21:37:25,622 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Total 1 routes, of which 1 is started.
2015-12-02 21:37:25,624 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Apache Camel 2.16.0 (CamelContext: camel-2) started in 1.191 seconds
2015-12-02 21:37:25,639 [Component Resolve Thread (Bundle 6)] DEBUG i.r.q.k.c.GatewayRouter - Bundle 75 started.
2015-12-02 21:37:25,640 [Component Resolve Thread (Bundle 6)] DEBUG i.r.q.k.c.GatewayRouter - Refreshing SCR properties: org.eclipse.equinox.internal.ds.impl.ReadOnlyDictionary@18158f3
2015-12-02 21:37:25,649 [Component Resolve Thread (Bundle 6)] INFO  o.e.k.c.c.ConfigurableComponentTracker - Adding ConfigurableComponent io.rhiot.quickstarts.kura.camel.GatewayRouter
2015-12-02 21:37:25,657 [Component Resolve Thread (Bundle 6)] INFO  o.e.k.c.c.ConfigurationServiceImpl - Registration of ConfigurableComponent io.rhiot.quickstarts.kura.camel.GatewayRouter by org.eclipse.kura.core.configuration.ConfigurationServiceImpl@18b94e4...
2015-12-02 21:37:25,700 [Component Resolve Thread (Bundle 6)] INFO  o.e.k.c.c.ConfigurationServiceImpl - Registering io.rhiot.quickstarts.kura.camel.GatewayRouter with ocd: org.eclipse.kura.core.configuration.metatype.Tocd@1a80018 ...
2015-12-02 21:37:25,701 [Component Resolve Thread (Bundle 6)] INFO  o.e.k.c.c.ConfigurationServiceImpl - Registration Completed for Component io.rhiot.quickstarts.kura.camel.GatewayRouter.
2015-12-02 21:37:26,625 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
2015-12-02 21:37:27,735 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
2015-12-02 21:37:28,735 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
2015-12-02 21:37:29,736 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
2015-12-02 21:37:30,736 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
2015-12-02 21:37:31,736 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
2015-12-02 21:37:32,736 [Camel (camel-2) thread #12 - timer://io.rhiot.kura.timer] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: null, Body: [Body is null]]
```

### YouTube Demo

<iframe width="650" height="415" src="https://www.youtube.com/embed/ZAUm_g4Xp5U" frameborder="0" ></iframe>

<br/>

## Conclusion

The [Kura Platform](http://www.eclipse.org/kura/) is a truly interesting OSGi Platform. As we've demonstrated today, the setup is not overly complex if you understand what you're doing. I appreciate OSGi technology for its modularity, flexibility, and robustness.

Since we can successfully integrate Camel and Rhiot bundles, we have the opportunity to develop exciting new components, applications, and products. This integration opens up numerous possibilities for IoT development on resource-constrained devices like the RaspberryPi.

I encourage you to develop and contribute more to the [Kura](http://www.eclipse.org/kura/), [Camel](http://camel.apache.org), and [Rhiot](http://rhiot.io) projects. The combination of these technologies creates a powerful platform for IoT development that balances performance with flexibility.

Stay tuned for more updates and tutorials!

Please feel free to send me your feedback — see [Apropos](/apropos/).


### Useful links

 * [KuraGateway configuration](http://127.0.0.1:8080/kura)
 * [Rhiot project](http://rhiot.io)
 * [Camel-kura component](https://github.com/rhiot/rhiot/tree/master/gateway/components/camel-kura)
