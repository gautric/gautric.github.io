---
layout: post
css: blog
title:  "Device IO and i2cdetect implementation"
date:   2016-03-09 14:00:00
categories: ["blog"]
tags: ["en", "RaspberryPi", "DIO", "DeviceIO", "I2C", "API"]
#url: /blog/2016/03/09/rhiot-Device-IO-API-i2cdetect-impl.html
---

Today, we're going to implement a quick tool available on the RaspberryPi using Java [Device IO API](https://wiki.openjdk.java.net/display/dio/Main). The `i2cdetect` utility is a simple [I²C](https://en.wikipedia.org/wiki/I%C2%B2C) device scanner for your RaspberryPi that browses all I²C addresses to find which I²C devices are connected to your board. This tutorial demonstrates how to recompile the Device IO API and implement the `i2cdetect` functionality in Java, providing a platform-independent way to interact with I²C devices.

> i2cdetect with the Java Device I/O API implementation - a powerful tool for hardware detection and diagnostics on embedded systems.

### Requisites

* One [RaspberryPi](https://www.raspberrypi.org/products/raspberry-pi-2-model-b/)
  - tested with RPi B+
  - should work with all versions
* An I²C Device
  - [Sense Hat](https://www.raspberrypi.org/products/sense-hat/) for example, which includes multiple I²C sensors

### Compile Device IO

First, download the Device IO API source code and compile it. The Device IO API provides a standardized way to access hardware peripherals from Java applications.

```
rbpi> sudo apt-get install mercurial oracle-java-8
rbpi> hg clone http://hg.openjdk.java.net/dio/dev jdkdio
rbpi> cd jdkdio
```

We need to modify the Makefile to disable some low-level log information, which will make our output cleaner and more focused on the actual device detection:

```
diff -r ad12ae44e850 Makefile
--- a/Makefile	Mon Feb 29 19:06:11 2016 +0300
+++ b/Makefile	Tue Mar 15 16:06:07 2016 +0000
@@ -172,7 +172,7 @@
 JAVAC := $(JAVA_HOME)/bin/javac
 JAR := $(JAVA_HOME)/bin/jar
 MKDIR := mkdir -p
-TARGET_C_FLAGS = $(USER_C_FLAGS) -fPIC -Wno-psabi -DJAVACALL_REPORT_LEVEL=0 -DENABLE_DEVICEACCESS -c -MMD -MF $(NATIVE_OUT_DIR)/$(@).d
+TARGET_C_FLAGS = $(USER_C_FLAGS) -fPIC -Wno-psabi -DJAVACALL_REPORT_LEVEL=4 -DENABLE_DEVICEACCESS -c -MMD -MF $(NATIVE_OUT_DIR)/$(@).d
 TARGET_INCLUDES = $(foreach d,$(DIO_INCLUDE_DIRS),-I$(d)) -I$(JAVA_HOME)/include -I$(JAVA_HOME)/include/linux
 TARGET_CXX_FLAGS = $(USER_CXX_FLAGS) -fPIC -Wno-psabi -DJAVACALL_REPORT_LEVEL=4 -DENABLE_DEVICEACCESS -c
 TARGET_LD_FLAGS= $(USER_LD_FLAGS) -Xlinker -z -Xlinker defs -Xlinker -O1 \
```

You can now compile the Device IO API library with the following commands. Make sure your JAVA_HOME and PI_TOOLS environment variables are correctly set:

```
rbpi> export JAVA_HOME=/usr/lib/jvm/jdk-8-oracle-arm32-vfp-hflt
rbpi> export PI_TOOLS=/usr
rbpi> make
```

### Compile program

Now, we'll compile our `i2cdetect` Java implementation. This program will scan the I²C bus and display a table of all devices found, similar to the native Linux `i2cdetect` command but implemented in Java using the Device IO API.

<script src="https://gist.github.com/gautric/a239adfd06b51099c6a8.js"></script>

Download and compile the Java implementation:

```
rbpi> wget https://gist.githubusercontent.com/gautric/a239adfd06b51099c6a8/raw/93abe18ce83b311a97300c718732088bce370ae2/I2CDetect.java
rbpi> javac -cp /home/pi/jdkdio/build/jar/dio.jar I2CDetect.java
```

The I2CDetect.java file contains the implementation of our scanner, which uses the Device IO API to communicate with the I²C bus and detect connected devices.

### Output result

If everything is set up correctly, you can execute the `I2CDetect` class with the following command. For this demonstration, I've connected a [Sense Hat](https://www.raspberrypi.org/products/sense-hat/) to my RaspberryPi, which contains multiple I²C devices that should be detected by our program.

```
pi@rbpiv2-1:~ $ sudo java -Djava.library.path=/home/pi/jdkdio/build/so \
 -Djava.security.policy=/opt/eclipse/kura/kura/jdk.dio.policy \
 -cp .:/home/pi/jdkdio/build/jar/dio.jar \
 I2CDetect

     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:          -- -- -- -- -- -- -- -- -- -- -- -- --
10: -- -- -- -- -- -- -- -- -- -- -- -- 1c -- -- --
20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
40: -- -- -- -- -- -- UU -- -- -- -- -- -- -- -- --
50: -- -- -- -- -- -- -- -- -- -- -- -- 5c -- -- 5f
60: -- -- -- -- -- -- -- -- -- -- 6a -- -- -- -- --
70: -- -- -- -- -- -- -- --     
```

In this output, each detected device is shown by its I²C address. For example, we can see devices at addresses 0x1c, 0x46 (shown as UU because it's in use), 0x5c, 0x5f, and 0x6a. These correspond to the various sensors on the Sense Hat, such as the accelerometer, gyroscope, and temperature sensors.

### Conclusion

This sample demonstrates a Java implementation of the `i2cdetect` utility using the Device IO API. It provides a platform-independent way to scan for I²C devices connected to your RaspberryPi. While this is a basic implementation, it shows the potential of using Java for embedded hardware interaction.

There are still some aspects of the Device IO exception management that could be improved to make the code more robust. In a production environment, you would want to add more error handling and possibly a more user-friendly interface.

Please feel free to send me your feedback — see [Apropos](/apropos/).

### Useful links

 * [Device IO API](https://wiki.openjdk.java.net/display/dio/Main) - The official documentation for the Java Device IO API
 * [RaspberryPi](https://www.raspberrypi.org/) - Official RaspberryPi website
 * [I²C](https://en.wikipedia.org/wiki/I%C2%B2C) - Wikipedia article on the I²C communication protocol
 * [Sense Hat](https://www.raspberrypi.org/products/sense-hat/) - The RaspberryPi Sense Hat add-on board
