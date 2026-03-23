---
layout: post
css: blog
title:  "RHIoT Webcam and websocket components on MacbookPro in Groovy"
date:   2015-10-23 13:58:00
categories: ["blog"]
tags: ["en", "rhiot", "MacbookPro", "camel", "webcam", "websocket", "groovy", "javafx"]
#url: /blog/2015/10/23/rhiot-camel-webcam-websocket-macbookpro.html
---

Yesterday, we've played with our MacBook Pro's webcam. Today, we gonna see how to send images through a websocket
directly in this page !!! or via a JavaFx program. We gonna re-use the previous post and integrate camel Websocket component. Let's play with Groovy language to create a real-time webcam streaming solution.

> Webcam image to Websocket w/ Rhiot & Camel projects on MacbookPro

Let's start to broadcast yourself. This tutorial will guide you through setting up a webcam stream that can be viewed through a web browser or a JavaFX application.

## Requisites

* Have a mac
 - tested MacBook Pro Retina, 13-inch, Mid 2014
* Groovy Mac port installed
 - Groovy Version: 2.4.4 JVM: 1.8.0_45 Vendor: Oracle Corporation OS: Mac OS X


## Program

We gonna re-use our previous Groovy language program and we will change some components to enable websocket streaming. The modified program will capture images from your webcam and broadcast them through a websocket server.

<script src="https://gist.github.com/gautric/98dc4e37d57c9d1f1798.js"></script>

The key point of this program are :

* the @Grab annotation to download camel-websocket component : `@Grab(group="org.apache.camel",module="camel-websocket",version="2.16.0")`
* the *to* command to capture image every second : `"websocket://localhost:8080/camel-webcam?sendToAll=true"`

Copy log4j.properties into the same directory to manage logging configuration:

<script src="https://gist.github.com/gautric/cca1a01fb55ce5846422.js"></script>

In our case we need to develop a HTML page to receive broadcasted img. This HTML page will connect to the websocket server and display the images as they arrive:

<script src="https://gist.github.com/gautric/6d58693e6cf21a8f4a4e.js"></script>

you can also use the next Javafx program to broadcast yourself. This provides an alternative viewer application built with JavaFX:

<script src="https://gist.github.com/gautric/e6dd82761337136ae855.js"></script>

## Execution

Let's run it now. When you execute the Groovy script, it will start the Camel context, initialize the webcam, and begin streaming images through the websocket:

```
[mbp:~/Source/tmp/io/rhiot/test]$> groovy  WebcamToWebSocket.groovy
[                          main] MainSupport                    INFO  Apache Camel 2.16.0 starting
[                          main] DefaultCamelContext            INFO  Apache Camel 2.16.0 (CamelContext: camel-1) is starting
[                          main] ManagedManagementStrategy      INFO  JMX is enabled
[                          main] DefaultTypeConverter           INFO  Loaded 182 type converters
[                          main] DefaultRuntimeEndpointRegistry INFO  Runtime endpoint registry is in extended mode gathering usage statistics of all incoming and outgoing endpoints (cache limit: 1000)
[                          main] WebcamEndpoint                 WARN  Driver not supported
[                          main] Webcam                         INFO  WebcamDefaultDriver capture driver will be used
[            atomic-processor-1] WebcamOpenTask                 INFO  Opening webcam FaceTime HD Camera CC242951XGLF6VVD4
[                          main] DefaultCamelContext            INFO  AllowUseOriginalMessage is enabled. If access to the original message is not needed, then its recommended to turn this option off as it may improve performance.
[                          main] DefaultCamelContext            INFO  StreamCaching is not in use. If using streams then its recommended to enable stream caching. See more details at http://camel.apache.org/stream-caching.html
[                          main] WebsocketComponent             INFO  Jetty Server starting on host: localhost:8080
[                          main] Server                         INFO  jetty-8.1.17.v20150415
[                          main] AbstractConnector              INFO  Started SelectChannelConnector@localhost:8080
[                          main] DefaultCamelContext            INFO  Route: route1 started and consuming from: Endpoint[webcam://cam?consumer.delay=100]
[                          main] DefaultCamelContext            INFO  Total 1 routes, of which 1 is started.
[                          main] DefaultCamelContext            INFO  Apache Camel 2.16.0 (CamelContext: camel-1) started in 2.019 seconds
[                          main] MainSupport                    INFO  Waiting for: 60 SECONDS
[el-1) thread #0 - webcam://cam] camel                          INFO  Exchange[Id: ID-mbp-g-a-net-57437-1445524143378-0-2, ExchangePattern: OutOnly, BodyType: byte[]]
[el-1) thread #0 - webcam://cam] camel                          INFO  Exchange[Id: ID-mbp-g-a-net-57437-1445524143378-0-4, ExchangePattern: OutOnly, BodyType: byte[]]
[el-1) thread #0 - webcam://cam] camel                          INFO  Exchange[Id: ID-mbp-g-a-net-57437-1445524143378-0-6, ExchangePattern: OutOnly, BodyType: byte[]]

 ........................... OMIT ...........................


OutOnly, BodyType: byte[]]
[el-1) thread #0 - webcam://cam] camel                          INFO  Exchange[Id: ID-mbp-g-a-net-57437-1445524143378-0-44, ExchangePattern: OutOnly, BodyType: byte[]]
[el-1) thread #0 - webcam://cam] camel                          INFO  Exchange[Id: ID-mbp-g-a-net-57437-1445524143378-0-46, ExchangePattern: OutOnly, BodyType: byte[]]
^C[                      Thread-1] MainSupport$HangupInterceptor  INFO  Received hang up - stopping the main instance.
[                      Thread-1] MainSupport                    INFO  Apache Camel 2.16.0 stopping
[               shutdown-hook-1] WebcamShutdownHook             INFO  Automatic FaceTime HD Camera CC242951XGLF6VVD4 deallocation
[                      Thread-1] DefaultCamelContext            INFO  Apache Camel 2.16.0 (CamelContext: camel-1) is shutting down
[               shutdown-hook-1] Webcam                         INFO  Disposing webcam FaceTime HD Camera CC242951XGLF6VVD4
[                      Thread-1] DefaultShutdownStrategy        INFO  Starting to graceful shutdown 1 routes (timeout 300 seconds)
[el-1) thread #1 - ShutdownTask] ContextHandler                 INFO  stopped o.e.j.s.ServletContextHandler{/,null}
[el-1) thread #1 - ShutdownTask] DefaultShutdownStrategy        INFO  Route: route1 shutdown complete, was consuming from: Endpoint[webcam://cam?consumer.delay=100]
[                      Thread-1] DefaultShutdownStrategy        INFO  Graceful shutdown of 1 routes completed in 0 seconds
[                      Thread-1] DefaultCamelContext            INFO  Apache Camel 2.16.0 (CamelContext: camel-1) uptime 48.953 seconds
[                      Thread-1] DefaultCamelContext            INFO  Apache Camel 2.16.0 (CamelContext: camel-1) is shutdown in 0.101 seconds
```

## And the result

I propose to you four possibilities for the demo:

* start groovy program above on your own laptop and download *WebcamToWebSocket.html* for an offline use
* start groovy program above on your own laptop and run *WebcamToWebSocketJavafx.java* program
* or just play YouTube video(s) below to see the demonstration in action

<br/>
**HTML 5 / YouTube Demo**

<iframe width="650" height="415" src="https://www.youtube.com/embed/gIdk8zy265U" frameborder="0" ></iframe>

<br/>

**JavaFx / YouTube Demo**

<iframe width="650" height="415" src="https://www.youtube.com/embed/x16IXEW1RAU" frameborder="0" ></iframe>

<br/>

## Conclusion

As you can see Rhiot project and contributors are doing great work, the IoT movement provides lot of interesting ideas we can implement really easily almost out-of-the box. Once more, I would like to thank [Taariq Levack](https://twitter.com/levackt) for this great component. Next step is to implement this demo into a RaspberryPi, which would allow for remote webcam monitoring and streaming from an embedded device.

Stay tuned for more IoT experiments and implementations!!!


### Useful links

 * [rhiot projet](http://rhiot.io)
 * [webcam component](https://github.com/rhiot/rhiot/issues/239)
 * [Taariq Levack's github account](https://github.com/levackt)
 * [Taariq Levack's twitter account](https://twitter.com/levackt)
