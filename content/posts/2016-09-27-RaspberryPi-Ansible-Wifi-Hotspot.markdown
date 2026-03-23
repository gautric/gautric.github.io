---
layout: post
css: blog
title:  "Setup a Hotspot Wifi with Ansible into a RaspberryPi 3"
date:   2016-09-27 15:00:00
categories: ["blog"]
tags: ["en","RaspberryPi","Ansible","Wifi","HOWTO","Hotspot"]
##url: /blog/2016/09/27/RaspberryPi-Ansible-Wifi-Hotspot.html
---

This September, RaspberryPi foundation has sold [ten (10) Millions of unit](https://www.raspberrypi.org/blog/ten-millionth-raspberry-pi-new-kit/). This small computer is amazing, you can setup very quickly several cool IoT projects. Since 2012, I bought all versions [(B 256Mo, B 512Mo, B+, 2B, 3B)](https://en.wikipedia.org/wiki/Raspberry_Pi#Specifications) of RaspberryPi. I am a big fan of this product and you can find into [this blog](/blog/) some projects I've made on top of this little computer.

RaspberryPi version 3 comes with a wifi builtin interface, and this wifi interface can be configured as a [Wifi Hotspot](https://en.wikipedia.org/wiki/Hotspot_(Wi-Fi)). I use it every day at home or at office. Today, I will show you how to configure a Wifi Hotspot with [Ansible](https://www.ansible.com/), which is a powerful automation tool that simplifies configuration management.

> Howto setup a Hotspot Wifi w/ Ansible into a RaspberryPi 3

## Prerequisites

For this lab, you need the following software and hardware:

* A RaspberryPi version 3
  * with [Raspbian](https://www.raspbian.org/) operating system installed
  * SSH connection enabled for the pi user
* Ansible installed into your system
  * For MacOS users: install via [Macport](https://trac.macports.org/browser/trunk/dports/sysutils/ansible/Portfile), [Homebrew](http://brew.sh/index.html) or pip
  * For Linux users: use your distribution's package manager or pip

## Clone git project

First of all, clone the git repository containing the Ansible playbook and templates.

```bash
git clone git@github.com:gautric/ansible-raspberrypi.git
cd ansible-raspberrypi
```

## Ansible playbook

To install and configure our Wifi Hotspot, we're going to use a YAML file used by Ansible. This file is really simple to understand. It's a list of tasks, and each task will perform only one action like:

* Installing packages
* Copying files
* Enabling services
* Restarting devices

By default, Raspbian comes with a *pi* user with correct **sudo** privileges. In this playbook, Ansible uses the **pi** user *(remote_user: pi)* and performs all commands with **sudo** *(become: true)*.

{{< notice warning >}}
As you can see wpa_passphrase and ssid must be defined. You will see how to do it with command line directly.
{{< /notice >}}

```yaml
---
- name: Configure WIFI Hotspot for RaspberryPi 3
  hosts: raspberrypi
  remote_user: pi
  vars:
    wpa_passphrase: XXXXXXX
    interface: wlan0
    ssid: YYYYYYYY
    ip_server: 10.0.0.1
    netmask: 255.255.255.0
    ip_dhcp_low: 10.0.0.2
    ip_dhcp_high: 10.0.0.15

  tasks:
    - name: hostapd install
      apt: name=hostapd state=present force=yes
      become: true

    - name: dnsmasq install
      apt: name=dnsmasq state=present force=yes
      become: true

    - name: dnsmasq.conf
      template:
        src: template/dnsmasq.conf.j2
        dest: /etc/dnsmasq.conf
        backup: true
      become: true

    - name: hostapd.conf
      template:
        src: template/hostapd.conf.j2
        dest: /etc/hostapd/hostapd.conf
        backup: true
      become: true

    - name: hostapd
      template:
        src: template/hostapd.j2
        dest: /etc/default/hostapd
        backup: true
      become: true

    - name: rc.local
      template:
        src: template/rc.local.j2
        dest: /etc/rc.local
        backup: true
      become: true

    - name: dnsmasq service
      service: name=dnsmasq enabled=yes state=started
      become: true

    - name: hostapd service
      service: name=hostapd enabled=yes state=started
      become: true

    - name: restart machine
      shell: sleep 2 && shutdown -r now
      async: 1
      poll: 0
      become: true
      ignore_errors: true
```

We can also create templates for configuration files. Ansible will inject values into the template and copy the final file to destination. Below is an example of the hostapd.conf template:

```
interface={{ interface }}
hw_mode=g
channel=10
auth_algs=1
macaddr_acl=0
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
wpa_passphrase={{ wpa_passphrase }}
ssid={{ ssid }}
```

This template configures the wireless access point settings, including the security mode (WPA2), channel, and authentication parameters. The variables in double curly braces will be replaced with actual values during deployment.

## Ansible Execution

To deploy the configuration, Ansible provides the **ansible-playbook** command line tool. You must configure the **hosts** file, which includes all RaspberryPi hosts you want to configure.

### Ansible command line

Execute the following command to deploy the configuration to your RaspberryPi:

```bash
ansible-playbook pi_wifi.yml --inventory-file=./hosts \
    -u pi  -v \
    -e "ssid=RASPBERRY wpa_passphrase=1234567891011"
```

The `-e` parameter allows you to pass variables directly from the command line, which is useful for sensitive information like passwords.

{{< notice warning >}}
Please change wpa_passphrase and ssid correctly. The wpa_passphrase should be at least 8 characters long for security reasons.
{{< /notice >}}

### Ansible command line output

The command line output should look similar to the following:

```
ansible-playbook pi_wifi.yml --inventory-file=./hosts -u pi  -v --diff -e "ssid=RASPBERRY wpa_passphrase=12345"
No config file found; using defaults

PLAY [raspberrypi] *************************************************************

TASK [setup] *******************************************************************
ok: [192.168.0.11]

TASK [hostapd install] *********************************************************
ok: [192.168.0.11] => {"cache_update_time": 0, "cache_updated": false, "changed": false}

TASK [dnsmasq install] *********************************************************
changed: [192.168.0.11] => {"cache_update_time": 0, "cache_updated": false, "changed": true, "stderr": "", "stdout": "Reading package lists...\nBuilding dependency tree...\nReading state information...\nThe following extra packages will be installed:\n  dns-root-data dnsmasq-base libmnl0 libnetfilter-conntrack3\nThe following NEW packages will be installed:\n  dns-root-data dnsmasq dnsmasq-base libmnl0 libnetfilter-conntrack3\n0 upgraded, 5 newly installed, 0 to remove and 0 not upgraded.\nInst libmnl0 (1.0.3-5 Raspbian:stable [armhf])\nInst libnetfilter-conntrack3 (1.0.4-1 Raspbian:stable [armhf])\nInst dns-root-data (2014060201+2 Raspbian:stable [all])\nInst dnsmasq-base (2.72-3+deb8u1 Raspbian:stable [armhf])\nInst dnsmasq (2.72-3+deb8u1 Raspbian:stable [all])\nConf libmnl0 (1.0.3-5 Raspbian:stable [armhf])\nConf libnetfilter-conntrack3 (1.0.4-1 Raspbian:stable [armhf])\nConf dns-root-data (2014060201+2 Raspbian:stable [all])\nConf dnsmasq-base (2.72-3+deb8u1 Raspbian:stable [armhf])\nConf dnsmasq (2.72-3+deb8u1 Raspbian:stable [all])\n", "stdout_lines": ["Reading package lists...", "Building dependency tree...", "Reading state information...", "The following extra packages will be installed:", "  dns-root-data dnsmasq-base libmnl0 libnetfilter-conntrack3", "The following NEW packages will be installed:", "  dns-root-data dnsmasq dnsmasq-base libmnl0 libnetfilter-conntrack3", "0 upgraded, 5 newly installed, 0 to remove and 0 not upgraded.", "Inst libmnl0 (1.0.3-5 Raspbian:stable [armhf])", "Inst libnetfilter-conntrack3 (1.0.4-1 Raspbian:stable [armhf])", "Inst dns-root-data (2014060201+2 Raspbian:stable [all])", "Inst dnsmasq-base (2.72-3+deb8u1 Raspbian:stable [armhf])", "Inst dnsmasq (2.72-3+deb8u1 Raspbian:stable [all])", "Conf libmnl0 (1.0.3-5 Raspbian:stable [armhf])", "Conf libnetfilter-conntrack3 (1.0.4-1 Raspbian:stable [armhf])", "Conf dns-root-data (2014060201+2 Raspbian:stable [all])", "Conf dnsmasq-base (2.72-3+deb8u1 Raspbian:stable [armhf])", "Conf dnsmasq (2.72-3+deb8u1 Raspbian:stable [all])"]}
The following extra packages will be installed:
  dns-root-data dnsmasq-base libmnl0 libnetfilter-conntrack3
The following NEW packages will be installed:
  dns-root-data dnsmasq dnsmasq-base libmnl0 libnetfilter-conntrack3
0 upgraded, 5 newly installed, 0 to remove and 0 not upgraded.

TASK [dnsmasq.conf] ************************************************************
changed: [192.168.0.11] => {"changed": true}
--- before
+++ after: dynamically generated
@@ -0,0 +1,2 @@
+interface=wlan0
+dhcp-range=10.0.0.2,10.0.0.5,255.255.255.0,12h


TASK [hostapd.conf] ************************************************************
changed: [192.168.0.11] => {"changed": true}
--- before
+++ after: dynamically generated
@@ -0,0 +1,11 @@
+interface=wlan0
+hw_mode=g
+channel=10
+auth_algs=1
+macaddr_acl=0
+wpa=2
+wpa_key_mgmt=WPA-PSK
+wpa_pairwise=CCMP
+rsn_pairwise=CCMP
+wpa_passphrase=1234567891011
+ssid=RASPBERRY


TASK [hostapd] *****************************************************************
changed: [192.168.0.11] => {"changed": true}
--- before: /etc/default/hostapd
+++ after: dynamically generated
@@ -7,12 +7,12 @@
 # file and hostapd will be started during system boot. An example configuration
 # file can be found at /usr/share/doc/hostapd/examples/hostapd.conf.gz
 #
-#DAEMON_CONF=""
+DAEMON_CONF="/etc/hostapd/hostapd.conf"

 # Additional daemon options to be appended to hostapd command:-
-# 	-d   show more debug messages (-dd for even more)
-# 	-K   include key data in debug messages
-# 	-t   include timestamps in some debug messages
+#         -d   show more debug messages (-dd for even more)
+#         -K   include key data in debug messages
+#         -t   include timestamps in some debug messages
 #
 # Note that -B (daemon mode) and -P (pidfile) options are automatically
 # configured by the init.d script and must not be added to DAEMON_OPTS.


TASK [rc.local] ****************************************************************
changed: [192.168.0.11] => {"changed": true}
--- before: /etc/rc.local
+++ after: dynamically generated
@@ -17,4 +17,12 @@
   printf "My IP address is %s\n" "$_IP"
 fi

+ifconfig wlan0 down
+ifconfig wlan0 10.0.0.1 netmask 255.255.255.0 up
+#ifconfig wlan0 inet6 add fc00::7262:7069:0003/7
+iwconfig wlan0 power off
+
+service dnsmasq restart
+service hostapd restart
+
 exit 0


TASK [dnsmasq service] *********************************************************
changed: [192.168.0.11] => {"changed": true}

TASK [hostapd service] *********************************************************
changed: [192.168.0.11] => {"changed": true, "msg": "service state changed"}

PLAY RECAP *********************************************************************
192.168.0.11               : ok=10   changed=8    unreachable=0    failed=0
```

The output shows each task being executed, with details about what changes were made to the system. The `--diff` flag shows the differences between the original and new configuration files.

## Conclusion

_Et voila!_ If you reboot your RaspberryPi, you should find a new Wifi Hotspot called **RASPBERRY**. You can connect to it using the password you specified in the command line.

This Ansible playbook was created very quickly and efficiently. The Ansible integration with a RaspberryPi is very easy because you just need an SSH connection to connect with. The playbook installs and configures:

1. hostapd - the service that creates the wireless access point
2. dnsmasq - provides DHCP and DNS services for connected clients
3. Network configuration - sets up the wlan0 interface with the appropriate IP address

I think I will continue to use Ansible with some of my RaspberryPi devices for future projects. It makes deployment and configuration management much more efficient, especially when managing multiple devices.

### Useful links

* [Ansible Documentation](https://www.ansible.com/)
* [Galaxy Ansible](https://galaxy.ansible.com/) - Community repository of Ansible roles
* [RaspberryPi Documentation](https://www.raspberrypi.org/documentation/)
* [Hostapd Documentation](https://w1.fi/hostapd/)
