---
title: "Rhiot over Kura over Docker over RaspberryPi ;-)"
date: 2015-12-28 14:00:00
categories: ["blog"]
tags: ["en", "Rhiot", "Kura", "Docker", "RaspberryPi"]
---

During this Christmas day, Santa Claus brings us lot of presents (I hope for you too), I received 2 [RaspberryPi Zero](https://www.raspberrypi.org/blog/raspberry-pi-zero/) — thanks brother! I will show you something interesting after this special day. We gonna test how to use [Rhiot project](http://rhiot.io) into [Kura Eclipse Platform](https://eclipse.org/kura/) running inside [Docker](https://docker.com) container deployed into a real [RaspberryPi Zero](https://www.raspberrypi.org/blog/raspberry-pi-zero/) device (in this order). If you don't have yet a RaspberryPi (B+, 2 or zero) device you can use [my previous post](/blog/2015/12/23/kura-OSGi-docker-debian.html).

In this post we will see how to integrate multiple IoT technologies in a layered approach, combining the power of Rhiot's IoT capabilities with Kura's OSGi-based platform, all containerized with Docker and running on the compact RaspberryPi hardware.

> How to use Rhiot/Kura into Docker/RaspberryPi

## Requisites

* [RaspberryPi](https://www.raspberrypi.org/) device
  - tested with Zero and B+ models
  - for other models you have to rebuilt docker image
* [Docker](https://docker.com) installation into Raspbian/Jessie or directly with [Hypriot](http://blog.hypriot.com/downloads/)
  - tested with both of these OS
* Two LED
* Two Resistor 220Ω
* Wires
* USB to Serial Cable
  - RaspberryPi Zero doesn't have too many ports
  - I used [PL-2303 USB-to-Serial Bridge Controller](https://www.adafruit.com/product/954)

## Docker

### Docker setup

First of all, you have to startup your Docker environment.
I prefer use `Hypriot` because Docker is already installed. [More information to install Hypriot](http://blog.hypriot.com/getting-started-with-docker-and-linux-on-the-raspberry-pi/)

If docker is not yet installed (Raspbian/Jessie Only):
```bash
wget http://downloads.hypriot.com/docker-hypriot_1.9.1-1_armhf.deb
sudo dpkg -i docker-hypriot_1.9.1-1_armhf.deb
```

If docker is not started:
```bash
sudo service docker start
```

### Build rpi-rhiot Image and take a coffee ...

We gonna download docker file, and run correct command to built it.

{{< notice warning >}}
Please change RPI_VERSION with your correct RaspberryPi model
{{< /notice >}}

`RPI_VERSION` must be: `raspberry-pi-2-nn` or `raspberry-pi-bplus-nn` or `raspberry-pi-nn`. `nn` means Kura will not include network management (firewall, port, etc...), keep it cause we can ignore network management for a Docker environment.

<script src="https://gist.github.com/gautric/dbe4684a6b17186afe42.js"></script>

We download some helper scripts and files to prepare our Docker build environment:

```bash
mkdir rpi-rhiot
cd rpi-rhiot
curl https://gist.githubusercontent.com/gautric/dbe4684a6b17186afe42/raw/4aa24e22016e49b0982264845b7fe7e0311a3952/Dockerfile -O
curl https://raw.githubusercontent.com/rhiot/rhiot/master/dockerfiles/rpi-rhiot/config.ini.sh -O
curl https://raw.githubusercontent.com/rhiot/rhiot/master/dockerfiles/rpi-rhiot/log4j.properties -O
curl https://raw.githubusercontent.com/rhiot/rhiot/master/dockerfiles/rpi-rhiot/start_kura_rhiot.sh -O
sudo docker build -t rpi-rhiot .
```

Just build it via commands above

**Now it is coffee time, let's build docker image**

You should get an output like this after a while to compile Rhiot Docker image.

```
pi@rbpiz1:~/rpi-rhiot $ sudo docker build -t rpi-rhiot .
Sending build context to Docker daemon 12.29 kB
Step 1 : FROM resin/rpi-raspbian:jessie
 ---> e97a8531a526
Step 2 : MAINTAINER Greg AUTRIC <gautric@redhat.com>
 ---> Using cache
 ---> 9f6d3dedf04a
Step 3 : ENV CAMEL_VERSION ${CAMEL_VERSION:-2.16.1}
 ---> Using cache
 ---> 5695c4034847
Step 4 : ENV RHIOT_VERSION ${RHIOT_VERSION:-0.1.3}
 ---> Using cache
 ---> 91fb37b40966
Step 5 : ENV JAVA_VERSION ${JAVA_VERSION:-7}
 ---> Using cache
 ---> 5ce6f2fd7edd
Step 6 : ENV KURA_VERSION ${KURA_VERSION:-1.3.0}
 ---> Using cache
 ---> 413de7f8e993
Step 7 : ENV RPI_VERSION ${RPI_VERSION:-raspberry-pi-bplus-nn}
 ---> Using cache
 ---> a584f9145729

... OMIT ...

Step 32 : RUN ${RHIOT_BIN_FOLDER}/config.ini.sh
 ---> Using cache
 ---> 14deb381475f
Step 33 : EXPOSE 80
 ---> Using cache
 ---> b5dc47bd7f51
Step 34 : EXPOSE 5002
 ---> Using cache
 ---> c95b9d1593bc
Step 35 : CMD ${RHIOT_BIN_FOLDER}/start_kura_rhiot.sh
 ---> Using cache
 ---> 4d0e0a16f2c8
Successfully built 4d0e0a16f2c8
```

### or Pull rpi-rhiot Image and take a coffee too

An other option is to pull image I've already built and pushed to Docker Hub. This can save you significant build time if you're using a compatible RaspberryPi model.

{{< notice warning >}}
RaspberryPi B+ and Zero model only
{{< /notice >}}
{{< notice warning >}}
This image may be change soon
{{< /notice >}}

```bash
docker pull gautric/rpi-rhiot
```

## Compile and upload Rhiot quickstart

You have to compile and upload the Rhiot quickstart project to get the necessary JAR file:

```bash
git clone git@github.com:rhiot/quickstarts.git
cd quickstarts/kura-camel
git checkout kura-gpio
mvn clean package
```

and copy `target/rhiot-kura-camel-1.0.0-SNAPSHOT.jar` to your RaspberryPi Zero

```bash
scp target/rhiot-kura-camel-1.0.0-SNAPSHOT.jar pi@{RPIz_IP_ADDR}:
```

### Wire, LED, RaspberryPi

Follow schema below *(RaspberryPi B+, 2, Zero use same pin layout)*

<img src="/img/2015-12-28-rhiot-kura-docker-raspberrypi/wiring-schema-raspberrypi.png" style="max-width:80%;" />

## Run rpi-rhiot Image

Now if everything goes well, we can run it via commands below:
```bash
sudo docker run -d --privileged --cap-add=ALL \
           -v /dev:/dev \
           -v /lib/modules:/lib/modules \
           -v `pwd`:/opt/rhiot/plugins \
           -p 80:80 \
           -t rpi-rhiot                       ## or gautric/rpi-rhiot
```

You can change `-d` to `-i` to run image into interactive mode.

`start_kura_rhiot.sh` script (into Dockerfile) injects all **`pwd`/*.jar** into Kura `config.ini` file.
Kura platform will include them into the boot time.

Now, you can use and deploy Kura Platform as you want.

Just connect to Kura Web admin console via <http://RPIz_IP_ADDR/kura>. You can manage some Kura configuration (Cloud, Clock, Timer, Bundle, etc...).
Change gpio id/action/period as you want.

<img src="/img/2015-12-28-rhiot-kura-docker-raspberrypi/docker-rhiot-running.png" width="75%" height="66%" />

## Debug rpi-rhiot Image

If you need retrieve Rhiot Project and Kura platform log.
Please use following commands:

```bash
pi@rbpiz1:~ $ sudo docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                          NAMES
00aa11bbccddeeff        gautric/rpi-rhiot   "/bin/sh -c ${RHIOT_B"   4 hours ago         Up 4 hours          0.0.0.0:80->80/tcp, 5002/tcp   jolly_almeida
pi@rbpiz1:~ $ sudo docker logs -f 00aa11bbccddeeff
```

## VIDEO

<iframe width="650" height="415" src="https://www.youtube.com/embed/NXNyk9wlWmg" frameborder="0" ></iframe>

### NB

Even if we are running Kura Platform into Docker env, we use extra Docker parameters to access to low level Memory and RaspberryPi API (like GPIO in this sample). I2C and SPI should work too. Stay tuned !!!

## Conclusion

Now, you can use **Rhiot Project** over **Kura OSGi Platform** into **Docker** environment as you want, you can call low level api directly. Both development and deployment will be accelerated by using this kind of tech/idea.
[Docker](https://docker.com/) project proves one more time its flexibility and robustness applied into IoT universe. I think [Kura platform](http://eclipse.github.io/kura/) could use it for its own development and strategy. [Rhiot project](http://rhiot.io)'s team is already convinced about it ;-)

Please feel free to send me your feedback below, via the [Apropos](/apropos/) page, or through the [Contact form](/contact/).

### Useful links

 * [Rhiot quickstart (kura-gpio branch)](https://github.com/rhiot/quickstarts/tree/kura-gpio/kura-camel)
 * [Hypriot get physical](http://blog.hypriot.com/post/lets-get-physical/)
 * [Kura Eclipse Platform documentation](http://eclipse.github.io/kura/)
 * [Docker documentation](https://docs.docker.com/)
 * [Rhiot project](http://rhiot.io)
