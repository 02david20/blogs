---
title: "When Kubernetes Randomly Evicts Your Pods: The Ephemeral Storage Trap"
description: "Pods were being evicted with CPU and memory at rest. The cause was node disk pressure and a Job spec with no ephemeral-storage request."
pubDate: 2026-09-27T09:00:00
tags: ["Kubernetes", "EKS", "DevOps"]
---

An operator in our cluster creates short-lived `Job`s for background work. Last week some of those worker pods started getting evicted, and at first it looked random:

- CPU was fine, and so was memory.
- The evicted pods were spread across different nodes.
- No PersistentVolumes were involved.

The cause was **ephemeral storage pressure**, made worse by a pod spec that never declared any ephemeral storage.

---

## The setup

Here's a simplified version of the generated Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: example-operation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: worker
          image: example/worker:latest
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "512Mi" }
```

It sets CPU and memory, but nothing for `ephemeral-storage`. The worker writes logs and temp files while it runs.

## The clue

```bash
kubectl describe pod <pod-name>
```

```text
The node was low on resource: ephemeral-storage.
```

Kubelet wasn't evicting these pods because they ran out of CPU or memory. The **node** was low on local disk.

```bash
kubectl describe node <node-name>
```

```text
Conditions:
  Type             Status
  MemoryPressure   False
  DiskPressure     True
  PIDPressure      False
```

## "No volume" doesn't mean "no storage"

Ephemeral storage is node-local disk that isn't backed by a PersistentVolume. A pod with no mounts still uses it through:

- the container's writable layer (`/tmp`, caches, anything written to the image filesystem)
- container logs (stdout and stderr)
- `emptyDir` volumes

Leaving out an `ephemeral-storage` request doesn't stop a pod from using disk. It only means Kubernetes doesn't know how much the pod needs.

## How eviction works here

Kubelet watches filesystem signals (`nodefs.available`, `nodefs.inodesFree`, `imagefs.available`, …). When one of them crosses its eviction threshold, the node reports `DiskPressure` and kubelet starts reclaiming space. It deletes dead containers and unused images first, then evicts pods.

Pods are ranked roughly like this:

1. Is the pod using **more than it requested** of the resource under pressure?
2. What's its **priority**?
3. **How far** over its request is it?

With no request, the effective request is **zero**. A worker writing 300Mi of logs and temp files is therefore 300Mi over its request, which puts it near the front of the queue.

This is also why the evictions looked random. Disk pressure is **per node**:

```text
Node A   CPU 35%  Mem 48%  Disk 61%   healthy
Node B   CPU 42%  Mem 52%  Disk 94%   DiskPressure  ← workers evicted here
Node C   CPU 31%  Mem 44%  Disk 63%   healthy
```

Only the Jobs that happened to land on Node B were evicted.

> **Spot instance red herring:** we run EKS on Spot with autoscaling, so my first guess was Spot interruptions. The events said `ephemeral-storage`. On a Spot cluster, check the events before you blame AWS.

## The fix: declare it

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
    ephemeral-storage: "500Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
    ephemeral-storage: "1Gi"
```

This does three things:

- **Scheduling:** the scheduler only places the pod on a node with enough allocatable ephemeral storage for the request.
- **Eviction ranking:** a pod using 300Mi against a 500Mi request is under its request, so it's far down the list. The same pod with no request is 300Mi over.
- **Containment:** if a pod goes over its ephemeral-storage **limit**, kubelet evicts that pod instead of letting it fill the node and take its neighbours down with it.

Some caveats:

- A request doesn't make a pod immune. Under severe enough pressure, any pod can still be evicted.
- Adding ephemeral storage doesn't change the pod's QoS class. QoS is based only on CPU and memory, so this pod is still `Burstable`.
- Size the numbers from what the workload actually uses. Don't paste `1Gi` into every manifest.

For `emptyDir`, you can also cap the volume on its own:

```yaml
volumes:
  - name: work
    emptyDir:
      sizeLimit: 1Gi
```

`sizeLimit` caps only that volume. The container-level request and limit cover the pod's total usage.

## Debugging checklist

```bash
# 1. Why was it evicted?
kubectl describe pod <pod>

# 2. Which node was it on, and is that node under pressure?
kubectl get pod <pod> -o wide
kubectl describe node <node>

# 3. How much ephemeral storage does the node have?
kubectl get node <node> -o jsonpath='{.status.allocatable.ephemeral-storage}'

# 4. Does the pod declare any?
kubectl get pod <pod> -o jsonpath='{.spec.containers[*].resources}'

# 5. On the node: what's using the space?
df -h    # bytes
df -i    # inodes. Pressure can come from running out of inodes too
```

When you look for what's using the disk, check logs first. A worker that logs every item can fill a node without writing a single file.

## Takeaway

Pods use three resources that can put a node under pressure: CPU, memory and ephemeral storage. Each one fails in its own way. A pod can look perfectly healthy on CPU and memory and still get evicted because its node ran out of disk.

If your workloads write logs, temp files, caches or build artifacts (and short-lived operator Jobs usually do), give them an `ephemeral-storage` request and limit. The next time evictions look random, run `kubectl describe node` and look for `DiskPressure`.
