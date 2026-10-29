# eShop GitOps repo (Helm + FluxCD + TDM)

This repo is what FluxCD watches. Jenkins never talks to the cluster directly -
it only edits `charts/ecommerce/values.yaml` and pushes; Flux's own
controllers (running in the cluster) do the actual `helm upgrade`.

```
charts/ecommerce/     Helm chart for the eShop app (converted from the plain
                       k8s/*.yaml manifests you had - same Services/
                       Deployments/StatefulSets, now templated)
flux/                 Namespace + HelmRelease that render charts/ecommerce -
                       this is the path a DEDICATED cavisson-agent for this
                       app should be bootstrapped against (FLUX_GIT_PATH=./flux)
jenkins/Jenkinsfile   Build -> TDM clone -> patch values.yaml -> push
```

## What changed vs. the plain k8s manifests

- `database.host` / `database.port` in `values.yaml` are now ONE shared value
  used to build all three `*_DATABASE_URL` secrets (auth/product/order) - each
  service keeps its own fixed database name, only the host:port moves. That's
  the exact thing a TDM clone-up changes: it hands back a new host:port
  (Kubernetes mode = an in-cluster DNS name like
  `tdm-postgresql-<id>-<hash>.ecommerce.svc.cluster.local:5432`), same
  database names underneath since the clone is made from the same golden DB.
- `postgres.enabled` defaults to `false` - the in-cluster Postgres
  StatefulSet from `10-infrastructure.yaml` is now optional, since
  `database.host`/`database.port` are expected to point at a TDM clone
  instead. Set it to `true` (and `database.host: postgres`) if you ever want
  to run this app without TDM behind it.
- Everything else (Mongo/Redis/RabbitMQ, the 5 app Deployments, the Ingress)
  is templated 1:1 off your existing manifests - same images, same env var
  names, same probes.

## One-time setup

1. **Push this repo's content to `sagarr9882-netizen/Ecommerce`** (main branch) -
   done.
2. **Deploy a dedicated cavisson-agent for this app, bootstrapped against
   THIS repo** - not the shared boutique-app one. Same shape as the
   cluster-agent manifest you already have, with the Flux env vars pointed
   here instead:
   ```yaml
   env:
     - name: FLUX_ENABLED
       value: "true"
     - name: FLUX_GIT_URL
       value: "https://github.com/sagarr9882-netizen/Ecommerce"
     - name: FLUX_GIT_BRANCH
       value: "main"
     - name: FLUX_GIT_PATH
       value: "./flux"
     - name: FLUX_VERSION
       value: "v2.8.6"
     - name: FLUX_REGISTRY
       value: "ghcr.io/fluxcd"
   ```
   That makes the agent bootstrap its own Flux `GitRepository` named
   `flux-system` (in the `flux-system` namespace) against this repo, with its
   root `Kustomization` watching `./flux` - which is exactly `flux/namespace.yaml`
   + `flux/helm-release.yaml` in this repo. No `GitRepository` object is
   committed here, on purpose: the agent creates that source for you, and
   `flux/helm-release.yaml` just references it (`sourceRef: flux-system`)
   since the chart already lives in the same repo Flux is bootstrapped
   against - no second, redundant source needed.
3. **Create the Jenkins credential** `github-ecommerce-pat` (username + a
   GitHub PAT with push access to this repo) - that's `GITOPS_CRED_ID` in
   the Jenkinsfile. Swap in your TDM git-integration config instead (same
   `fetchGitConfig()`/dynamic-credential pattern your Boutique pipeline
   already uses) if you'd rather not manage a static PAT.
4. **Apply `k8s/40-tdm-rbac.yaml`** (unchanged, still cluster-scoped, still a
   one-time apply) if you haven't already - TDM's Kubernetes-mode clone
   needs it regardless of Helm/Flux.

## Every build after that

Jenkins: build+push images -> run the TDM plugin's deploy+clone step
(`kubernetesClusterName`/`kubernetesNamespace` params) -> patch
`charts/ecommerce/values.yaml` (`image.tag`, and `database.host`/
`database.port` when a clone was actually made) -> commit -> push. Flux picks
up the new commit on its own poll interval (1 min in `flux/*.yaml`) and
re-renders the chart - no separate "deploy" step, no `kubectl`/`helm` call
from Jenkins at all.
