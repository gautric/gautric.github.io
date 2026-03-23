---
title:  "Activate & Deactivate PoE Camera via Cisco Router"
date:   2025-04-06 09:00:00
categories: ["blog"]
tags: ["en","Cisco","PoE","WebCam"]
---

In this post, we'll explore how to activate or deactivate a surveillance camera via a Cisco router using Power over Ethernet (PoE) functionality. I've implemented a DIY surveillance installation at home using a PoE camera connected to a Cisco Small Business router. Specifically, I'm using the [Cisco Smart Switch SG250-10P](https://www.amazon.fr/Cisco-SG250-10P-10-Ports-Gigabit-Switch/dp/B01GZ1VXYO), which offers robust PoE capabilities that allow you to control power delivery to connected devices.

This approach is particularly useful for security purposes, as it allows you to remotely control when your surveillance camera is active without physically accessing the device.

### Prerequisites

Before starting, you need to be able to [connect via SSH to the router](https://www.cisco.com/c/en/us/td/docs/switches/lan/csbms/250_/2_5_7/Admin_guide/tesla-250-ag/cb_250_chapter_15.html#ID-00006535). For enhanced security and automation, it's recommended to create a dedicated service account with an SSH key for remote connection.

Next, you need to identify which physical port the camera is connected to on your Cisco switch. In my setup, the camera is connected to port number 2. You can verify this through the router's web interface or by checking the physical connection.

### Activation

After establishing an SSH connection with the device, you can use the following commands to activate the PoE camera:

```
cisco-sg250-10p# config
cisco-sg250-10p(config)# no logging console
cisco-sg250-10p(config)# int gi 2
cisco-sg250-10p(config-if)# power inline auto
cisco-sg250-10p(config-if)# exit
cisco-sg250-10p(config)# exit
cisco-sg250-10p# exit
```

Here's what each command does:

1. `config` - Access configuration mode to make changes to the router settings
2. `no logging console` - Disable logging echo to keep the output clean
3. `int gi 2` - Select the appropriate interface (gigabit interface 2 in this case)
4. `power inline auto` - Enable Power over Ethernet (PoE) mode, which automatically detects and powers the connected device
5. `exit` - Exit interface configuration mode
6. `exit` - Exit global configuration mode
7. `exit` - Terminate SSH session

After executing these commands, the router will begin supplying power to the camera, and it should boot up within a minute.

### Deactivation

For deactivation, the process is similar but with a different power setting:

```
cisco-sg250-10p# config
cisco-sg250-10p(config)# no logging console
cisco-sg250-10p(config)# int gi 2
cisco-sg250-10p(config-if)# power inline never
cisco-sg250-10p(config-if)# exit
cisco-sg250-10p(config)# exit
cisco-sg250-10p# exit
```

The key difference is in step 4, where we use `power inline never` to completely disable power delivery to the connected device. This effectively turns off the camera without having to physically unplug it.

{{< notice note >}}
For a PoE camera that is active intermittently, it's highly recommended to set a fixed IP address in your router's DHCP configuration. This prevents the IP address from being reassigned to other devices when the camera is powered off, ensuring consistent network access when the camera is reactivated.
{{< /notice >}}

### Automation Possibilities

You can further enhance this setup by creating shell scripts that execute these SSH commands automatically. This allows you to schedule camera activation/deactivation based on time of day or trigger it based on other events. For example, you might want to activate the camera only during nighttime hours or when you're away from home.

## Conclusion

This approach to managing PoE equipment deployed on your Cisco router provides a convenient way to control power delivery to connected devices remotely. It's particularly useful for surveillance cameras or other equipment that doesn't need to be permanently activated, helping to save power and extend the lifespan of your devices while maintaining security when needed.

By leveraging the PoE capabilities of your Cisco switch, you gain granular control over your network-connected devices without requiring additional smart plugs or power management solutions.

### Additional Resources

* [Cisco SG250 PoE Documentation](https://www.cisco.com/c/dam/en/us/products/collateral/switches/250-series-smart-switches/datasheet-c78-737061-french.pdf)
* [Cisco Small Business Switches Configuration Guide](https://www.cisco.com/c/en/us/support/switches/250-series-smart-switches/products-installation-and-configuration-guides-list.html)
