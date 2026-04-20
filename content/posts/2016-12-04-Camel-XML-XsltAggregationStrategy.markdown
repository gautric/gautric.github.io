---
title: "Camel XML XPath XSLT Aggregator"
date: 2016-12-03 15:00:00
categories: ["blog"]
tags: ["en", "Camel", "XML", "XPath", "XSLT", "Aggregator", "Route"]
---

This month I went to [Greece](https://en.wikipedia.org/wiki/Greece) for a customer of mine. I worked at Athens on [Camel](http://camel.apache.org/) integration with Mainframe legacy systems. The customer wanted to use XML message format throughout the entire Camel route process. Their primary goal was to reuse some Camel routes as new service components, allowing for greater flexibility and modularity in their integration architecture.

Fortunately, the Camel framework meets all of these requirements out of the box. In this article, we'll explore a simple example demonstrating how to implement this approach effectively.

> A practical Camel sample demonstrating XML message processing with XSL transformation for enterprise integration

## Camel framework

[Camel project](http://camel.apache.org/) is managed by the Apache foundation. Camel empowers you to define routing and mediation rules in a variety of domain-specific languages, including a Java-based Fluent API, Spring or Blueprint XML Configuration files, and a Scala DSL. This means you get smart completion of routing rules in your IDE, whether in a Java, Scala or XML editor. *([extract of the Camel website](http://camel.apache.org/))*

Apache Camel uses URIs to work directly with any kind of Transport or messaging model such as HTTP, ActiveMQ, JMS, JBI, SCA, MINA or CXF, as well as pluggable Components and Data Format options. Apache Camel is a small library with minimal dependencies for easy embedding in any Java application. Apache Camel lets you work with the same API regardless which kind of Transport is used - so learn the API once and you can interact with all the Components provided out-of-box. *([extract of the Camel website](http://camel.apache.org/))*

### Message

A Camel message contains headers and body part. **Headers** can be used to add new information (meta data) for the current Camel process or subsequent components. These headers act as contextual information that can influence routing decisions or processing logic. **Body** is the payload of the Camel message. During the Camel process, the payload can change at each step and sometimes the payload is completely replaced by a new one, depending on the transformation requirements.

### Aggregator Strategy

Camel provides an enrich pattern with aggregator strategy. With this component, both messages (the original and the new one) can be merged into a single message. Developers can implement their own version of an aggregator to suit specific business needs. In this example, we will see how to use the XSLT Aggregator within a Camel route to perform XML-based transformations and merges.

## Use case

### Customer and product

The use case is straightforward: we send a message to enrich customer information and product information. The route receives a message via the file system, checks XML validity, and calls two services to retrieve additional customer and product information. Because we want to preserve the full payload throughout the process and avoid any payload backup into headers, we need to use the enrich pattern. The route's final step is to write the complete result to a new file.

### Route

Here is the main route. You can notice the `<enrich>` elements used for calling services. These elements are key to our implementation as they allow us to call external services and incorporate their responses into our message flow.

```xml
<route id="service">
    <from uri="file:target/in?noop=true" />
    <to uri="validator:service.xsd" />
    <convertBodyTo type="String" />
    <to uri="log:net.a.g.camel" />
    <enrich strategyRef="xasCM">
        <constant>direct:customerService</constant>
    </enrich>
    <to uri="log:net.a.g.camel" />
    <enrich strategyRef="xasPM">
        <constant>direct:productService</constant>
    </enrich>
    <to uri="log:net.a.g.camel" />
    <to uri="validator:service.xsd" />
    <to uri="file:target/out" />
</route>
```

### Service

Here are the service routes to retrieve information. Note the `<xpath>` elements used to extract only the specific information needed for each service. We mock the service endpoints with constant payloads for demonstration purposes. In a production environment, you would typically call a database or a SOAP/REST service instead.

```xml
<route id="customer">
    <from uri="direct:customerService" />
    <to uri="log:net.a.g.camel" />
    <setBody>
        <xpath>//s:customer</xpath>
    </setBody>
    <to uri="log:net.a.g.camel" />
    <transform>
        <constant><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
            <s:customer xmlns:s="urn://example.org/service/2016/11">
                <s:firstName>Jean</s:firstName>
                <s:lastName>Paul</s:lastName>
                <s:title>M.</s:title>
            </s:customer>]]></constant>
    </transform>
</route>

<route id="product">
    <from uri="direct:productService" />
    <to uri="log:net.a.g.camel" />
    <setBody>
        <xpath>//s:product</xpath>
    </setBody>
    <to uri="log:net.a.g.camel" />
    <transform>
        <constant><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
            <s:product xmlns:s="urn://example.org/service/2016/11">
                    <s:id>123</s:id>
                    <s:amount>122</s:amount>
                    <s:price>8495</s:price>
                    <s:name>LOUKOUM</s:name>
            </s:product>]]></constant>
    </transform>
</route>
```

### XSLT

Here is the XSLT Aggregator for merging the pre-call service message with the new message returned from the service. By default, Camel passes the original message to the XSLT processor and adds the new message as an XSLT parameter named `new-exchange`. 

The XSL transformation uses an identity algorithm to copy all elements from the previous message (in the first `xsl:template` block) and then applies specific transformations when needed (in the second `xsl:template` block). This approach allows for selective merging of data while preserving the overall structure.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0" xmlns:s="urn://example.org/service/2016/11">

    <xsl:param name="new-exchange" />

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" />
        </xsl:copy>
    </xsl:template>

    <xsl:template match="s:customer">
        <s:customer>
            <xsl:copy-of select="s:id" />
            <xsl:copy-of select="$new-exchange//s:firstName" />
            <xsl:copy-of select="$new-exchange//s:lastName" />
            <xsl:copy-of select="$new-exchange//s:title" />
            <xsl:copy-of select="s:country" />
        </s:customer>
    </xsl:template>

</xsl:stylesheet>
```

In the main route configuration, you need to define the strategy in the bean definition. Here we use the `XsltAggregationStrategy` class that comes with `camel-core`, making it readily available without additional dependencies.

```xml
<bean id="xasCM"
    class="org.apache.camel.util.toolbox.XsltAggregationStrategy">
    <constructor-arg index="0" value="customerMerge.xslt" />
</bean>
```

## Conclusion

The Camel framework is highly versatile and enjoyable to work with. Its flexibility provides significant leverage when implementing complex integration scenarios in real-world applications. The `XsltAggregationStrategy` enables you to work with XML throughout the entire Camel route, maintaining data integrity and structure.

Using Camel routes as services offers tremendous advantages for creating more adaptable development environments, as you can reuse services whenever needed. However, it's essential to keep in mind XML schema validation (for both input and output messages) and proper versioning management to ensure long-term maintainability.

### Links

* [Camel project](http://camel.apache.org/)
* [Enrich](http://camel.apache.org/content-enricher.html)
* [XsltAggregationStrategy](https://github.com/apache/camel/blob/master/camel-core/src/main/java/org/apache/camel/util/toolbox/XsltAggregationStrategy.java)
* [XSLT 1.0](https://www.w3.org/TR/xslt)
* [XSLT 2.0](https://www.w3.org/TR/xslt20)
* [Direct](https://camel.apache.org/direct.html)
