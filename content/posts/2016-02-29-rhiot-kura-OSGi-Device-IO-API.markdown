---
layout: post
css: blog
title:  "Rhiot Kura Device IO GPIO and I2C"
date:   2016-02-29 14:00:00
categories: ["blog"]
tags: ["en", "rhiot", "RaspberryPi", "Kura", "Gateway", "DIO", "DeviceIO", "I2C", "API"]
#url: /blog/2016/02/29/rhiot-kura-OSGi-Device-IO-API.html
---

Recently, a colleague of mine asked me to implement a small demonstration project. I decided to develop a new component for the Rhiot project. This component is the [DeviceIO](http://openjdk.java.net/projects/dio/) [I2C](https://en.wikipedia.org/wiki/I%C2%B2C) [Camel](http://camel.apache.org) component, which builds upon my previous work on Camel-pi4j that I had already developed for the Rhiot project. In this article, we'll explore how to use this component within the Kura Platform via the Camel Framework. For this demonstration, we'll need some hardware devices, specifically a [RaspberryPi](https://www.raspberrypi.org/) and an [ActiveMQ](http://activemq.apache.org/) broker.

> How to use Kura Camel DIO from Rhiot Quickstart into RaspberryPi.

## Requisites

* One [RaspberryPi](https://www.raspberrypi.org/products/raspberry-pi-2-model-b/)
  - tested w/ RPi B+
  - should works with all version
* One LED
* One Resistor
* [BMP180 from Adafruit](https://www.adafruit.com/products/1603) or [HTS221](http://www.st.com/web/en/resource/technical/document/datasheet/DM00116291.pdf)
* [Hall/Magnetic Sensor from Itead](https://www.itead.cc/electronic-brick-magnetic-sensor-switch-brick.html)
* An [ActiveMQ](http://activemq.apache.org/) broker and client
* some wires

### Wire, LED, RaspberryPi

Follow Design below

![Design for Hall sensor and BMP180](/img/desgin-hall-sensor-bmp180.png)

and the schematic

![Schematic for Hall sensor and BMP180](/img/schema-hall-sensor-bmp180.png)

### Startup ActiveMQ

To retrieve and collect data we gonna start an ActiveMQ instance with following command line.
You can install it anywhere you want, but your RaspberryPi must be able to ping and connect to it through `MQTT port = 1883`.
[Download](http://activemq.apache.org/download.html) and [install the latest version 5.13.2](http://www.apache.org/dyn/closer.cgi?path=/activemq/5.13.2/apache-activemq-5.13.2-bin.tar.gz)

```
cd ${ACTIVEMQ_HOME}/bin
./activemq start
```

Remember your `ActiveMQ Instance IP`.

[More information into ActiveMQ Getting Started](http://activemq.apache.org/getting-started.html#GettingStarted-OnUnix:)

### Bundles installation into RaspberryPi

#### Install Kura to RaspberryPi

Download Kura version depending your RaspberryPi version. `RPI_VERSION` can be `pi`, `pi-2`, `pi-bplus`.

```
macos> ssh pi@${RASPBERRYPI_IP}
rbpi> export KURA_VERSION=1.4.0
rbpi> export RPI_VERSION=pi
rbpi> wget https://s3.amazonaws.com/kura_downloads/raspbian/release/${KURA_VERSION}/kura_${KURA_VERSION}_raspberry-${RPI_VERSION}_installer.deb
rbpi> sudo dpkg -i kura_${KURA_VERSION}_raspberry-${RPI_VERSION}_installer.deb
```

#### Configure it for Camel support

Just add property below to kura `config.ini`

```
rbpi> sudo sh -c "echo \"org.osgi.framework.bootdelegation=sun.*,com.sun.*\" >> /opt/eclipse/kura/kura/config.ini "
rbpi> sudo reboot
```

#### Configure Kura Cloud

Now we will configure Kura service to connect to *ActiveMQ* instance.

To start kura service:

```
rpbi> sudo service kura start  
```

Configure the broker address (MQTT server) via the [Kura Web UI](http://RPI_IP_ADDR/kura) change ip address with your `RaspberryPi IP` into your browser.

Change the `broker-url` parameter with your `ActiveMQ Instance IP`

![Kura Cloud Configuration](/img/kura-cloud-config.png)

Don't forget to connect Kura Gateway to the Broker server

![Kura Cloud Connection](/img/kura-cloud-config-2.png)

#### Camel Route Design

Here is the Camel route design. This design is intentionally simple, but could be more complex for a real-life implementation.
The Hall sensor sends a message when a magnetic field is detected nearby. Temperature and pressure sensors retrieve their metrics. The route logs a message and metrics. The WireTap component copies messages to the GPIO provider to blink an LED. The last component pushes messages to the [Kura Cloud Service](http://eclipse.github.io/kura/doc/cloud-configuration.html). This service stores messages in a database if the network is unavailable and sends them to the cloud when network connectivity is restored.

![Camel Route Design](/img/camel-route-hall-sensor-bmp180.png)

### Import Quickstart Sample

Download our [Kura Rhiot quickstart directly from github repository](https://github.com/rhiot/quickstarts/tree/kura-camel-dio/kura-camel-dio).

Compile the Kura-Rhiot Sample via the common `mvn clean package` command and copy it to your RaspberryPi:

```
git clone -b kura-camel-dio https://github.com/rhiot/quickstarts.git
cd quickstarts/kura-camel-dio
mvn clean package

scp target/camel-core-2.16.2.jar                   pi@${RASPBERRYPI_IP}:/home/pi
scp target/camel-core-osgi-2.16.2.jar              pi@${RASPBERRYPI_IP}:/home/pi
scp target/camel-kura-2.16.2.jar                   pi@${RASPBERRYPI_IP}:/home/pi
scp target/camel-kura-0.1.5-SNAPSHOT.jar           pi@${RASPBERRYPI_IP}:/home/pi
scp target/camel-device-io-0.1.5-SNAPSHOT.jar      pi@${RASPBERRYPI_IP}:/home/pi
scp target/rhiot-kura-camel-dio-1.0.0-SNAPSHOT.jar pi@${RASPBERRYPI_IP}:/home/pi
```

On your RaspberryPi, you can start and install the bundles.

To start the kura service:

```
rpbi> sudo service kura start  
```

You can use `tail -f /var/log/kura.log` to check if the Kura Platform is running.

Copy to RaspberryPi and install all bundles by connecting to Kura OSGi via telnet protocol:

```
macos> telnet ${RASPBERRYPI_IP} 5002
Trying ${RASPBERRYPI_IP}...
Connected to ${RASPBERRYPI_IP}.
Escape character is '^]'.

 install file:///home/pi/camel-core-2.16.2.jar
 install file:///home/pi/camel-core-osgi-2.16.2.jar
 install file:///home/pi/camel-kura-2.16.2.jar     
 install file:///home/pi/camel-kura-0.1.5-SNAPSHOT.jar    
 install file:///home/pi/camel-device-io-0.1.5-SNAPSHOT.jar    
 install file:///home/pi/rhiot-kura-camel-dio-1.0.0-SNAPSHOT.jar
```

And start all INSTALLED bundles. Use the `ss` OSGi command to retrieve the correct bundle IDs:

```
start 68 69 70 71 72 73
```

The Kura output should look like this:

```
2016-02-28 17:39:18,154 [Component Resolve Thread (Bundle 6)] DEBUG i.r.q.k.c.GatewayRouter - Initializing bundle 74.
2016-02-28 17:39:20,218 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.u.CamelContextHelper - No existing PropertiesComponent has been configured, creating a new default PropertiesComponent with name: properties
2016-02-28 17:39:20,475 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Apache Camel 2.16.2 (CamelContext: camel-1) is starting
2016-02-28 17:39:20,494 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.m.ManagedManagementStrategy - JMX is enabled
2016-02-28 17:39:24,921 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.i.DefaultRuntimeEndpointRegistry - Runtime endpoint registry is in extended mode gathering usage statistics of all incoming and outgoing endpoints (cache limit: 1000)
2016-02-28 17:39:25,243 [Component Resolve Thread (Bundle 6)] INFO  i.r.c.k.u.KuraServiceFactory - Found Kura org.eclipse.kura.gpio.GPIOService in the registry. Kura component will use that instance.
2016-02-28 17:39:27,370 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - AllowUseOriginalMessage is enabled. If access to the original message is not needed, then its recommended to turn this option off as it may improve performance.
2016-02-28 17:39:27,374 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - StreamCaching is not in use. If using streams then its recommended to enable stream caching. See more details at http://camel.apache.org/stream-caching.html
2016-02-28 17:39:27,756 [Component Resolve Thread (Bundle 6)] DEBUG i.r.c.d.i.I2CProducer - Starting producer: Producer[deviceio-i2c://1/0x77?driver=bmp180]
2016-02-28 17:39:27,776 [Component Resolve Thread (Bundle 6)] DEBUG i.r.c.d.i.d.BMP180Driver - bytesRead=1
2016-02-28 17:39:27,785 [Component Resolve Thread (Bundle 6)] DEBUG i.r.c.d.i.d.BMP180Driver - bytesRead=22
2016-02-28 17:39:27,793 [Component Resolve Thread (Bundle 6)] INFO  i.r.c.d.i.d.BMP180Driver - AC1:8126, AC2:-1094, AC3:-14661, AC4:34005, AC5:25140, AC6:17181, B1:6515, B2:40,  MB:-32768, MC:-11786, MD:2735
2016-02-28 17:39:27,867 [Component Resolve Thread (Bundle 6)] INFO  i.r.c.k.u.KuraServiceFactory - Found Kura org.eclipse.kura.cloud.CloudService in the registry. Kura component will use that instance.
2016-02-28 17:39:28,072 [Component Resolve Thread (Bundle 6)] DEBUG i.r.c.k.c.KuraCloudProducer - Starting producer: Producer[kura-cloud://demoAppId/tempMetric]
2016-02-28 17:39:29,805 [Component Resolve Thread (Bundle 6)] DEBUG i.r.c.k.g.KuraGPIOConsumer - Starting consumer: Consumer[kura-gpio://17?direction=INPUT&mode=INPUT_PULL_DOWN&trigger=FALLING_EDGE]
2016-02-28 17:39:29,961 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Route: route1 started and consuming from: Endpoint[kura-gpio://17?direction=INPUT&mode=INPUT_PULL_DOWN&trigger=FALLING_EDGE]
2016-02-28 17:39:29,990 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Total 1 routes, of which 1 is started.
2016-02-28 17:39:30,027 [Component Resolve Thread (Bundle 6)] INFO  o.a.c.c.o.OsgiDefaultCamelContext - Apache Camel 2.16.2 (CamelContext: camel-1) started in 9.526 seconds
2016-02-28 17:39:30,090 [Component Resolve Thread (Bundle 6)] DEBUG i.r.q.k.c.GatewayRouter - Bundle 74 started.
2016-02-28 17:39:30,098 [Component Resolve Thread (Bundle 6)] DEBUG i.r.q.k.c.GatewayRouter - Refreshing SCR properties: org.eclipse.equinox.internal.ds.impl.ReadOnlyDictionary@fa147e
2016-02-28 17:39:30,477 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - 0x6185
2016-02-28 17:39:30,501 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - 0x80 BB A7
2016-02-28 17:39:30,504 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5775
2016-02-28 17:39:30,507 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -2836
2016-02-28 17:39:30,510 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - B5 = 2939
2016-02-28 17:39:30,512 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - B6 = -1061
2016-02-28 17:39:30,515 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5
2016-02-28 17:39:30,518 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = 566
2016-02-28 17:39:30,521 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X3 = 571
2016-02-28 17:39:30,524 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - B3 = 16538
2016-02-28 17:39:30,527 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 1898
2016-02-28 17:39:30,530 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = 27
2016-02-28 17:39:30,532 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X3 = 481
2016-02-28 17:39:30,535 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - B4 = 34504
2016-02-28 17:39:30,538 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - B7 = 1733225000
2016-02-28 17:39:30,541 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 7123
2016-02-28 17:39:30,546 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -11278
2016-02-28 17:39:30,549 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - p = 100441
2016-02-28 17:39:30,626 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - 0x6181
2016-02-28 17:39:30,629 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - UT = 24705
2016-02-28 17:39:30,632 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5772
2016-02-28 17:39:30,635 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -2837
2016-02-28 17:39:30,638 [Thread-21] DEBUG i.r.c.d.i.d.BMP180Driver - B5 = 2935
2016-02-28 17:39:30,716 [Thread-21] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: io.rhiot.component.deviceio.i2c.driver.BMP180Value, Body: [temperature:+18.30 ºC,pressure:1004.41 hPa]]
2016-02-28 17:39:30,776 [Camel (camel-1) thread #0 - WireTap] INFO  i.r.c.k.u.KuraServiceFactory - Found Kura org.eclipse.kura.gpio.GPIOService in the registry. Kura component will use that instance.
2016-02-28 17:39:30,840 [Camel (camel-1) thread #0 - WireTap] DEBUG i.r.c.k.g.KuraGPIOProducer - Starting producer: Producer[kura-gpio://7?action=BLINK]
2016-02-28 17:40:24,057 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - 0x6199
2016-02-28 17:40:24,075 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - 0x80 AB A7
2016-02-28 17:40:24,077 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5790
2016-02-28 17:40:24,081 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -2831
2016-02-28 17:40:24,083 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - B5 = 2959
2016-02-28 17:40:24,086 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - B6 = -1041
2016-02-28 17:40:24,089 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5
2016-02-28 17:40:24,091 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = 556
2016-02-28 17:40:24,094 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X3 = 561
2016-02-28 17:40:24,097 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - B3 = 16533
2016-02-28 17:40:24,100 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 1863
2016-02-28 17:40:24,102 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = 26
2016-02-28 17:40:24,105 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X3 = 472
2016-02-28 17:40:24,108 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - B4 = 34494
2016-02-28 17:40:24,111 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - B7 = 1733350000
2016-02-28 17:40:24,113 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 7123
2016-02-28 17:40:24,116 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -11283
2016-02-28 17:40:24,119 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - p = 100476
2016-02-28 17:40:24,179 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - 0x6195
2016-02-28 17:40:24,182 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - UT = 24725
2016-02-28 17:40:24,185 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5787
2016-02-28 17:40:24,188 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -2832
2016-02-28 17:40:24,190 [Thread-23] DEBUG i.r.c.d.i.d.BMP180Driver - B5 = 2955
2016-02-28 17:40:24,201 [Thread-23] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: io.rhiot.component.deviceio.i2c.driver.BMP180Value, Body: [temperature:+18.50 ºC,pressure:1004.76 hPa]]
2016-02-28 17:40:26,707 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - 0x619D
2016-02-28 17:40:26,725 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - 0x00 A9 A7
2016-02-28 17:40:26,728 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5793
2016-02-28 17:40:26,731 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -2830
2016-02-28 17:40:26,734 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - B5 = 2963
2016-02-28 17:40:26,737 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - B6 = -1037
2016-02-28 17:40:26,739 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5
2016-02-28 17:40:26,742 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = 553
2016-02-28 17:40:26,745 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X3 = 558
2016-02-28 17:40:26,747 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - B3 = 16531
2016-02-28 17:40:26,750 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 1855
2016-02-28 17:40:26,753 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = 26
2016-02-28 17:40:26,756 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X3 = 470
2016-02-28 17:40:26,758 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - B4 = 34492
2016-02-28 17:40:26,761 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - B7 = 1733400000
2016-02-28 17:40:26,764 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 7123
2016-02-28 17:40:26,766 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -11284
2016-02-28 17:40:26,769 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - p = 100486
2016-02-28 17:40:26,829 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - 0x619E
2016-02-28 17:40:26,832 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - UT = 24734
2016-02-28 17:40:26,835 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X1 = 5794
2016-02-28 17:40:26,838 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - X2 = -2830
2016-02-28 17:40:26,840 [Thread-25] DEBUG i.r.c.d.i.d.BMP180Driver - B5 = 2964
2016-02-28 17:40:26,863 [Thread-25] INFO  i.r.k.heartbeat - Exchange[ExchangePattern: InOnly, BodyType: io.rhiot.component.deviceio.i2c.driver.BMP180Value, Body: [temperature:+18.50 ºC,pressure:1004.86 hPa]]
```

We can receive data from the Broker Server via the following command:

```
bash> bin/rhiot consumer  --brokerUrl failover://tcp://${ACTIVEMQ_IP}:61616 \
 --destination topic://account-name.B8:27:EB:E8:4A:AC.rhiotAppId.rhiotTopicId --bytesAsText  true

INFO | Connecting to #url: failover://tcp://${ACTIVEMQ_IP}:61616 (null:null)
INFO | Consuming topic://account-name.B8:27:EB:E8:4A:AC.rhiotAppId.rhiotTopicId
INFO | Sleeping between receives 0 ms
INFO | Running 1 parallel threads
INFO | Successfully connected to tcp://${ACTIVEMQ_IP}:61616
INFO | consumer-1 wait until 1000 messages are consumed
INFO | consumer-1 Received ID:mbp.g.a.net-60446-1457358139947-2:15:-1:1:24
INFO | BytesMessage as text string: [temperature:+18.30 ºC,pressure:1004.41 hPa]
INFO | consumer-1 Received ID:mbp.g.a.net-60446-1457358139947-2:15:-1:1:25
INFO | BytesMessage as text string: [temperature:+18.50 ºC,pressure:1004.76 hPa]
```

## Conclusion

[Kura Platform](http://www.eclipse.org/kura/) is a versatile framework capable of managing numerous IoT functionalities. In this article, we've explored how the **Kura Platform** can manage **I2C components** through the [Camel Framework](http://camel.apache.org), [Rhiot](http://rhiot.io), and the [DeviceIO](http://openjdk.java.net/projects/dio/) API.

The integration between these technologies provides a powerful solution for IoT applications, allowing for seamless communication between sensors, actuators, and cloud services. The DeviceIO API provides a standardized way to interact with hardware components, while Camel offers flexible routing and integration capabilities. Combined with Kura's cloud connectivity features, this stack enables robust IoT solutions that can operate even in environments with intermittent network connectivity.

Let's continue to develop and contribute to [Kura](http://www.eclipse.org/kura/), [Camel](http://camel.apache.org), and [Rhiot](http://rhiot.io) projects to further enhance the IoT ecosystem.

Stay tuned for more articles about *I2C components* and their integration with these frameworks!

Please feel free to send me your feedback — see [Apropos](/apropos/).

### Useful links

 * [rhiot projet](http://rhiot.io)
 * [camel-kura component](https://github.com/rhiot/rhiot/tree/master/gateway/components/camel-kura)
 * [camel-device-io component](https://github.com/rhiot/rhiot/tree/master/gateway/components/camel-device-io)
