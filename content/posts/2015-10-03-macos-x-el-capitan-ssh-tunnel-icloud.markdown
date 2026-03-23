---
layout: post
css: blog
title:  "SSH to MacOS X (El Capitan) through iCloud tunnel"
date:   2015-10-03 13:58:00
categories: ["blog"]
tags: ["en","MacOS", "SSH", "tunnel", "iCloud", "El-Capitan"]
#url: /blog/2015/10/03/macos-x-el-capitan-ssh-tunnel-icould.html
---

{{< notice warning >}}
**Note (2024)** : Le service "Back to My Mac" d'Apple a été supprimé à partir de macOS Mojave (2018). Cette méthode de tunnel SSH via iCloud n'est plus disponible sur les versions récentes de macOS.
{{< /notice >}}

After my wedding and a honeymoon in Sicily, I am back home to blog about some tech topics.

Yesterday, I updated my favorite laptop - a MacbookPro with Japanese keyboard (Retina, 13-inch, Mid 2014) - with the new MacOS X 10.11 El Capitan version. One of the reasons I love MacOS is that it includes bash, ssh, and many other powerful Linux/Unix commands right out of the box. 

I also have a MacMini at home behind my Internet box. For some time, I've been looking for a convenient way to connect to my MacMini via SSH through the iCloud infrastructure, without having to configure complex port forwarding on my router. Finally, after some research, I found a solution using Apple's "Back to My Mac" service.

> How to setup a SSH connection via iCloud tunnel with 2 Macs

Let's see how to do it.

## Requisites

* Have two Macs:
  * A laptop (MacbookPro in my case) directly connected to the Internet
  * A server (MacMini) behind an Internet box/router
* Have an active iCloud account on both devices
* Both Macs should be running OS X Yosemite (10.10) or later

## Back to My Mac setup (MacMini)

First, ensure the "Back to My Mac" option is enabled in your iCloud account settings on the MacMini server. This service creates a secure tunnel between your devices through Apple's servers.

<img src="/img/icloudbacktomymac.png" width="50%" height="50%" />

Once enabled, you should see your MacMini server available in your Finder's left panel under the "Shared" section.

<img src="/img/icloudselectmacmini.png" width="25%" height="25%" />

[More information is available at the official Apple help center](https://support.apple.com/en-us/HT204618)

## Locate MacMini server

First of all, we need to retrieve connection information to use the SSH protocol.
We'll use some command line tools to find your MacMini through the iCloud network.

### First step

We need to find our iCloud account and our iCloud FQDN (Fully Qualified Domain Name):

```bash
[mbp:~]$> dns-sd -E

Looking for recommended registration domains:
DATE: ---Fri 02 Oct 2015---
20:29:07.366  ...STARTING...
Timestamp     Recommended Registration domain
20:29:07.367  Added     (More)               local
20:29:07.367  Added                          icloud.com
                                             - > btmm
                                             - - > members
                                             - - - > 1122334455
```

From this output, we can see that my iCloud FQDN is *1122334455.members.btmm.icloud.com*. This unique identifier is associated with your iCloud account and will be used to establish the connection.

### Second step

After finding our iCloud DNS name, we'll retrieve our MacMini server using the ZeroConf/Bonjour protocol.
To find it, we'll use another command line tool. This command collects all machines connected to your iCloud account that are sharing the *_ssh* service:

```bash
[mbp:~]$> dns-sd -B _ssh 1122334455.members.btmm.icloud.com

Browsing for _ssh._tcp.1122334455.members.btmm.icloud.com
DATE: ---Fri 02 Oct 2015---
20:34:10.344  ...STARTING...
Timestamp     A/R    Flags  if Domain               Service Type         Instance Name
20:34:10.345  Add        3   0 1122334455.members.btmm.icloud.com. _ssh._tcp.           MacMini
20:34:10.345  Add        2   0 1122334455.members.btmm.icloud.com. _ssh._tcp.           MacBookPro
```

This output shows both our machines (MacMini and MacBookPro) are available through the iCloud tunnel and have SSH services enabled.

### Last but not least step

Now that we've found our iCloud FQDN and our MacMini name, we can connect to it through the iCloud tunnel.
If your server name contains spaces, replace them with dashes (*sed -e "s/[[:space:]]/-/g"*).

```bash
[mbp:~]$> ssh MacMini.1122334455.members.btmm.icloud.com
Last login: Fri Oct  2 21:18:27 2015 from xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx
[mac-mini:~]$>
```

And just like that, we're connected to our MacMini through the secure iCloud tunnel! This works even if both machines are behind different NAT routers or firewalls, as the connection is established through Apple's servers.

## Conclusion

Connecting through the iCloud service is quite straightforward once you know the steps. Unfortunately, there isn't much documentation for technical users, but with these Unix/Linux commands, you can leverage this powerful feature.

This is a relatively new service I've set up, so I don't have extensive feedback yet, but it's been working reliably for my needs. The connection is encrypted and secure, making it a convenient way to access your home Mac from anywhere with an internet connection.

## Bonus tip

To simplify your SSH connections, you can use the SSH config file (*.ssh/config*) to log on to your MacMini server.
Just edit it with your preferred text editor (atom, vim, nano, etc.):

```bash
Host MacMini_iCloud
  HostName MacMini.1122334455.members.btmm.icloud.com
  User XXXXX
  ServerAliveInterval 10
  ServerAliveCountMax 6
```

The ServerAliveInterval and ServerAliveCountMax parameters help keep the connection alive even during periods of inactivity.

Now you can log in with this simple command:

```bash
[mbp:~]$> ssh MacMini_iCloud
Last login: Fri Oct  2 21:25:00 2015 from xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx
[mac-mini:~]$>
```

### Useful links

* [Back to My Mac - Apple Support](https://support.apple.com/en-us/HT204618)
* [SSH Configuration Files - OpenSSH Documentation](https://www.openssh.com/manual.html)
