---
title: "How to manage Exception inside a jBPM WorkItemHandler custom component"
date: 2020-10-28 15:00:00
categories: ["blog"]
tags: ["en", "jBPM", "WorkItemHandler", "Exception"]
---

When we develop a BPMN process we have to handle correctly Error. An Error can be raised by any component during the processus instance and specially into a Work Item Handler node. This kind of node in jBPM is a Java component implementing the WorkItemHandler interface. Usually in Java program we manage error via Exception mechanism.

> How to manage Exception inside jBPM WorkItemHandler custom component.

To illustrate how to use Exception/Error I propose to create a sample error process. This example will demonstrate how jBPM can transform Java exceptions into BPMN errors, allowing for proper error handling within your business processes.

## A quick sample 

Let's create a very common process with Work Item Handler (WIH). This pattern is frequently used when integrating external systems or services into your BPMN workflow.

![BPMN process with error handling](/img/2020-10-28-jbpm-exception-handling/bpmn-process-error.png)

This WIH has to implement `org.kie.api.runtime.process.WorkItemHandler` jBPM's interface and its two methods `executeWorkItem` and `abortWorkItem`. The first method is the nominal execution. The second one is called by jBPM to reset the workitem handler action.

```java
@Override
public void executeWorkItem(WorkItem workItem, WorkItemManager manager) {
    LOG.info("Nominal {}", WorkItemHandler.class);
    throw new net.a.g.jbpm.pattern.util.Exception();
}

@Override
public void abortWorkItem(WorkItem workItem, WorkItemManager manager) {
    LOG.info("Abort {}", WorkItemHandler.class);
}
```

As you can see this implementation throws the exception `net.a.g.jbpm.pattern.util.Exception`. This is a custom exception that we'll use to demonstrate error handling in our process.

## Java Exception to BPMN Error in jBPM engine

In BPMN, we just have to use/copy paste the full qualified exception name to be handled. 
jBPM engine gonna catch this exception and create an internal signal. This signal reroutes the process instance to the error branch.
The signal looks like `Error-${internalUniqueId}-${exceptionClassName}`, and in our case `Error-_72474602-751C-43FD-9D4F-2598A16468D1-net.a.g.jbpm.pattern.util.Exception` (don't care about the middle UUID it is internal and automatic). 

![Error handling in BPMN](/img/2020-10-28-jbpm-exception-handling/bpmn-error-handling.png)

You can map the error instance to a process variable and reuse it inside the rest next nodes as usual. This allows you to access error details in subsequent steps of your process.

![Error mapping to process variables](/img/2020-10-28-jbpm-exception-handling/bpmn-error-mapping.png)

{{< notice info >}}
In most case and in a real life, we should wrap all exceptions into normalized ones.
{{< /notice >}}

## Unit Test to prove integration

As usual, no test no proof. Here is a common sample test. We have to register our WIH into the KieSession. We also created a listener to illustrate all steps in the process execution.

```java
public class ExceptionToErrorTest extends JbpmJUnitBaseTestCase {
    private static final Logger LOG = LoggerFactory.getLogger(ExceptionToErrorTest.class);

    @Test
    public void test() {
        ExceptionToErrorTest.LOG.debug("jBPM unit test sample");

        final RuntimeManager runtimeManager = createRuntimeManager("net/a/g/jbpm/pattern/ExceptionToErrorProcess.bpmn");
        final RuntimeEngine runtimeEngine = getRuntimeEngine(null);
        final KieSession kieSession = runtimeEngine.getKieSession();
        kieSession.getWorkItemManager().registerWorkItemHandler("WorkItemHandler", new WorkItemHandler());

        kieSession.addEventListener(new ProcessEventListener() {

            private Logger LOG = LoggerFactory.getLogger("net.a.g.jbpm.pattern.ProcessEventListener");

            @Override
            public void beforeProcessStarted(ProcessStartedEvent event) {
                LOG.info("Start Processus : {}", event.getProcessInstance().getProcessName());
            }

            @Override
            public void beforeNodeTriggered(ProcessNodeTriggeredEvent event) {
                LOG.info("Node Called : {}", event.getNodeInstance().getNodeName());
            }

            @Override
            public void afterProcessStarted(ProcessStartedEvent event) {
                LOG.info("End Processus : {}", event.getProcessInstance().getProcessName());
            }

            // ... OMIT ...
        });

        final ProcessInstance processInstance = kieSession.startProcess("ExceptionToErrorProcess");

        assertProcessInstanceNotActive(processInstance.getId(), kieSession);
        assertNodeTriggered(processInstance.getId(), "ScriptTask");
        assertNodeTriggered(processInstance.getId(), "Error End");
        
        runtimeManager.disposeRuntimeEngine(runtimeEngine);
        runtimeManager.close();
    }
}
```

And here is the result. The log output clearly shows the flow of execution through our process, including the error handling.

```log
[INFO] Running net.a.g.jbpm.pattern.ExceptionToErrorTest
16:42:26.543 [main] DEBUG org.jbpm.services.task.identity.AbstractUserGroupInfo - Callback properties will be loaded from classpath:/usergroups.properties
16:42:26.550 [main] DEBUG org.jbpm.services.task.identity.JBossUserGroupCallbackImpl - Loaded properties {doctor=users,PM, Administrator=Administrators, frontDesk=users,PM, manager=managers,HR, mary=admins,managers,users,HR, admin=admins,managers,users,webdesigners,functionalanalysts, sales-rep=admin,managers,users,sales, john=admins,managers,users,PM, salaboy=admins,users, krisv=admins,managers,users}
16:42:26.551 [main] DEBUG org.jbpm.test.JbpmJUnitBaseTestCase - Configuring entire test case to have data source enabled false and session persistence enabled false with persistence unit name org.jbpm.persistence.jpa
16:42:26.560 [main] DEBUG net.a.g.jbpm.pattern.ExceptionToErrorTest - jBPM unit test sample
16:42:26.622 [main] DEBUG org.kie.api.internal.utils.ServiceDiscoveryImpl - Loading kie.conf from  jar:file:/Users/gautric/.m2/repository/org/kie/kie-internal/7.44.0.Final/kie-internal-7.44.0.Final.jar!/META-INF/kie.conf in classloader jdk.internal.loader.ClassLoaders$AppClassLoader@277050dc

... OMIT ...

16:42:28.835 [main] DEBUG org.kie.internal.runtime.manager.deploy.DeploymentDescriptorManager - No descriptor found returning default instance
16:42:28.874 [main] DEBUG org.jbpm.runtime.manager.impl.error.ExecutionErrorManagerImpl - Error handling filters [TaskExecutionErrorFilter [accepts=CannotAddTaskException, ignores=PermissionDeniedException], ProcessExecutionErrorFilter [accepts=WorkflowRuntimeException, ignores=], DBExecutionErrorFilter [accepts=SQLException,HibernateException, ignores=]]
16:42:28.874 [main] DEBUG org.jbpm.runtime.manager.impl.error.ExecutionErrorManagerImpl - Execution error storage org.jbpm.runtime.manager.impl.error.DefaultExecutionErrorStorage@2cc03cd1
16:42:28.875 [main] DEBUG org.jbpm.runtime.manager.impl.error.ExecutionErrorManagerImpl - Error event listeners java.util.ServiceLoader[org.kie.internal.runtime.error.ExecutionErrorListener]
16:42:28.876 [main] INFO org.jbpm.runtime.manager.impl.AbstractRuntimeManager - SingletonRuntimeManager is created for default-singleton
16:42:28.970 [main] INFO net.a.g.jbpm.pattern.ProcessEventListener - Start Processus : ExceptionToErrorProcess
16:42:28.980 [main] INFO net.a.g.jbpm.pattern.ProcessEventListener - Node Called : Nominal Start
16:42:28.982 [main] INFO net.a.g.jbpm.pattern.ProcessEventListener - Node Called : WorkItemHandler
16:42:28.987 [main] INFO net.a.g.jbpm.pattern.wih.WorkItemHandler - Nominal class net.a.g.jbpm.pattern.wih.WorkItemHandler
16:42:28.991 [main] DEBUG org.jbpm.workflow.instance.impl.WorkflowProcessInstanceImpl - Signal Error-_72474602-751C-43FD-9D4F-2598A16468D1-net.a.g.jbpm.pattern.util.Exception received with data Exception [uuid=9aecb8c7-99af-4d41-b8fa-df97f3ae1242] in process instance 1
16:42:28.994 [main] INFO net.a.g.jbpm.pattern.wih.WorkItemHandler - Abort class net.a.g.jbpm.pattern.wih.WorkItemHandler
16:42:28.995 [main] INFO net.a.g.jbpm.pattern.ProcessEventListener - Node Called : ScriptTask
16:42:28.995 [main] ERROR net.a.g.jbpm.pattern.ScriptTask - Task Error Branch Exception [uuid=9aecb8c7-99af-4d41-b8fa-df97f3ae1242]
16:42:28.995 [main] INFO net.a.g.jbpm.pattern.ProcessEventListener - Node Called : Error End
16:42:28.996 [main] INFO net.a.g.jbpm.pattern.ProcessEventListener - End Processus : ExceptionToErrorProcess
16:42:28.997 [main] DEBUG org.drools.core.common.DefaultAgenda - State was INACTIVE is now DISPOSED
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.821 s - in net.a.g.jbpm.pattern.ExceptionToErrorTest
```

As you can see an internal signal is raised and received by the jBPM engine:

```log
16:42:28.991 [main] DEBUG org.jbpm.workflow.instance.impl.WorkflowProcessInstanceImpl - Signal Error-_72474602-751C-43FD-9D4F-2598A16468D1-net.a.g.jbpm.pattern.util.Exception received with data Exception [uuid=9aecb8c7-99af-4d41-b8fa-df97f3ae1242] in process instance 1
```

We passed also through `ScriptTask` Node and finish the process with the `Error End` meaning we finish the process with a BPMN Error Termination as expected.

It means that internally jBPM engine handles Error as specific signal. The signal starts with `Error` code, followed by the UUID's node and finishes with the full qualified name of the exception. This mechanism allows for seamless integration between Java exception handling and BPMN error events.

## Conclusion

Managing Java Exception with jBPM is simple and intuitive. Of course, you can deal with the whole Java Exception API to have a very flexible, scalable mechanism. This approach allows you to create robust error handling strategies in your business processes, ensuring that exceptions are properly caught and managed within the BPMN workflow.

Feel free to test my sample, I let all links below, feedback will also be appreciated.

### Links

* [The Full project](https://github.com/gautric/bpmn-pattern) but you have to do some cleanup.
* [ExceptionToErrorProcess.bpmn](https://github.com/gautric/bpmn-pattern/blob/master/src/main/resources/net/a/g/jbpm/pattern/ExceptionToErrorProcess.bpmn)
* [Custom WorkItemHandler.java](https://github.com/gautric/bpmn-pattern/blob/master/src/main/java/net/a/g/jbpm/pattern/wih/WorkItemHandler.java)
* [Custom Exception.java](https://github.com/gautric/bpmn-pattern/blob/master/src/main/java/net/a/g/jbpm/pattern/util/Exception.java)
* [The Full Test Case.java](https://github.com/gautric/bpmn-pattern/blob/master/src/test/java/net/a/g/jbpm/pattern/ExceptionToErrorTest.java)
