---
layout: post
css: blog
title:  "Apache Camel RaspberryPi PoC"
date:   2015-04-03 13:58:00
categories: ["blog"]
tags: ["en", "apache", "camel", "raspberry pi", "ProofOfConcept"]
#url: /blog/2015/04/03/apache-camel-raspberrypi-integration.html
---

# Integrating Apache Camel with Raspberry Pi for IoT Applications

The Internet of Things (IoT) revolution is transforming how we interact with the physical world through technology. At the heart of many IoT projects are two key components: affordable, capable hardware and flexible integration software. This article explores how to combine the popular Raspberry Pi single-board computer with Apache Camel, a powerful enterprise integration framework, to create IoT solutions that bridge the physical and digital worlds.

## Introduction to the Technologies

The Raspberry Pi is a remarkable credit card-sized computer that costs just $35. With over five million units sold worldwide, it has become incredibly popular among hobbyists, educators, and professional developers. While the primary goal of the Raspberry Pi Foundation was to provide an affordable computer for electronic and computer science education, many electronics enthusiasts like myself have adopted it for personal projects such as home automation, environmental monitoring, and other IoT applications.

Apache Camel, on the other hand, is a powerful Enterprise Integration Patterns (EIP) framework designed to connect, process, and route messages across various technologies and protocols. It provides a consistent API for integrating different systems, making it an ideal solution for IoT applications that need to communicate with multiple services and devices.

> **This post demonstrates Apache Camel and Raspberry Pi integration as a proof of concept, showing how enterprise integration patterns can be applied to physical computing.**

Let's examine both technologies in more detail before diving into our practical implementation.

### Raspberry Pi: Hardware for the Physical World

[Raspberry Pi](http://www.raspberrypi.org/) is a versatile single-board computer with numerous features that make it ideal for IoT projects:

<table>
<tr>
<td>
<img src="/img/raspberry_pi_logo.png" height="150" width="150" alt="Raspberry Pi Logo" />
</td>
<td>
<ul>
<li>Broadcom BCM2835 - ARM1176JZF-S 700 MHz processor</li>
<li>General Purpose Input/Output (GPIO) pins for connecting sensors and actuators</li>
<li>I2C / SPI protocols for interfacing with a wide range of electronic components</li>
<li>USB ports for connecting peripherals</li>
<li>HDMI port for display output</li>
<li>Audio output capabilities</li>
<li>Low power consumption, making it suitable for always-on applications</li>
</ul>
</td>
</tr>
</table>

### Apache Camel: Integration Framework for the Digital World

[Apache Camel](http://camel.apache.org/) is a robust integration framework with extensive capabilities:

<table>
<tr>
<td>
<img src="/img/apache-camel-logo.jpg" height="150" width="150" alt="Apache Camel Logo"/>
</td>
<td>
<ul>
<li>Java framework from <a href="http://www.apache.org/">The Apache Software Foundation</a></li>
<li>Support for numerous communication protocols:
  <ul>
    <li>HTTP, JMS, AMQP, MQTT (ideal for IoT)</li>
    <li>FTP, SSH, IMAP/POP, IRC, SMPP</li>
  </ul>
</li>
<li>Integration with multiple programming languages:
  <ul>
    <li>Groovy, XSLT, JavaScript, Python, PHP, XPath, etc.</li>
  </ul>
</li>
<li>Implementation of Enterprise Integration Patterns (EIP):
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

## Our Project: Building a Simple IoT Application

In this tutorial, we'll build a simple but practical IoT application that demonstrates the integration between Apache Camel and Raspberry Pi. We'll create two prototypes:

1. **Timer-Controlled LED**: A Camel route that uses a timer to toggle an LED on and off at regular intervals
2. **Button-Controlled LED**: A more interactive version where a physical button press triggers the LED to toggle

These examples will showcase how Camel can process both time-based events and physical input events to control hardware outputs, forming the foundation for more complex IoT applications.

## Prerequisites

To follow along with this tutorial, you'll need the following components:

* **A Raspberry Pi** ([Available for purchase here](http://www.raspberrypi.org/products/))
  * Tested with: Model B
  * Should be compatible with: Models A, A+, B+, and 2B
* **Raspbian OS** installed on your Raspberry Pi ([Download here](http://www.raspberrypi.org/downloads/))
* **Electronic components**:
  * 1 LED (any color)
  * 1 Momentary push button
  * 1 220 Ω (ohm) resistor for the LED
  * 4 Jumper wires
  * 1 Breadboard for prototyping

## Setting Up Your Raspberry Pi Hardware

{{< notice error >}}
**Safety Warning**: Always disconnect power from your Raspberry Pi before wiring any components. Double-check all connections before reconnecting power to avoid damaging your Raspberry Pi or components through short circuits or incorrect connections.
{{< /notice >}}

Follow this wiring diagram to set up your circuit:

![Raspberry Pi Wiring Diagram](/img/raspberrypi-camel-2.png)

The circuit consists of:
- An LED connected to GPIO pin 2 (physical pin 3) with a 220Ω resistor in series
- A push button connected to GPIO pin 1 (physical pin 12)

You can test your wiring with the [wiringpi](http://wiringpi.com) library to ensure everything is connected properly before proceeding with the Camel integration.

## Installing the Pi4J Library

To bridge Java with the Raspberry Pi's GPIO pins, we'll use the Pi4J library. This library provides a convenient Java API for controlling the GPIO pins on the Raspberry Pi.

Currently, only the 1.0-RC version is available directly for Raspberry Pi. Install it using the following commands:

```bash
$> ssh ${PI_USER}@${PI_HOST}
pi@rbpi> curl -s get.pi4j.com | sudo bash
```

{{< notice info >}}
**Tip**: For faster and more convenient connections to your Raspberry Pi, consider setting up SSH with Public/Private key authentication. This eliminates the need to enter your password each time you connect.
{{< /notice >}}

For more detailed information about Pi4J installation options and configurations, visit the [official Pi4J installation guide](http://pi4j.com/install.html#Installation).

## Compiling the Raspberry Pi Camel Component

{{< notice error >}}
**Note**: The camel-raspberry component used in this tutorial is still under development. Please feel free to test it and provide feedback. Some aspects may change in future versions, such as the URI format or available options.
{{< /notice >}}

It's more efficient to build the camel-raspberry component on your development computer rather than on the Raspberry Pi itself, as the Pi has limited processing power and compiling Java code can be time-consuming.

Follow these steps to checkout and build the component:

```bash
# Clone the repository
$> git clone https://github.com/camel-labs/camel-labs.git

# Navigate to the Raspberry Pi component directory
$> cd camel-labs/iot/components/camel-raspberrypi

# Build the component, skipping tests for faster compilation
$> mvn package -Praspberry -Dmaven.test.skip=true
```

{{< notice info >}}
The camel-raspberrypi component is currently maintained in the camel-labs repository and has not yet been merged into the main Apache Camel codebase.
{{< /notice >}}

## Creating the Test Application

Next, we need to create a simple Java application that will set up our Camel routes. Here's the code for our main class:

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

This program is designed to be flexible - it takes two command-line arguments:
1. The source endpoint URI (where messages come from)
2. The target endpoint URI (where messages go to)

It then creates a Camel route between these endpoints, with logging in between to help us see what's happening.

## Deploying to the Raspberry Pi

Now we need to copy the compiled JAR files and dependencies to the Raspberry Pi:

```bash
# Navigate to the component directory
$> cd components/camel-raspberrypi

# Create a directory on the Raspberry Pi
$> ssh ${PI_USER}@${PI_HOST} 'mkdir -p /home/pi/camel'

# Copy the JAR files
$> scp target/*.jar ${PI_USER}@${PI_HOST}:/home/pi/camel
```

## Configuring Logging

To help with debugging, we'll also need to set up proper logging. Create a `log4j.properties` file with the following content and copy it to the `/home/pi/camel` directory on your Raspberry Pi:

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

Our first prototype demonstrates how to use Camel's timer component to toggle an LED at regular intervals. This is a simple but effective way to show how Camel can control physical hardware through timed events.

### Architecture

<img src="/img/camel-timer.png" alt="Timer-controlled LED architecture diagram" style="max-width:100%;" />

The architecture consists of:
1. A Camel Timer component that generates a message every second
2. A Camel route that passes this message to the RaspberryPi GPIO component
3. The RaspberryPi GPIO component that toggles the LED connected to GPIO pin 2

### Running the Timer-LED Example

Connect to your Raspberry Pi and run the following command:

```bash
$> ssh ${PI_USER}@${PI_HOST}
pi@rbpi> pi4j -r com.github.camellabs.component.raspberrypi.CamelMain  \
        "timer://foo?fixedRate=true&repeatCount=60"  \
        "raspberrypi-gpio://2?action=TOGGLE&shutdownExport=true"
```

This command:
1. Uses the Pi4J wrapper to run our Java application
2. Creates a timer endpoint that fires every second for 60 times
3. Routes each timer event to GPIO pin 2 with the TOGGLE action
4. The `shutdownExport=true` parameter ensures the GPIO pin is properly released when the application exits

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

Our second prototype builds on the first one but replaces the timer with a physical button. This creates a more interactive IoT application where a user action (pressing the button) triggers a response (toggling the LED).

### Architecture

<img src="/img/camel-button.png" alt="Button-controlled LED architecture diagram" style="max-width:100%;" />

The architecture consists of:
1. A RaspberryPi GPIO consumer that listens for button presses on GPIO pin 1
2. A Camel route that passes button press events to the RaspberryPi GPIO producer
3. The RaspberryPi GPIO producer that toggles the LED connected to GPIO pin 2

### Running the Button-LED Example

Connect to your Raspberry Pi and run the following command:

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

## Conclusion: The Power of Combining Camel and Raspberry Pi

As demonstrated in our prototypes, integrating Apache Camel with Raspberry Pi creates a powerful platform for IoT development. This combination offers several key advantages:

1. **Simplified Integration**: Camel's extensive connectivity options make it easy to connect your Raspberry Pi to other systems and services using protocols like HTTP, MQTT, AMQP, and more.

2. **Enterprise-Grade Messaging**: Leverage Camel's robust message routing, transformation, and error handling capabilities in your IoT applications.

3. **Scalable Architecture**: Start with simple prototypes like our examples and scale to complex IoT solutions using the same technology stack.

4. **Future Expansion**: The Raspberry Pi can integrate with various electronic protocols such as I2C and SPI (which will be coming soon to the camel-raspberrypi component), enabling connections to a wide range of sensors and actuators.

### Potential Applications

This integration opens up possibilities for numerous IoT applications, including:

- **Home Automation**: Control lights, appliances, and other devices through various triggers
- **Environmental Monitoring**: Collect sensor data and route it to cloud services for analysis
- **Industrial Automation**: Create small-scale control systems with enterprise-grade integration
- **Data Collection**: Gather information from physical sensors and integrate it with business systems

The combination of Raspberry Pi's hardware capabilities and Apache Camel's integration framework creates a versatile platform for bridging the physical and digital worlds in your IoT projects.

*Raspberry Pi and Apache Camel together make a powerful combination for IoT development!*

## Additional Resources

* More information [about me](/apropos/)
* My colleague's blog: [Henryk Konsek](http://henryk-konsek.blogspot.fr/) (IoT, MQTT, etc.)
* [CAMEL-8567 JIRA issue](https://issues.apache.org/jira/browse/CAMEL-8567) - Track the progress of the Raspberry Pi component
* [GitHub Pull Request](https://github.com/apache/camel/pull/452) - See the code changes for the component
* [Pi4J library](http://pi4j.com) - Java library for Raspberry Pi GPIO
* [Raspberry Pi](http://raspberrypi.org) - Official Raspberry Pi website
* [Apache Camel](http://camel.apache.org) - Official Apache Camel website
