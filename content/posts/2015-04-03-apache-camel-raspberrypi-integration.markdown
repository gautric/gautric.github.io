---
title: "Apache Camel RaspberryPi PoC"
date: 2015-04-03 13:58:00
categories: ["blog"]
tags: ["en", "apache", "camel", "raspberry pi", "ProofOfConcept"]
---

# Integrating Apache Camel with Raspberry Pi for IoT

The Internet of Things (IoT) is reshaping how software interacts with the physical world. At the core of many IoT projects sit two building blocks: affordable hardware and flexible integration software. This article explores how to combine the **Raspberry Pi** with **Apache Camel**, an enterprise integration framework, to build IoT solutions bridging the physical and digital worlds.

## Introduction to the Technologies

The **Raspberry Pi** is a credit card-sized computer that costs $35. With over five million units sold, it has become a reference platform among hobbyists, educators, and professional developers. While the Raspberry Pi Foundation's primary goal was to provide an affordable computer for education, many electronics enthusiasts have adopted it for home automation, environmental monitoring, and other IoT applications.

**Apache Camel** is an **Enterprise Integration Patterns** (EIP) framework designed to connect, process, and route messages across various technologies and protocols. It provides a consistent API for integrating different systems, making it well suited for IoT applications that need to communicate with multiple services and devices.

> **This post demonstrates Apache Camel and Raspberry Pi integration as a proof of concept, showing how enterprise integration patterns can be applied to physical computing.**

### Raspberry Pi: Hardware for the Physical World

[Raspberry Pi](http://www.raspberrypi.org/) is a versatile single-board computer with features well suited for IoT:

<table>
<tr>
<td>
<img src="/img/2015-04-03-apache-camel-raspberrypi/raspberry-pi-logo.png" height="150" width="150" alt="Raspberry Pi Logo" />
</td>
<td>
<ul>
<li>Broadcom BCM2835 - ARM1176JZF-S 700 MHz processor</li>
<li>General Purpose Input/Output (**GPIO**) pins for connecting sensors and actuators</li>
<li>**I2C** / **SPI** protocols for interfacing with electronic components</li>
<li>USB ports for peripherals</li>
<li>HDMI port for display output</li>
<li>Audio output</li>
<li>Low power consumption, suitable for always-on applications</li>
</ul>
</td>
</tr>
</table>

### Apache Camel: Integration Framework for the Digital World

[Apache Camel](http://camel.apache.org/) is a robust integration framework:

<table>
<tr>
<td>
<img src="/img/2015-04-03-apache-camel-raspberrypi/apache-camel-logo.jpg" height="150" width="150" alt="Apache Camel Logo"/>
</td>
<td>
<ul>
<li>Java framework from <a href="http://www.apache.org/">The Apache Software Foundation</a></li>
<li>Support for numerous communication protocols:
  <ul>
    <li>HTTP, JMS, AMQP, **MQTT** (ideal for IoT)</li>
    <li>FTP, SSH, IMAP/POP, IRC, SMPP</li>
  </ul>
</li>
<li>Integration with multiple languages:
  <ul>
    <li>Groovy, XSLT, JavaScript, Python, PHP, XPath, etc.</li>
  </ul>
</li>
<li>Implementation of **Enterprise Integration Patterns** (EIP):
  <ul>
    <li>Message routing, wiretap, logging, dispatching</li>
    <li>Broadcasting, dead letter channels, splitters, etc.</li>
  </ul>
</li>
<li>Declarative configuration through Java DSL or XML</li>
</ul>
</td>
</tr>
</table>


## The Project: Building a Simple IoT Application

This proof of concept demonstrates the integration between Apache Camel and Raspberry Pi through two prototypes:

1. **Timer-Controlled LED**: a Camel route using a timer to toggle an LED at regular intervals
2. **Button-Controlled LED**: a physical button press triggers the LED toggle

These examples showcase how Camel can process both time-based events and physical input events to control hardware outputs.

## Prerequisites

Required components:

* **A Raspberry Pi** ([available here](http://www.raspberrypi.org/products/))
  * Tested with: Model B
  * Compatible with: Models A, A+, B+, and 2B
* **Raspbian OS** ([download](http://www.raspberrypi.org/downloads/))
* **Electronic components**:
  * 1 LED (any color)
  * 1 momentary push button
  * 1 220 Ω resistor for the LED
  * 4 jumper wires
  * 1 breadboard

## Setting Up the Hardware

{{< notice error >}}
**Safety Warning**: Always disconnect power before wiring. Double-check all connections before reconnecting to avoid damaging the Raspberry Pi or components.
{{< /notice >}}

Wiring diagram:

![Raspberry Pi Wiring Diagram](/img/2015-04-03-apache-camel-raspberrypi/wiring-diagram.png)

The circuit consists of:
- An LED connected to **GPIO pin 2** (physical pin 3) with a 220Ω resistor in series
- A push button connected to **GPIO pin 1** (physical pin 12)

The wiring can be tested with the [wiringpi](http://wiringpi.com) library before proceeding with the Camel integration.

## Installing the Pi4J Library

**Pi4J** bridges Java with the Raspberry Pi's GPIO pins. Currently, only the 1.0-RC version is available directly for Raspberry Pi:

```bash
$> ssh ${PI_USER}@${PI_HOST}
pi@rbpi> curl -s get.pi4j.com | sudo bash
```

{{< notice info >}}
Setting up SSH with Public/Private key authentication eliminates the need to enter a password on each connection.
{{< /notice >}}

For more details, visit the [Pi4J installation guide](http://pi4j.com/install.html#Installation).

## Compiling the Raspberry Pi Camel Component

{{< notice error >}}
The camel-raspberry component is still under development. Some aspects may change in future versions (URI format, available options).
{{< /notice >}}

Building on a development machine is more efficient than on the Raspberry Pi itself:

```bash
# Clone the repository
$> git clone https://github.com/camel-labs/camel-labs.git

# Navigate to the Raspberry Pi component directory
$> cd camel-labs/iot/components/camel-raspberrypi

# Build the component, skipping tests for faster compilation
$> mvn package -Praspberry -Dmaven.test.skip=true
```

{{< notice info >}}
The camel-raspberrypi component is maintained in the camel-labs repository and has not yet been merged into the main Apache Camel codebase.
{{< /notice >}}

## Creating the Test Application

A simple Java application sets up the Camel routes:

```java
package com.github.camellabs.component.pi4j;

import org.apache.camel.CamelContext;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.impl.DefaultCamelContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A simple application to run RaspberryPi Camel routes
 */
public final class CamelMain {

    private static final Logger LOG = LoggerFactory.getLogger(CamelMain.class);

    private CamelMain() {
    }

    /**
     * Route builder that creates a route from command line arguments
     */
    public static class CommandLineRouteBuilder extends RouteBuilder {

        String[] args;

        CommandLineRouteBuilder(String[] args) {
            this.args = args;
        }

        @Override
        public void configure() throws Exception {
            // Create a route from the first argument to the second argument
            // with logging in between
            from(args[0]).id("raspberrypi-route").to(Pi4jConstants.LOG_COMPONENT).to(args[1]);
        }
    }

    public static void main(String[] args) throws Exception {
        LOG.info("main");

        // Log the command line arguments
        for (int i = 0; i < args.length; i++) {
            LOG.info("args[" + i + "] =" + args[i]);
        }

        // Create and configure the Camel context
        CamelContext context = new DefaultCamelContext();
        context.addRoutes(new CommandLineRouteBuilder(args));

        // Start the Camel context and let it run for 10 minutes
        context.start();
        Thread.sleep(600000);
        context.stop();
        System.exit(0);
    }
}
```

The program takes two command-line arguments:
1. The source endpoint URI (where messages come from)
2. The target endpoint URI (where messages go to)

A Camel route is created between these endpoints, with logging in between.

## Deploying to the Raspberry Pi

Copy the compiled JAR files and dependencies to the Raspberry Pi:

```bash
# Navigate to the component directory
$> cd components/camel-raspberrypi

# Create a directory on the Raspberry Pi
$> ssh ${PI_USER}@${PI_HOST} 'mkdir -p /home/pi/camel'

# Copy the JAR files
$> scp target/*.jar ${PI_USER}@${PI_HOST}:/home/pi/camel
```

## Configuring Logging

A `log4j.properties` file is needed in `/home/pi/camel` on the Raspberry Pi:

```properties
#
# The logging properties used
#
log4j.rootLogger=INFO, out

# uncomment the following line to turn on Camel debugging
#log4j.logger.org.apache.camel=DEBUG
log4j.logger.org.pi4j=ALL
log4j.logger.com.github.camellabs.component.raspberrypi=ALL

# CONSOLE appender not used by default
log4j.appender.out=org.apache.log4j.ConsoleAppender
log4j.appender.out.layout=org.apache.log4j.PatternLayout
log4j.appender.out.layout.ConversionPattern=%d{ISO8601} [%30.30t] %-30.30c{1} %-5p %m%n
#log4j.appender.out.layout.ConversionPattern=%d [%-15.15t] %-5p %-30.30c{1} - %m%n
```

## Prototype 1: Timer-Controlled LED

The first prototype uses Camel's **timer component** to toggle an LED at regular intervals.

### Architecture

<img src="/img/2015-04-03-apache-camel-raspberrypi/architecture-timer-led.png" alt="Timer-controlled LED architecture diagram" style="max-width:100%;" />

The flow:
1. A **Camel Timer** generates a message every second
2. The Camel route passes this message to the **RaspberryPi GPIO component**
3. The GPIO component toggles the LED on **GPIO pin 2**

### Running the Timer-LED Example

```bash
$> ssh ${PI_USER}@${PI_HOST}
pi@rbpi> pi4j -r com.github.camellabs.component.raspberrypi.CamelMain  \
        "timer://foo?fixedRate=true&repeatCount=60"  \
        "raspberrypi-gpio://2?action=TOGGLE&shutdownExport=true"
```

This command creates a timer endpoint firing every second for 60 iterations, routing each event to GPIO pin 2 with the TOGGLE action. The `shutdownExport=true` parameter ensures the GPIO pin is released on exit.

### Video Demonstration: Timer-Controlled LED

<iframe width="560" height="315" src="https://www.youtube.com/embed/wxyPC5cbZrM?t=15s" frameborder="0" title="Video demonstration of timer-controlled LED"></iframe>

### Command Line Execution

<iframe width="560" height="315" src="https://www.youtube.com/embed/0BtJDWUMOjc" frameborder="0" title="Video showing command line execution of the timer example"></iframe>

### Understanding the Console Output

When you run the timer example, you'll see detailed logs showing:
- The Camel context starting up
- Timer events being generated
- Messages flowing through the route
- The GPIO pin being toggled

Here's a snippet of the console output:

```log
2015-03-31 19:53:51,863 [                          main] CamelMain                      INFO  main
2015-03-31 19:53:51,881 [                          main] CamelMain                      INFO  args[0] =timer://foo?fixedRate=true&repeatCount=600
2015-03-31 19:53:51,882 [                          main] CamelMain                      INFO  args[1] =raspberrypi-gpio://2?action=TOGGLE&shutdownExport=true
2015-03-31 19:53:55,306 [                          main] DefaultCamelContext            INFO  Apache Camel 2.16-SNAPSHOT (CamelContext: camel-1) is starting
...
2015-03-31 19:54:07,283 [mel-1) thread #0 - timer://foo] RaspberryPiProducer            DEBUG Exchange[Message: [Body is null]]
2015-03-31 19:54:07,285 [mel-1) thread #0 - timer://foo] RaspberryPiProducer            TRACE action= TOGGLE
```

## Prototype 2: Button-Controlled LED

The second prototype replaces the timer with a physical button, creating an interactive application where a user action triggers a hardware response.

### Architecture

<img src="/img/2015-04-03-apache-camel-raspberrypi/architecture-button-led.png" alt="Button-controlled LED architecture diagram" style="max-width:100%;" />

The flow:
1. A **GPIO consumer** listens for button presses on GPIO pin 1
2. The Camel route passes button press events to the **GPIO producer**
3. The GPIO producer toggles the LED on GPIO pin 2

### Running the Button-LED Example

```bash
$> ssh ${PI_USER}@${PI_HOST}
pi@rbpi> pi4j -r com.github.camellabs.component.raspberrypi.CamelMain  \
        "raspberrypi-gpio://1?mode=DIGITAL_INPUT&state=HIGH" \
        "raspberrypi-gpio://2?action=TOGGLE"
```

This command:
1. Creates a GPIO input endpoint that listens for HIGH state events on pin 1 (button presses)
2. Routes each button press event to GPIO pin 2 with the TOGGLE action
3. When the button is pressed, the LED will toggle between on and off states

### Video Demonstration: Button-Controlled LED

<iframe width="560" height="315" src="https://www.youtube.com/embed/Q-r8AP9q6tE" frameborder="0" title="Video demonstration of button-controlled LED"></iframe>

### Command Line Execution

<iframe width="560" height="315" src="https://www.youtube.com/embed/wufbxNkXx7s" frameborder="0" title="Video showing command line execution of the button example"></iframe>

### Understanding the Console Output

When you run the button example, you'll see detailed logs showing:
- The Camel context starting up
- The GPIO consumer listening for button events
- Button press events being detected
- Messages flowing through the route
- The GPIO pin being toggled

Here's a snippet of the console output:

```log
2015-03-31 20:09:15,667 [               pool-1-thread-1] RaspberryPiConsumer            DEBUG GpioEvent pin GPIO 1, event DIGITAL_STATE_CHANGE, state HIGH
2015-03-31 20:09:16,089 [               pool-1-thread-1] raspberrypi                    INFO  Exchange[
, Id: ID-rbpi7-46433-1427832539336-0-2
, ExchangePattern: InOnly
, Properties: {CamelCreatedTimestamp=Tue Mar 31 20:09:15 UTC 2015, CamelMessageHistory=[DefaultMessageHistory[routeId=raspberry-pi, node=to1]], CamelToEndpoint=log://org.apache.camel.component.raspberrypi?multiline=true&showAll=true}
, Headers: {breadcrumbId=ID-rbpi7-46433-1427832539336-0-1, CamelPi4j.pin="GPIO 1" <GPIO 1>, CamelPi4j.pinState=HIGH, CamelPi4j.pinType=DIGITAL_STATE_CHANGE}
, BodyType: com.pi4j.io.gpio.event.GpioPinDigitalStateChangeEvent
, Body: com.pi4j.io.gpio.event.GpioPinDigitalStateChangeEvent[source=com.pi4j.io.gpio.RaspiGpioProvider@aa952c]
, Out: null:
]
2015-03-31 20:09:16,152 [               pool-1-thread-1] RaspberryPiProducer            DEBUG Exchange[Message: com.pi4j.io.gpio.event.GpioPinDigitalStateChangeEvent[source=com.pi4j.io.gpio.RaspiGpioProvider@aa952c]]
2015-03-31 20:09:16,153 [               pool-1-thread-1] RaspberryPiProducer            TRACE action= TOGGLE
```

Notice how the consumer detects both the button press (HIGH state) and release (LOW state), but only processes the HIGH state events as configured.

## Conclusion

Integrating **Apache Camel** with **Raspberry Pi** creates a solid platform for IoT development:

| **Criteria** | **Benefit** |
|---|---|
| **Integration** | Camel's connectivity options (HTTP, MQTT, AMQP, etc.) connect the Raspberry Pi to external systems |
| **Messaging** | Camel's routing, transformation, and error handling apply to IoT applications |
| **Scalability** | Simple prototypes scale to complex solutions using the same stack |
| **Extensibility** | I2C and SPI support (coming soon) enables connections to a wide range of sensors and actuators |

Potential applications include home automation, environmental monitoring, industrial control systems, and sensor data collection integrated with business systems.

## Additional Resources

* More information [about me](/apropos/)
* Colleague's blog: [Henryk Konsek](http://henryk-konsek.blogspot.fr/) (IoT, MQTT, etc.)
* [CAMEL-8567 JIRA issue](https://issues.apache.org/jira/browse/CAMEL-8567) — Track the Raspberry Pi component progress
* [GitHub Pull Request](https://github.com/apache/camel/pull/452) — Code changes for the component
* [Pi4J library](http://pi4j.com)
* [Raspberry Pi](http://raspberrypi.org)
* [Apache Camel](http://camel.apache.org)