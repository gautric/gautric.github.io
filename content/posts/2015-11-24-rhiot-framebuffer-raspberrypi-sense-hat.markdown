---
title: "RHIoT RaspberryPi Sense-Hat display"
date: 2015-11-24 13:58:00
categories: ["blog"]
tags: ["en", "rhiot", "RaspberryPi", "Sense-Hat", "camel", "display", "framebuffer"]
---

Recently, I bought the new official [Sense-HAT](https://www.raspberrypi.org/products/sense-hat/) from [RaspberryPi foundation](https://www.raspberrypi.org). This [HAT](https://www.raspberrypi.org/blog/introducing-raspberry-pi-hats/) (Hardware Attached on Top) add-on for the RaspberryPi device includes lots of cool features and sensors. The Sense-HAT comes with an 8x8 RGB565 pixel display, a Joystick, a Gyroscope, Accelerometer, Magnetometer, Temperature, Barometric pressure and Humidity sensors. 

All sensors are i2c compliant, making them easily accessible with the [rhiot camel-pi4j](https://github.com/rhiot/rhiot/tree/master/docs#i2c-driver) component. This makes it very straightforward to retrieve data from all sensors and transmit them to external systems. The Rhiot team has also developed the first implementation of the [rhiot camel-framebuffer component](https://github.com/rhiot/rhiot/tree/master/components/camel-framebuffer), which now enables pushing images directly to the 8x8 pixel screen. Note that the matrix consists of 8x8 RGB565 LEDs (2 bytes per pixel), providing a colorful display despite its small size.

> How to use Framebuffer component

Let's start to use the SenseHat framebuffer with a practical example.

## Requisites

* One [RaspberryPi](https://www.raspberrypi.org/products/raspberry-pi-2-model-b/) (tested with RPi 2)
* One [SenseHat](https://www.raspberrypi.org/products/sense-hat/)
* An ActiveMQ Broker for message passing
* A laptop to run the generator program

## Conception

Here's a quick architectural overview of our demonstration:

* The first program generates images and sends them through the ActiveMQ broker.
* The second program receives these images from the broker and pushes them to the Framebuffer on the SenseHat.

This approach allows for remote control of the display, with the image generation happening on a separate system from the display itself.

## Groovy Program

### Generator Program

This program runs on your laptop and generates images to send to the SenseHat:

<script src="https://gist.github.com/gautric/0cb319481b24f405aa5b.js"></script>

### Framebuffer Program

This program runs on the RaspberryPi and displays the received images on the SenseHat:

<script src="https://gist.github.com/gautric/e413a22b9644de88a15b.js"></script>

## Execution

Let's run both programs to see the system in action.

### On our RaspberryPi 2 with SenseHat

```bash
[rbpi-2:~]$> groovy ImageFramebufferRoute.groovy
```

### On our Laptop

```bash
[mbp:~/Source/tmp/io/rhiot/test]$> groovy GroovyMain.groovy
```

## And the result

The result is a dynamic display on the SenseHat's LED matrix, controlled remotely through ActiveMQ messages.

**YouTube Demo**

<iframe width="650" height="415" src="https://www.youtube.com/embed/y3yAzqezXE4" frameborder="0" ></iframe>

## Conclusion

The [Framebuffer component](https://rhiot.gitbooks.io/rhiotdocumentation/content/gateway/camel_components/camel_framebuffer_component.html) is very young but already functional. The [Rhiot.io](http://rhiot.github.io/) project will release new features as soon as possible to enhance its capabilities.

Rhiot.io project already provides [drivers](https://rhiot.gitbooks.io/rhiotdocumentation/content/gateway/camel_components/camel_pi4j_component.html#i2c-driver) for Temperature, Barometric pressure and Humidity sensors shipped with the SenseHat product. The Gyroscope, Accelerometer, and Magnetometer drivers are still under development at the time of writing, but should be available soon.

This example demonstrates how easily IoT devices can be integrated into messaging systems using Apache Camel and Rhiot components, enabling remote control and monitoring of hardware peripherals.

Stay tuned for more updates from the Rhiot project!

### Useful links

* [Rhiot project](http://rhiot.io)
* [Framebuffer component documentation](https://rhiot.gitbooks.io/rhiotdocumentation/content/gateway/camel_components/camel_framebuffer_component.html)
* [SenseHat official documentation](https://www.raspberrypi.org/products/sense-hat/)
* [Apache Camel](https://camel.apache.org/)
