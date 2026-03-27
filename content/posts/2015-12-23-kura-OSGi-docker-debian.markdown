---
layout: post
css: blog
title:  "Kura over Docker"
date:   2015-12-23 14:00:00
categories: ["blog"]
tags: ["en", "Kura", "Docker"]
#url: /blog/2015/12/23/kura-OSGi-docker-debian.html
---

[Rhiot project](http://rhiot.io) has recently decided to primarily support the [Kura Eclipse Platform](https://eclipse.org/kura/). Our project provides code and extensions for Kura, such as Camel integration and many other features. We've developed new Camel components specifically dedicated to the Kura Platform (gpio, cloud, wifi). We chose this platform because it's an OSGi compliant software focused on the IoT universe, supported by the [Eclipse Foundation](http://eclipse.org) and [Eurotech](https://www.eurotech.com).

While Kura runs natively on RaspberryPi hardware, if you don't have a RaspberryPi device yet, this tutorial will show you how to run Kura within a [Docker](https://docker.com) container.

In this post we will see:

> How to use Kura with Docker in an almost real environment, allowing you to explore and develop for the platform without physical IoT hardware.

## Requisites

* [Docker](https://docker.com) installation
  - This example uses Mac, but similar steps apply to other platforms
* Your preferred terminal application

## Docker

### Docker Setup

First of all, you need to set up your Docker environment. Docker's documentation is very straightforward and easy to follow.
Just follow the correct documentation for your architecture (Linux or macOS).

```bash
docker-machine start default
eval "$(docker-machine env default)"
```

## Build Kura-Debian Image

After starting the Docker machine, we will build our debian-kura image.
We'll download the Dockerfile and run the appropriate command to build it.

<script src="https://gist.github.com/gautric/3eed453c8ae313cb7112.js"></script>

Just build it via the command below:

```bash
curl https://gist.githubusercontent.com/gautric/3eed453c8ae313cb7112/raw/98c9665523a1dca7469c411c08e13ad6da73689b/Dockerfile -O
docker build -t debian-kura .
```

You should get an output like this:

```
Successfully built aabbccddee0011
```

## Run Kura-Debian Image

Now if everything went well, we can run it via the commands below:

```bash
docker run -i -p 80:80 -t debian-kura
```

Or alternatively, you can use the pre-built image from Docker Hub:

```bash
docker run -i -p 80:80 -t gautric/debian-kura
```

You can change `-i` to `-d` to run the image in daemon mode.

If everything is working correctly, you should see the `osgi>` prompt.
Now, you can use and deploy the Kura Platform as you wish.

If you are on macOS, access the web interface at: <http://192.168.99.100>
If you are on Linux, <http://127.0.0.1> should work well.

<img src="/img/2015-12-23-kura-docker/kura-web-interface.png" width="66%" height="66%" />

## Important Note

We are running the Kura Platform in a Docker environment. This means you cannot access low-level APIs like GPIO and other hardware-specific features.
However, this setup is sufficient to start a quick sample project and explore the Kura platform's capabilities.

## Conclusion

Even though we're running Kura in a Docker environment with some limitations, you can still use this OSGi Platform to learn and develop applications.
Just be aware that some low-level APIs cannot be used directly. [Soon I will demonstrate how to use these features in a real RaspberryPi environment](/blog/2015/12/23/kura-OSGi-docker-debian.html).

Stay tuned for more updates!

Please feel free to send me your feedback below, via the [Apropos](/apropos/) page, or through the [Contact form](/contact/).

### Useful Links

* [Kura Eclipse Platform documentation](http://eclipse.github.io/kura/)
* [Docker documentation](https://docs.docker.com/)
* [Rhiot project](http://rhiot.io)
