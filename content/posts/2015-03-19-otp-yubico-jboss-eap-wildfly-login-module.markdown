---
title: "Yubico OTP et JBoss EAP 6 ou Wildfly 8"
date: 2015-03-19
categories: ["blog"]
tags: ["fr", "otp", "yubico", "yubikey", "jboss", "eap", "wildfly"]
---

# Intégration de l'authentification forte avec Yubikey dans JBoss

[Yubikey](https://www.yubico.com/) est une **clé de sécurité matérielle** qui permet d'implémenter une **authentification forte** (2FA) lors de la connexion à un site web ou une application (services bancaires, webmail, applications d'entreprise, etc.). De plus en plus d'organisations intègrent cette technologie pour renforcer leur sécurité.

## Principe de fonctionnement

Le principe est simple : l'utilisateur fournit un **token à usage unique** généré par sa clé Yubikey comme second facteur d'authentification. Ce token, cryptographiquement sécurisé, est vérifié par le système et change à chaque utilisation. Même intercepté, il ne peut pas être réutilisé, ce qui renforce considérablement la sécurité.

> **Objectif** : Intégrer une authentification **OTP** (One-Time Password) via Yubico avec un serveur JBoss EAP ou Wildfly pour sécuriser des applications Java EE.

## Première étape : Préparer le matériel et l'environnement

Les éléments nécessaires :

* **Une clé Yubico** ([boutique officielle](https://store.yubico.com/))
  * Solution testée avec YubiKey NEO-n
  * Compatible avec YubiKey Nano ou YubiKey Neo
  * Chaque utilisateur doit disposer de sa propre clé

* **Un serveur d'application Java EE**
  * [JBoss EAP](http://www.redhat.com/en) (version commerciale Red Hat)
  * ou [Wildfly](http://www.wildfly.org/) (version communautaire)
  * Testé avec JBoss EAP 6.3
  * Compatible JBoss EAP 6.X et Wildfly 8+

**Important** : Cette implémentation utilise le **Yubico Cloud Service** pour la validation des tokens. Le serveur d'application doit donc disposer d'une connexion Internet.

## Deuxième étape : Compiler le client Java Yubico

La première opération consiste à compiler le client Java officiel fourni par Yubico :

```bash
# Cloner le dépôt Git du client Java Yubico
greg@a.net> git clone git@github.com:Yubico/yubico-java-client.git  
greg@a.net> cd yubico-java-client  

# Compiler le projet avec Maven
greg@a.net> mvn clean package  

.... OMIT .....  

[INFO] ------------------------------------------------------------------------  
[INFO] Reactor Summary:  
[INFO]  
[INFO] Yubico OTP validation client ....................... SUCCESS [  0.003 s]  
[INFO] Yubico OTP validation client protocol 1 ............ SUCCESS [  2.254 s]  
[INFO] Yubico OTP validation client protocol 2 ............ SUCCESS [  3.798 s]  
[INFO] Yubico JAAS module ................................. SUCCESS [  0.710 s]  
[INFO] yubico-demo-server ................................. SUCCESS [  2.782 s]  
[INFO] ------------------------------------------------------------------------  
[INFO] BUILD SUCCESS  
[INFO] ------------------------------------------------------------------------  
[INFO] Total time: 9.704 s  
[INFO] Finished at: 2015-03-01T16:42:11+01:00  
[INFO] Final Memory: 39M/228M  
[INFO] ------------------------------------------------------------------------  
greg@a.net>  
```

La compilation produit plusieurs fichiers JAR. Deux sont essentiels :

1. **Client de validation OTP** (protocole 2) :
   - Fichier : `yubico-validation-client2-{Version}.jar`
   - Rôle : communiquer avec le Yubico Cloud pour vérifier les tokens OTP

2. **Module JAAS** :
   - Fichier : `yubico-jaas-module-{Version}.jar`
   - Rôle : fournir le **login module** à intégrer dans JBoss


Le module JAAS fait le lien entre l'application JBoss et le service Yubico Cloud. Il utilise le client de validation pour vérifier les tokens et gérer l'authentification.

## Troisième étape : Créer le module JBoss pour Yubico

JBoss/Wildfly utilise un **système modulaire** pour organiser ses dépendances. Yubico n'étant pas inclus par défaut, un module personnalisé est nécessaire.

1. Créer un fichier `module.xml` :

```xml
<?xml version="1.0" encoding="UTF-8"?>  
<!--  
  ~ JBoss, Home of Professional Open Source.  
  ~ Copyright 2014, Red Hat, Inc., and individual contributors  
  ~ as indicated by the @author tags. See the copyright.txt file in the  
  ~ distribution for a full listing of individual contributors.  
  ~  
  ~ This is free software; you can redistribute it and/or modify it  
  ~ under the terms of the GNU Lesser General Public License as  
  ~ published by the Free Software Foundation; either version 2.1 of  
  ~ the License, or (at your option) any later version.  
  ~  
  ~ This software is distributed in the hope that it will be useful,  
  ~ but WITHOUT ANY WARRANTY; without even the implied warranty of  
  ~ MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU  
  ~ Lesser General Public License for more details.  
  ~  
  ~ You should have received a copy of the GNU Lesser General Public  
  ~ License along with this software; if not, write to the Free  
  ~ Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  
  ~ 02110-1301 USA, or see the FSF site: http://www.fsf.org.  
  --> 
<module xmlns="urn:jboss:module:1.1" name="com.yubico">  
   <resources>  
     <resource-root path="yubico-jaas-module-3.0.0-SNAPSHOT.jar"/>  
     <resource-root path="yubico-validation-client2-3.0.0-SNAPSHOT.jar"/>  
     <resource-root path="vt-ldap-3.3.3.jar"/>  
   </resources>  
   <dependencies>  
     <module name="org.picketbox"/>  
     <module name="javax.api"/>  
     <module name="org.slf4j"/>  
     <module name="org.apache.commons.codec" />  
     <module name="javax.security.jacc.api" />   <!-- pour utilisation future -->  
     <module name="javax.servlet.api"/>          <!-- pour utilisation future -->  
     <module name="org.jboss.common-core"/>      <!-- pour utilisation future -->  
   </dependencies>  
</module>  
```

2. Créer le répertoire du module et copier les fichiers :

```bash
# Créer le répertoire du module
mkdir -p $JBOSS_HOME/modules/com/yubico/main

# Copier le fichier de configuration du module
cp module.xml $JBOSS_HOME/modules/com/yubico/main/

# Copier les JAR compilés précédemment
cp yubico-java-client/jaas/target/yubico-jaas-module-3.0.0-SNAPSHOT.jar $JBOSS_HOME/modules/com/yubico/main/
cp yubico-java-client/v2client/target/yubico-validation-client2-3.0.0-SNAPSHOT.jar $JBOSS_HOME/modules/com/yubico/main/
```

3. Copier également la dépendance LDAP :

```bash
# Chemin typique dans le cache Maven local
cp ~/.m2/repository/edu/vt/middleware/vt-ldap/3.3.3/vt-ldap-3.3.3.jar $JBOSS_HOME/modules/com/yubico/main/
```

**Astuce** : Sur un système Unix, des liens symboliques facilitent le développement et le débogage :

```bash
# Au lieu de copier les fichiers, créez des liens symboliques
ln -s $(pwd)/yubico-java-client/jaas/target/yubico-jaas-module-3.0.0-SNAPSHOT.jar $JBOSS_HOME/modules/com/yubico/main/
ln -s $(pwd)/yubico-java-client/v2client/target/yubico-validation-client2-3.0.0-SNAPSHOT.jar $JBOSS_HOME/modules/com/yubico/main/
```

## Quatrième étape : Obtenir les identifiants API Yubico

Pour que JBoss puisse communiquer avec le **Yubico Cloud** et valider les tokens OTP, des identifiants d'API sont nécessaires.

1. Se rendre sur le site officiel :
   [https://upgrade.yubico.com/getapikey/](https://upgrade.yubico.com/getapikey/)

2. Remplir le formulaire avec une adresse email et un OTP généré par la clé Yubico.

![Formulaire de demande d'API Yubico](/img/2015-03-19-otp-yubico-jboss/yubico-api-request-form.png)

3. Deux informations sont fournies en retour :
   - **Client ID** : identifiant numérique de l'application
   - **Secret Key** (Client Key) : clé secrète pour signer les requêtes

![Confirmation des identifiants API Yubico](/img/2015-03-19-otp-yubico-jboss/yubico-api-credentials-confirmation.png)

**Important** : Ces identifiants seront nécessaires à la [septième étape](#septième-étape--la-configuration-de-linstance-jboss) pour configurer l'instance JBoss.

## Cinquième étape : Collecter les identifiants publics des clés Yubico

Pour associer chaque clé à son utilisateur, il faut collecter le **PublicId** de chaque clé.

1. Utiliser l'outil de démonstration officiel :
   [https://demo.yubico.com/start/otp/standard](https://demo.yubico.com/start/otp/standard)

2. Insérer la clé et appuyer sur le bouton pour générer un OTP.

![Page de démonstration Yubico](/img/2015-03-19-otp-yubico-jboss/yubico-demo-page.png)

3. Le système affiche les informations de la clé, dont le PublicId :

![Informations de la clé Yubico](/img/2015-03-19-otp-yubico-jboss/yubico-key-info.png)

4. Noter la valeur du champ **Identity**.

Le **PublicId** est une caractéristique unique et permanente de chaque clé. Il correspond aux 12 premiers caractères de tout OTP généré. Ce PublicId permet d'associer chaque clé physique à un compte utilisateur.

## Sixième étape : Créer le fichier de correspondance clés/utilisateurs

Un fichier de correspondance est nécessaire pour le module JAAS :

1. Créer le fichier `id2name_textfile.conf` dans le répertoire de configuration JBoss :

```bash
touch ${jboss.server.config.dir}/id2name_textfile.conf
```

2. Ajouter une entrée par utilisateur :

```properties
# Format: yk.<PublicId>.user = <login>
# Exemple pour un utilisateur nommé "john" avec une clé dont le PublicId est "ccccccbdtvth"
yk.ccccccbdtvth.user = john

# Exemple pour un utilisateur nommé "alice" avec une clé dont le PublicId est "vvdftghjkloi"
yk.vvdftghjkloi.user = alice
```

Cette configuration garantit que :

- Seules les clés enregistrées peuvent servir à l'authentification
- Chaque clé est liée à un seul utilisateur
- Un utilisateur ne peut pas utiliser la clé d'un autre

**Note** : En production, une source de données plus robuste (base de données, annuaire LDAP) peut remplacer ce fichier, notamment pour un grand nombre d'utilisateurs.

## Septième étape : Configurer le domaine de sécurité dans JBoss

Un **security domain** dédié doit être créé dans la configuration JBoss/Wildfly.

1. Ouvrir le fichier de configuration principal :
   - Instance autonome : `$JBOSS_HOME/standalone/configuration/standalone.xml`
   - Instance en cluster : `$JBOSS_HOME/domain/configuration/domain.xml`

2. Localiser la section `<security-domains>` dans le sous-système `security` :

```xml
<subsystem xmlns="urn:jboss:domain:security:1.2">
    <security-domains>
        <!-- Domaines de sécurité existants -->
```

3. Ajouter le domaine de sécurité Yubico :

```xml
<security-domain name="yubico-auth" cache-type="default">  
    <authentication>  
        <login-module code="com.yubico.jaas.YubikeyLoginModule" flag="required" module="com.yubico">  
            <!-- Remplacez ces valeurs par celles obtenues à l'étape 4 -->
            <module-option name="clientId" value="12123"/>  
            <module-option name="clientKey" value="U873jhsYT629uuh7gban65+p2Io="/> <!-- client Key aka secret Key -->  
            <module-option name="id2name_textfile" value="${jboss.server.config.dir}/id2name_textfile.conf"/>  
        </login-module>  
    </authentication>  
    <mapping>  
        <!-- Configuration des rôles - exemple simple -->
        <mapping-module code="SimpleRoles" type="role">  
            <!-- Associe un rôle à un utilisateur identifié par son PublicId -->
            <module-option name="ccccccbdtvth" value="manager"/>  
            <module-option name="vvdftghjkloi" value="admin"/>  
        </mapping-module>  
    </mapping>  
</security-domain>  
```

4. Adapter la configuration :
   - Remplacer `clientId` et `clientKey` par les valeurs de l'étape 4
   - Ajuster le chemin du fichier de correspondance si nécessaire
   - Configurer les rôles appropriés

**Options avancées** : En production, il est possible de récupérer les rôles depuis LDAP ou une base de données, de combiner l'authentification par mot de passe avec l'OTP Yubico, ou de configurer le cache pour optimiser les performances.

Redémarrer le serveur JBoss après ces modifications.

## Huitième étape : Configurer l'application Java EE

L'application web doit référencer le **security domain** créé. Créer ou modifier le fichier `jboss-web.xml` dans `WEB-INF` :

```xml
<?xml version="1.0" encoding="UTF-8"?>  
<jboss-web>  
   <security-domain>yubico-auth</security-domain>  
</jboss-web>
```

Ce fichier indique à l'application d'utiliser le domaine de sécurité Yubico pour l'authentification et l'autorisation.

## Neuvième étape : Implémenter le formulaire d'authentification

Un formulaire de connexion adapté est nécessaire :

1. Créer une page de login (par exemple `login.jsp`) :

```html
<form method="post" action="j_security_check">  
  <div>
    <label for="username">Nom d'utilisateur :</label>
    <input type="text" id="username" name="j_username">  
  </div>
  <div>
    <label for="password">Token Yubico :</label>
    <input type="password" id="password" name="j_password">  
  </div>
  <div>
    <input type="submit" value="Connexion">
  </div>
</form>  
```

2. Configurer les contraintes de sécurité dans `web.xml` :

```xml
<web-app>  
  <security-constraint>  
    <web-resource-collection>  
      <web-resource-name>Zone sécurisée</web-resource-name>  
      <url-pattern>/secure/*</url-pattern>  
    </web-resource-collection>  
    <auth-constraint>  
      <role-name>admin</role-name>  
      <role-name>manager</role-name>  
    </auth-constraint>  
  </security-constraint>  

  <login-config>  
    <auth-method>FORM</auth-method>  
    <realm-name>Authentification utilisateur</realm-name>  
    <form-login-config>  
      <form-login-page>/login.jsp</form-login-page>  
      <form-error-page>/error.jsp</form-error-page>  
    </form-login-config>  
  </login-config>  

  <security-role>  
    <role-name>admin</role-name>  
  </security-role>  
  <security-role>  
    <role-name>manager</role-name>  
  </security-role>  
</web-app>  
```

**Utilisation** : l'utilisateur saisit son nom dans `j_username`, place le curseur dans `j_password`, puis appuie sur le bouton de sa clé Yubico. L'OTP est automatiquement saisi dans le champ.

L'authentification en mode BASIC est également possible selon les besoins.

## Dixième étape : Tester et déboguer l'intégration

Une fois l'ensemble en place, il est important de valider le fonctionnement. Activer le mode log verbeux dans la configuration JBoss facilite le diagnostic.

Exemple de logs lors d'une authentification réussie :

```log
TRACE [org.jboss.as.web.security]  Begin invoke, caller=null  
DEBUG [org.apache.catalina.authenticator]  Security checking request GET /form-auth/  
DEBUG [org.apache.catalina.authenticator]   Calling hasUserDataPermission()  
DEBUG [org.apache.catalina.authenticator]   Calling authenticate()  
DEBUG [org.apache.catalina.authenticator]  Save request in session 'bIbbT0CwH9ICDj-apERnL29O'  
DEBUG [org.apache.catalina.authenticator]   Failed authenticate() test  
TRACE [org.jboss.as.web.security]  End invoke, caller=null  
TRACE [org.jboss.as.web.security]  Begin invoke, caller=null  
DEBUG [org.apache.catalina.authenticator]  Security checking request POST /form-auth/j_security_check  
DEBUG [org.apache.catalina.authenticator]  Authenticating username '<LOGIN_USER>'  
DEBUG [com.yubico.jaas.YubikeyLoginModule]  Initializing YubikeyLoginModule  
DEBUG [com.yubico.jaas.YubikeyLoginModule]  Trying to instantiate com.yubico.jaas.impl.YubikeyToUserMapImpl  
DEBUG [com.yubico.jaas.YubikeyLoginModule]  Begin OTP login  
TRACE [com.yubico.jaas.YubikeyLoginModule]  Checking OTP <XXXXXXXXXXXXYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY>  
TRACE [com.yubico.jaas.YubikeyLoginModule]  OTP <XXXXXXXXXXXXYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY> verify result : OK  
INFO  [com.yubico.jaas.YubikeyLoginModule]  OTP verified successfully (YubiKey id XXXXXXXXXXXX)  
DEBUG [com.yubico.jaas.YubikeyLoginModule]  Check if YubiKey XXXXXXXXXXXX belongs to user LOGIN_USER  
TRACE [com.yubico.jaas.YubikeyLoginModule]  In commit()  
DEBUG [com.yubico.jaas.YubikeyLoginModule]  Committing principal <YubikeyPrincipal>XXXXXXXXXXXX  
TRACE [org.jboss.as.web.security]  User: <LOGIN_USER> is authenticated  
DEBUG [org.apache.catalina.authenticator]  Authentication of '<LOGIN_USER>' was successful  
DEBUG [org.apache.catalina.authenticator]  Redirecting to original '/form-auth/'  
DEBUG [org.apache.catalina.authenticator]   Failed authenticate() test ??/form-auth/j_security_check  
TRACE [org.jboss.as.web.security]  End invoke, caller=null  
TRACE [org.jboss.as.web.security]  Begin invoke, caller=null  
TRACE [org.jboss.as.web.security]  Restoring principal info from cache  
DEBUG [org.apache.catalina.authenticator]  Security checking request GET /form-auth/  
DEBUG [org.apache.catalina.authenticator]   Calling hasUserDataPermission()  
DEBUG [org.apache.catalina.authenticator]   Calling authenticate()  
DEBUG [org.apache.catalina.authenticator]  Restore request from session 'bIbbT0CwH9ICDj-apERnL29O'  
DEBUG [org.apache.catalina.authenticator]  Authenticated '<LOGIN_USER>' with type 'FORM'  
DEBUG [org.apache.catalina.authenticator]  Proceed to restored request  
DEBUG [org.apache.catalina.authenticator]   Calling accessControl()  
TRACE [org.jboss.as.web.security]  hasRole:RealmBase says:true::Authz framework says:true:final=true  
TRACE [org.jboss.as.web.security]  hasResourcePermission:RealmBase says:true::Authz framework says:true:final=true  
DEBUG [org.apache.catalina.authenticator]   Successfully passed all security constraints  
TRACE [org.jboss.as.web.security]  End invoke, caller=null  
```

Les informations clés dans ces traces :

- `<LOGIN_USER>` : le nom d'utilisateur saisi
- `XXXXXXXXXXXXYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY` : l'OTP complet envoyé au Yubico Cloud
- `XXXXXXXXXXXX` : le **PublicId** de la clé (12 premiers caractères de l'OTP)

Les messages à surveiller :
- `OTP verified successfully` : token validé par le Yubico Cloud
- `User: <LOGIN_USER> is authenticated` : authentification réussie
- `Successfully passed all security constraints` : autorisations vérifiées

## Conclusion

L'intégration de l'**authentification forte** Yubikey dans JBoss/Wildfly renforce la sécurité des systèmes d'information. Cette approche à deux facteurs (nom d'utilisateur + token OTP) protège contre le hameçonnage, les fuites de mots de passe et d'autres menaces courantes.

La solution est adaptée aux environnements d'entreprise et peut être étendue pour s'intégrer avec LDAP ou des bases de données utilisateurs.

### Liens utiles :

* <img id="en" src="/img/flag-uk.png" width="23" height="23" alt="English version"/> [Yubico OTP and JBoss EAP 6 or Wildfly 8](https://developer.jboss.org/wiki/YubicoOTPAndJBossEAP6OrWildfly8)
* [Documentation du client Java Yubico](http://yubico.github.io/yubico-java-client/)
* [Authentication Modules - JBoss AS 7.0](https://docs.jboss.org/author/display/AS7/Authentication+Modules)
* [JBoss AS7: Security : Custom Login Modules](https://developer.jboss.org/wiki/JBossAS7SecurityCustomLoginModules)
* [Creating Custom Login Modules In JBoss AS 7 (and Earlier)](http://java.dzone.com/articles/creating-custom-login-modules)

### Glossaire :
* [OTP (One-Time Password)](http://en.wikipedia.org/wiki/One-time_password) — Mot de passe à usage unique
* [2FA (Two-Factor Authentication)](https://en.wikipedia.org/wiki/Multi-factor_authentication) — Authentification à deux facteurs
* [JAAS (Java Authentication and Authorization Service)](https://en.wikipedia.org/wiki/Java_Authentication_and_Authorization_Service) — Framework Java pour l'authentification et l'autorisation