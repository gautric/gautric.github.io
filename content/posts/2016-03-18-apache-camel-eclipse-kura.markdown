---
layout: post
css: blog
title:  "Camel is going into Eclipse Kura"
date:   2016-03-18 14:00:00
categories: ["blog"]
tags: ["en", "Eclipse", "Kura", "Camel"]
#url: /blog/2016/03/18/apache-camel-eclipse-kura.html
---

Today, I am going to talk about some exciting news in the IoT development world. This is a technical post, but without any code samples or hardware setup instructions (thankfully). The [Eclipse Kura Project](http://www.eclipse.org/kura/) has accepted a [GitHub Pull Request](https://github.com/eclipse/kura/pull/72) that introduces a powerful new component to the `develop` branch. This new component is the [Camel Framework](http://camel.apache.org) from the [Apache Foundation](http://apache.org/).

[Henryk Konsek](https://about.me/hekonsek), a talented colleague of mine, is the principal developer behind this integration. The relationship between Camel and Kura actually began earlier with the first [Camel Kura component](http://camel.apache.org/kura.html), which has been available since Camel version 2.15, also developed by Henryk.

I have a deep appreciation for both Eclipse Kura and Apache Camel platforms. Eclipse Kura is an OSGi-compliant platform with excellent modularity, making it deployable on resource-constrained devices like the Raspberry Pi. The platform comes with numerous pre-integrated components for GPIO interaction, cloud connectivity, data storage, and more. Additionally, it handles critical aspects such as security (TLS, X509 certificates), configuration management, upgrade procedures, and provides a web-based management interface.

Apache Camel, on the other hand, stands as the Java reference implementation for Open Source [Enterprise Integration Patterns (EIP)](http://www.enterpriseintegrationpatterns.com/). It excels when you need to connect various services together (HTTP, JMS, MQ, File systems) and require capabilities to transform, compute, re-inject, or route messages between these services.

I firmly believe this integration will create new opportunities for both Eclipse Kura and Apache Camel contributors, developers, and architects to design, build, and deploy innovative projects and proofs of concept in the rapidly expanding IoT domain. The combination of Kura's device management capabilities with Camel's integration prowess creates a powerful toolkit for IoT solutions.

Please feel free to send me your feedback - see the [Apropos](/apropos/) page for contact information.

### Useful links

* [Eclipse Kura Project](http://www.eclipse.org/kura/)
* [Apache Camel Framework](http://camel.apache.org)
* [Enterprise Integration Patterns](http://www.enterpriseintegrationpatterns.com/)
* [OSGi Alliance](https://www.osgi.org/)
