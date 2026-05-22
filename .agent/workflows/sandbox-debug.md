# Sandbox Debugging Workflow

This workflow provides instructions on how to debug K3d/K3s sandbox pods that are created dynamically via the `SandboxService` for executing agent CAD designs.

## Overview

Lattice uses a local Kubernetes cluster (running in a Docker container `k3d-lattice-server-0`) to spin up ephemeral sandbox pods running the `lattice-agent:latest` image. 

### Common Failure 1: Pod Timeout / ImagePullBackOff
If you see an error like `Timeout waiting for Pod agent-<id> to start.`, the most common cause is Kubernetes attempting to pull the image from Docker Hub instead of using the local image.

**Solution/Check**:
1. Check if the image exists inside the K3d node:
   ```bash
   docker exec k3d-lattice-server-0 crictl images | grep lattice-agent
   ```
2. Check Kubernetes events to see if it's failing to pull:
   ```bash
   ./bin/kubectl get events -n lattice-sandboxes --sort-by='.metadata.creationTimestamp'
   ```
3. Ensure the Pod specification in `src/server/services/sandbox.service.ts` includes:
   `imagePullPolicy: "Never"`
   This forces Kubernetes to use the locally built image.

### Common Failure 2: Pod Crashes / Agent Errors
If the Pod starts but crashes or fails to execute the CAD script, you need to check the Pod logs.

**Solution/Check**:
1. By default, `SandboxService` is configured to catch `waitForPodRunning` failures and automatically print the pod's logs using `k8sApi.readNamespacedPodLog`. You can see these logs in the Next.js (`npm run dev`) terminal.
2. If you need to manually inspect a running or crashed pod:
   ```bash
   ./bin/kubectl get pods -n lattice-sandboxes
   ./bin/kubectl logs <pod-name> -n lattice-sandboxes
   ```

### Debugging with Local Kubectl
The project includes a local binary for `kubectl` at `./bin/kubectl`. Use this instead of a globally installed `kubectl` to ensure you are connecting to the correct local K3d instance.

```bash
# List all sandboxes
./bin/kubectl get pods -n lattice-sandboxes

# Describe a specific sandbox to see its lifecycle events
./bin/kubectl describe pod <pod-name> -n lattice-sandboxes
```
