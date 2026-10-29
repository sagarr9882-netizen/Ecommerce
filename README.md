# eShop GitOps repo (Helm + FluxCD + TDM)

This repo is what FluxCD watches. Jenkins never talks to the cluster directly -
it only edits `charts/ecommerce/values.yaml` and pushes; Flux's own
controllers (running in the cluster) do the actual `helm upgrade`.

```
charts/ecommerce/     Helm chart for the eShop app (converted from the plain
                       k8s/*.yaml manifests you had - same Services/
                       Deployments/StatefulSets, now templated)
flux/                 GitRepository + HelmRelease that tell Flux to watch
                       THIS repo and render charts/ecommerce
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

1. **Push this repo's content to `sagarr9882-netizen/Ecommerce`** (main branch).
2. **Point Flux at it.** `flux/git-repository.yaml` + `flux/helm-release.yaml`
   are the standard Flux objects for "watch this repo, render this chart" -
   apply them to wherever your cluster's Flux `source-controller`/
   `helm-controller` actually run:
   - If Flux was bootstrapped the usual way (`flux bootstrap github ...`),
     commit these two files into whatever repo/path that bootstrap watches.
   - **Your cluster-agent's own Flux install is different from the above** -
     its `FLUX_GIT_URL`/`FLUX_GIT_BRANCH`/`FLUX_GIT_PATH` env vars currently
     point at `dileep165794/flux-cd`, branch `publish`, path
     `./application/boutique-app-1791205336986` - a DIFFERENT repo/path than
     this one. I don't have visibility into that repo or into whether your
     Cavisson/TDM dashboard has an "add application" flow that provisions a
     new `./application/<id>` path like that one automatically. Two ways
     forward, and I'd check which applies before doing either by hand:
     - If there's a UI flow for registering a new app/cluster target in your
       TDM/Cavisson dashboard, use that - it likely creates the
       `./application/<id>` folder in `dileep165794/flux-cd` for you,
       pointing at a chart source. Point that chart source at THIS repo
       (`sagarr9882-netizen/Ecommerce`, path `charts/ecommerce`) instead of
       wherever it defaults to.
     - Otherwise, add a folder under `dileep165794/flux-cd` at
       `./application/<something>` containing `flux/git-repository.yaml` +
       `flux/helm-release.yaml` from this repo (pointing at
       `sagarr9882-netizen/Ecommerce`), then update the `cluster-agent`
       Deployment's `FLUX_GIT_PATH` to that new folder and restart it so it
       re-applies - **this changes what your cluster-agent manages
       cluster-wide, so I'd confirm with whoever owns that agent/repo before
       changing it**, rather than silently repoint a shared fleet path.
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
