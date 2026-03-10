---
title:  "AWS SSM, Ansible et Raspberry Pi via SSH"
date:   2024-01-15 09:00:00
categories: ["blog"]
tags: ["fr","AWS","RaspberryPi","SSM","Ansible","SSH"]
##url: /blog/2024/01/15/AWS-SSM-and-RaspberryPi-SSH.html
---

Dans ce nouvel article de 2024, découvrez comment AWS Systems Manager (SSM) s'intègre de manière utile avec le Raspberry Pi (testé avec les modèles 3, Zero et 5). Explorez les possibilités de cette combinaison, idéale pour les projets d'informatique personnelle décentralisée. Que vous soyez un passionné du Cloud, un amateur d'IoT ou simplement curieux, cet article vous réserve des surprises !
Cet article sera particulièrement utile pour ceux qui cherchent à accéder facilement et de manière sécurisée à leur Raspberry Pi sans avoir à configurer le port forwarding sur leur box Internet, et ce, pour un coût minime [^pricing]. Nous utiliserons la fonctionnalité Session Manager d'AWS SSM. 🍇

> Intégration de SSM dans sa flotte de RaspberryPi avec Ansible

## AWS Systems Manager (SSM)

[AWS Systems Manager](https://aws.amazon.com/fr/systems-manager/) (SSM) se positionne comme un outil centralisé de gestion d'infrastructure, simplifiant la supervision et l'automatisation des opérations pour les ressources AWS, notamment les instances EC2. Ses fonctionnalités avancées, telles que l'automatisation des tâches, la collecte de données opérationnelles en temps réel et la maintenance automatisée des correctifs, renforcent l'efficacité opérationnelle et la sécurité dans le cloud. De manière significative, SSM va au-delà du cloud en permettant également la gestion unifiée des instances on-premises, offrant ainsi une solution intégrée pour la gestion hybride des environnements, consolidant ainsi la surveillance, l'automatisation et la conformité à travers des infrastructures diversifiées.

## Raspberry Pi 5

Le [Raspberry Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/) vient révolutionner la série emblématique en proposant une puissance de calcul améliorée, une connectivité plus rapide avec le Wi-Fi 6, et une efficacité énergétique optimisée. Doté de ports USB-C et capable de supporter des résolutions d'affichage supérieures, ce dernier modèle promet une expérience informatique encore plus performante pour les amateurs, les développeurs et les passionnés d'IoT. Une solution compacte, mais puissante, prête à ouvrir de nouvelles perspectives créatives.

## Ansible

[Ansible](https://docs.ansible.com/ansible/latest/network/getting_started/first_playbook.html), un puissant outil open source de gestion de configuration, simplifie l'automatisation des déploiements, des mises à jour et de la gestion des infrastructures informatiques. Basé sur un modèle déclaratif simple et utilisant le langage YAML, Ansible permet aux administrateurs système de définir l'état désiré de leurs systèmes et d'orchestrer des tâches complexes de manière efficace, offrant ainsi une solution flexible et extensible pour la gestion d'infrastructures à grande échelle.

## Présentation du projet

Explorons à présent les différentes tâches Ansible qui permettront de déployer l'agent AWS Systems Manager (SSM) sur l'ensemble de la flotte de Raspberry Pi. Ces tâches seront soigneusement conçues pour assurer un déploiement efficace et uniforme de l'agent SSM, renforçant ainsi la capacité de gestion à distance de ces dispositifs au sein de l'infrastructure.

### Prérequis

Avant de procéder à l'exécution du playbook Ansible, assurez-vous de respecter les prérequis suivants :

* __AWS CLI__ : Vérifiez que la AWS Command Line Interface (CLI) est installée sur la machine où Ansible sera exécuté. [Vous pouvez télécharger la CLI AWS à partir du site officiel d'Amazon AWS et suivre les instructions d'installation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

* __Ansible__ : Assurez-vous qu'Ansible est installé sur votre système. Vous pouvez l'installer via les gestionnaires de paquets de votre système d'exploitation ou en utilisant un gestionnaire de paquets Python comme pip. [Consultez la documentation officielle d'Ansible pour obtenir des instructions d'installation détaillées](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html).

* __Compte AWS__ : Vous devez disposer [d'un compte AWS valide](https://console.aws.amazon.com/) avec les permissions nécessaires pour créer des activations AWS SSM. Assurez-vous que les informations d'identification AWS (clé d'accès et clé secrète) sont configurées correctement, soit via le fichier de configuration AWS (~/.aws/config et ~/.aws/credentials), soit via des variables d'environnement.

* __Rôle IAM service-role/AmazonEC2RunCommandRoleForManagedInstances__ : Assurez-vous qu'un rôle IAM nommé [service-role/AmazonEC2RunCommandRoleForManagedInstances](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-service-role.html) existe dans votre compte AWS. Ce rôle est requis pour exécuter des commandes Systems Manager sur des instances EC2. Si le rôle n'existe pas, créez-le en utilisant la console IAM AWS et attribuez les autorisations nécessaires.

* __Un ou plusieurs Raspberry Pi__ : Assurez-vous que les clés publiques SSH que vous utilisez pour vous connecter aux Raspberry Pi sont présentes sur chaque appareil.

### Tâche de création des codes d'activation SSM

```yaml
- name: "Create AWS SSM Activation"
  ansible.builtin.command: 
    cmd: "aws ssm create-activation --iam-role {% raw %}{{aws_iam_role}}{% endraw %} --registration-limit {% raw %}{{ ansible_play_hosts | length }}{% endraw %}   --region {% raw %}{{aws_region}}{% endraw %}  --tags \"Key=os,Value=raspbian\" "
  register: aws_ssm_activation
  connection: local
  delegate_to: localhost
  become: false
  become_user: "{% raw %}{{ansible_user_id}}{% endraw %}"
  become_method: runas
  run_once: true
```

Cette task Ansible, intitulée __"Create AWS SSM Activation"__, se charge de créer une activation AWS Systems Manager (SSM) en utilisant le module _ansible.builtin.command_. L'activation est réalisée en invoquant la commande AWS CLI _aws ssm create-activation_ avec les paramètres spécifiés, tels que le rôle IAM, la limite d'inscription basée sur le nombre d'hôtes Ansible, la région AWS, et des tags pour identifier l'OS (dans ce cas, "raspbian").

Le résultat de cette opération est stocké dans la variable aws_ssm_activation. Ce playbook est conçu pour être exécuté localement (connection: local), en utilisant la commande delegate_to: localhost. Il n'utilise pas l'élévation de privilèges (become) pour exécuter la commande en tant qu'utilisateur spécifié.

Il est important de noter que l'option run_once: true assure que cette tâche est exécutée une seule fois, indépendamment du nombre d'hôtes Ansible. En résumé, ce playbook automatise la création d'une activation SSM avec des paramètres spécifiques dans un environnement AWS, contribuant ainsi à la gestion centralisée des ressources.

```yaml
- name: Convert output to fact
  set_fact:
    aws_ssm_activation_var: "{% raw %}{{ aws_ssm_activation.stdout | from_json }}{% endraw %} "
  connection: local
  delegate_to: localhost
  become: false
  become_user: "{% raw %}{{ansible_user_id}}{% endraw %}"
  become_method: runas
  run_once: true
```

Nous prendrons en charge la conversion de la sortie (output) au format JSON vers un fact Ansible. Cette étape est cruciale pour permettre une manipulation et une analyse ultérieure efficace des données générées par nos tâches Ansible.

### Tâche de téléchargement et d'installation du binaire SSM

Les tâches suivantes dans le playbook ont pour objectif de récupérer le binaire d'installation du site AWS et de procéder à son installation sur le Raspberry Pi. Ce processus est fondamental pour garantir que l'agent AWS Systems Manager (SSM) soit correctement déployé sur chaque dispositif. La récupération du binaire se fait via des commandes Ansible, assurant ainsi un téléchargement sûr et efficace depuis la source officielle AWS. Une fois le binaire obtenu, la tâche suivante s'emploie à exécuter le processus d'installation sur chaque Raspberry Pi de la flotte, permettant ainsi d'établir la connexion entre les dispositifs et AWS Systems Manager pour une gestion centralisée et à distance. Ces étapes sont cruciales pour garantir la cohérence et l'efficacité de l'agent SSM sur l'ensemble de la flotte de Raspberry Pi.

```yaml
- name: Download Amazon SSM Agent
  ansible.builtin.get_url:
    url: "{% raw %}{{aws_ssm_deb_url}}{% endraw %}"
    dest: "{% raw %}{{aws_ssm_deb_file}}{% endraw %}"
    mode: '0444'

- name: Install a Amazon SSM Agent .deb package
  ansible.builtin.apt:
    deb: "{% raw %}{{aws_ssm_deb_file}}{% endraw %}"
```

### Tâche d'enregistrement du Raspberry Pi dans l'inventaire AWS SSM

```yaml
- name: "Register Amazon SSM Agent"
  ansible.builtin.shell: "amazon-ssm-agent -register -y -id {% raw %}{{aws_ssm_activation_var.ActivationId}}{% endraw %} -code {% raw %}{{aws_ssm_activation_var.ActivationCode}}{% endraw %} -region {% raw %}{{aws_region}}{% endraw %}"
  register: aws_ssm_registration

- name: Retrieve SSM Instance Id from registration output
  set_fact:
    aws_ssm_instance_id: "{% raw %}{{ aws_ssm_registration.stdout | regex_search('(\\w+-\\w+)$', multiline=True, ignorecase=True) }}{% endraw %}"
```

Ces deux tâches du playbook sont dédiées à l'enregistrement de l'agent Amazon SSM (Systems Manager) sur le Raspberry Pi et à la récupération de l'identifiant d'instance SSM associé.

* _Tâche d'enregistrement de l'agent Amazon SSM_ :
    La première tâche utilise le module ansible.builtin.shell pour exécuter une commande en ligne de commande. Dans ce cas, elle lance la commande _"amazon-ssm-agent -register"_, suivie de plusieurs options telles que _"-y"_ pour confirmer automatiquement l'enregistrement, _"-id"_ pour spécifier l'identifiant d'activation obtenu précédemment, _"-code"_ pour fournir le code d'activation, et _"-region"_ pour préciser la région AWS. Le résultat de cette opération est enregistré dans la variable aws_ssm_registration.

* _Tâche de récupération de l'identifiant d'instance SSM_ :
    La deuxième tâche utilise le module set_fact pour définir une nouvelle variable appelée _aws_ssm_instance_id_. Elle utilise le filtre regex_search pour extraire l'identifiant d'instance SSM à partir de la sortie de la tâche d'enregistrement. La regex _(\\w+-\\w+)$_ vise à capturer le motif d'identifiant d'instance SSM dans la sortie, et la variable nouvellement créée _aws_ssm_instance_id_ stocke cette information.

 L'identifiant d'instance SSM obtenu est ensuite utilisé pour identifier de manière unique cet agent dans l'environnement AWS, facilitant ainsi sa gestion et sa surveillance à distance.

### Playbook Ansible

Pour tirer parti de cette intégration, un référentiel GitHub est mis à votre disposition à l'adresse suivante : [ansible-raspberrypi](https://github.com/gautric/ansible-raspberrypi). Ce référentiel a été créé dans le but de simplifier le déploiement de l'agent AWS Systems Manager (SSM) au sein de votre flotte de Raspberry Pi.

```bash
gautric@MacBookProM2 ansible-raspberrypi % ansible-playbook -i hosts pi_aws_ssm.yml 
```

Si tout se passe bien, vous devriez obtenir le résultat suivant dans votre console.

```text
PLAY [ssm_hosts] ****************************************************************

TASK [Gathering Facts] **********************************************************
ok: [raspberrypi.local]

TASK [aws_ssm : Create AWS SSM Activation] **************************************
ok: [raspberrypi.local -> localhost]

TASK [aws_ssm : Convert output to fact] *****************************************
ok: [raspberrypi.local -> localhost]

TASK [aws_ssm : Download Amazon SSM Agent] **************************************
ok: [raspberrypi.local]

TASK [aws_ssm : Install a Amazon SSM Agent .deb package] ************************
ok: [raspberrypi.local]

TASK [aws_ssm : Stop Amazon SSM Agent] ******************************************
ok: [raspberrypi.local]

TASK [aws_ssm : Register Amazon SSM Agent] **************************************
ok: [raspberrypi.local]

TASK [aws_ssm : Retrieve SSM Instance Id from registration output] **************
ok: [raspberrypi.local]

TASK [aws_ssm : Start Amazon SSM Agent] *****************************************
ok: [raspberrypi.local]

TASK [aws_ssm : Enable Amazon SSM Agent] ****************************************
ok: [raspberrypi.local]

TASK [aws_ssm : Print SSM Instance Id] ******************************************
ok: [raspberrypi.local] => {
    "msg": "mi-0123456789abcdef"
}

TASK [aws_ssm : Print SSH Instance Id command] **********************************
ok: [raspberrypi.local] => {
    "msg": "ssh pi@mi-0123456789abcdef"
}

PLAY RECAP **********************************************************************
raspberrypi.local          : ok=12   changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

#### Photo finish

Une fois l'agent AWS Systems Manager déployé sur votre flotte de Raspberry Pi, vous pouvez retrouver votre instance RaspberryPi directement dans votre console AWS. Cette intégration transparente offre une visibilité centralisée sur l'état opérationnel de chaque dispositif, vous permettant de surveiller, de diagnostiquer et de prendre des mesures à distance.

![AWS Console](/img/aws-ssm.png)

### Connexion SSH au dessus de AWS SSM Session Manager

Afin de pouvoir se connecter à votre instance Raspberry Pi, il vous faudra activer le mode Advanced d'AWS SSM. 

{{< notice info >}}
Attention avec les coûts de AWS SSM en mode Advanced. N'oubliez pas de revenir au mode Standard et donc free tier. [Information sur le pricing du mode Advanced](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-managedinstances-advanced.html).
{{< /notice >}}

Ensuite, il sera possible de démarrer une session distante via la commande SSH légèrement configurée en utilisant une directive __ProxyCommand__ dans votre fichier _.ssh/config_.


Voici la commande de la CLI AWS pour activer le mode Advanced de AWS SSM, qui vous permettra d'ouvrir la session à distance vers votre Raspberry Pi.

```bash
aws ssm update-service-setting \
    --setting-id arn:aws:ssm:eu-west-1:687441526170:servicesetting/ssm/managed-instance/activation-tier \
    --setting-value advanced
```

Le fichier _.ssh/config_ afin d'utiliser la feature Session Manager dans SSH.

```text
host i-* mi-*
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

La commande SSH vers votre instance Raspberry Pi.

```bash
$> ssh pi@mi-0123456789abcdef
```

_Et voilà ..._

## URL

* [Repo Github](https://github.com/gautric/ansible-raspberrypi)
* [IAM Role pour SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-service-role.html)
* [Allow and controlling permissions for SSH connections through Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html)
* [Pricing Session Manager Adv](https://aws.amazon.com/systems-manager/pricing/#Session_Manager)
