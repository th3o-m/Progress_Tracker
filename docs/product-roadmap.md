# Project Tracker 2.0 — Product Roadmap

Status: **Planning**. This document sets product direction; it does not mean features have been deployed or customer plans have been finalized.

## Product vision

One multi-purpose work management, monitoring and reporting platform for individuals, small businesses, departments, and enterprises. A user begins with a suitable workspace template and sees only relevant modules. Every tier shares a single tenant-aware core; enterprise-only complexity must not overwhelm personal users.

### Product principles

1. **Simple first:** personal users can create a project and report progress without configuring teams, budgets, or organization hierarchies.
2. **Workspace first:** projects, membership, customization, reporting, storage, and subscriptions belong to a workspace (tenant).
3. **Capture once, report many times:** structured updates power dashboards, PDF/Excel reports, presentations, scheduled reports, and later forecasts.
4. **Configuration before forks:** sector templates, custom fields, module visibility, and reporting workflows are declarative—not separate customer codebases.
5. **Security for all:** cross-workspace isolation, least privilege, auditability, and encryption are core platform requirements, regardless of subscription.
6. **Predictive readiness from day one:** preserve standardized, timestamped KPI history now so ML can be introduced later without recreating all data capture.

## Proposed release sequence

| Phase | Focus | Exit criteria |
| --- | --- | --- |
| 0. Stabilize | Repair Vercel backend routing, data loading, and baseline end-to-end tests | Login, project loading, and the existing reporting workflow function in staging and production |
| 1. Workspace foundations | Personal/team workspaces, tenant isolation, membership, adaptive onboarding, migration of existing projects | Personal and team users can work in isolated workspaces without losing existing data |
| 2. Configurable operations | Sector presets, project templates, customizable fields, module visibility, permissions and mobile-responsive updates | Workspace administrator can configure a workflow without deploying code |
| 3. Reporting platform | Reusable report templates, KPI registry, report approval, scheduled daily/weekly/monthly reporting, versioned snapshots and exports | Reports consistently reproduce data for a defined historical period |
| 4. Field operations | Private photo evidence, mobile capture, supervisor reviews, then offline draft/sync | Officer submits evidence, reviewer approves, report references the approved evidence |
| 5. SaaS commercialization | Plans, entitlements, subscription billing, usage limits, onboarding services and support | Customers can subscribe and manage plan changes without compromising core controls |
| 6. **Predictive Intelligence** | Selected KPI forecasting, delay/overspend early warnings, explainable model output and model governance | Predictions are evaluated, attributable to model/data versions, isolated per tenant, and accompanied by uncertainty |
| 7. Enterprise extensibility | Department/portfolio hierarchy, SSO, integrations, aggregate analytics, formal security assessments | Enterprise pilot passes functional, access-control, and operational acceptance tests |

These phases may overlap when dependencies justify it, but Predictive Intelligence is a **planned future module**, not a prerequisite for the core product.

## Predictive Intelligence — protected future milestone

The existing research/prototype work on selected KPI prediction should be reusable as the starting point for **model and feature experiments**, but it must not be deployed as a multi-customer production service without hardening and evaluation. Initial model candidates:

- Predict KPI trajectories (e.g., activity cycle time/throughput, milestone completion, schedule variance, budget burn).
- Show an early-warning indicator when an evidence-based probability or forecast crosses a configurable threshold.
- Compare expected performance with observed performance and provide a clear explanation of model limitations.

Later candidates: project risk classification, anomaly detection, portfolio-level forecasting and scenario simulation. Do not promise any of these until data sufficiency, model quality, and domain applicability have been demonstrated.

### Build these foundations before integrating ML

- A **KPI registry** (owner, unit, definition/formula, target, collection interval, data source, project/workspace scope).
- Immutable or versioned **KPI observations** with observation period, recorded_at, source/reference ID, creator, and approval/quality state.
- Historical project events and status changes with effective time; never overwrite all past state with only the latest percentage.
- **Report snapshots** and data lineage so an issued report can be reconstructed independently of subsequent edits.
- Common project/workspace IDs, consistently enforced backend authorization, and retention/consent controls for model training datasets.
- Stable event conventions (created, updated, approved, rejected), documented null/missing-data semantics, and per-KPI minimum history thresholds.

### User experience

- Personal: clear historical trends; predictions opt-in only when enough observations exist, without ML jargon.
- Business: "At current pace, this milestone may miss the target" plus expected range, supporting history and next-action suggestions.
- Enterprise: cross-project forecasting and risk summaries, accessible only when explicitly authorized.
- All users: show **predicted vs actual**, observation date, forecast horizon, uncertainty, model version or method, and whether the prediction is provisional.
- A forecast **must not** silently rewrite measured progress, trigger automatic financial approvals, or be represented as a guaranteed outcome.

### Commercial positioning

Offer a useful history/reporting experience on all plans. Premium predictive insights may later be a metered module or paid add-on, but privacy, security, accuracy notices, and access protections remain universal.

## Release gates

New ML functions require: sufficient and representative data, time-based backtesting, sensible baseline comparison, robust authorization and tenant isolation, monitoring for input drift and accuracy degradation, an administrative disable switch, signed-off retention practices, and explicit warnings when predictions are unreliable.

See [Predictive Intelligence technical blueprint](./predictive-intelligence.md).
