# Predictive Intelligence — Future Technical Blueprint

Status: **Future design / not implemented**. This is the integration contract to preserve while developing Project Tracker 2.0. Current project data and academic/demo models are **not** production-ready by assumption.

## What this feature will do

Predict selected KPI values or the risk of missing performance thresholds, explain the evidence, and display predictions beside **actual** measurements on the project dashboard and scheduled reports. Avoid "AI" as a mandatory workflow for customers with insufficient history.

### Initial supported outcomes (proposed)

| Outcome | Inputs (examples) | Display |
| --- | --- | --- |
| KPI time-series forecast | Versioned observed KPI values, frequency, seasonality if supported | Forecast line + uncertainty range + historical actuals |
| Deadline early warning | Activity/milestone state transitions, planned/actual dates, workflow history | At-risk status with estimated delay/horizon, reason and confidence |
| Financial variance warning | Approved period spending, budget baseline, time remaining | Forecast range for spend and distance to limit |

Select **one measurable KPI** for the first vertical slice; only extend to other KPIs if backtests beat simple baselines. Project risk and anomaly detection are later extensions.

## Required data contracts (design proposal, not existing schema)

- `kpi_definitions`: id, workspace_id, project_id nullable, name, unit, formula/version, aggregation, cadence, thresholds, owner, access_scope.
- `kpi_observations`: id, workspace_id, project_id, kpi_id, period_start, period_end, observed_value, recorded_at, source_type/source_id, quality_state, approved_at, observation_version.
- `project_event_history`: workspace_id, project_id, entity_kind, entity_id, event_type, occurred_at, recorded_at, actor_id, change_set. Do not store secrets, excessive PII, or entire sensitive records in event payloads.
- `model_registry`: model_id, version, artifact reference, task, target KPI, training data window, feature/schema version, evaluation metrics, status, approved_by/at.
- `prediction_runs`: id, workspace_id, model_id/version, kpi_id, project_id, forecast_origin, horizon, input_snapshot_id/hash, status, created_at, errors sanitized.
- `prediction_values`: run_id, target_period, predicted_value, lower_bound/upper_bound when statistically justified, warning_level, explanation/reference.
- `prediction_feedback`: prediction_id, realized_value/observed_at, error_measure, reviewer_feedback, recorded_at.
- `model_access_grants` or tenant-scoped policy: the right to run and view forecasts must be explicit and independent of role-name strings.

Use migrations in stages; maintain foreign keys, indexes on tenant/project/KPI/time, retention limits and carefully designed RLS. Never backfill fake performance observations into production metrics.

## Logical architecture

```text
Approved project updates + financial observations
       |
       v
KPI definitions -> validated time-series observations -> report snapshots
                                                      |
                                                      v
                                       authorized forecast request/job
                                                      |
                                                      v
                                            isolated ML service
                                   training and inference kept separate
                                                      |
                                                      v
                                   versioned prediction run + values
                                                      |
                +-------------------------------------+-------------------------+
                v                                     v                         v
         dashboards and charts               scheduled report             risk alerts
       actual vs prediction shown         (label forecast as such)     configurable threshold
```

- **React frontend:** charts, warnings, reporting blocks; no model artifacts, secret keys or privileged data access in the client.
- **Express API:** authenticates, checks workspace/project/KPI entitlements and permissions, validates requests, queues jobs, serves authorized prediction results.
- **PostgreSQL/Supabase:** approved observations, lineage, prediction records, model registry and audit history; private storage for artifacts when suitable.
- **Isolated Python ML worker/service (later):** training, scheduled inference, backtesting and drift evaluation. Do not run heavyweight model training inside an ordinary user HTTP request.
- **Asynchronous jobs:** retries with idempotency keys, bounded workloads and model-level disable/rollback switch.

Python is a suggested separation because existing research prototypes are ML-oriented; the final deployment/runtime should be chosen after workload and cost benchmarking.

## Model governance and safety

1. Use **time-respecting** train/validation/test partitions and rolling-origin backtests for forecasts; do not randomly mix future records into training.
2. Compare against naive and seasonal-naive baselines, then use task-appropriate accuracy measurements (e.g., MAE, RMSE, interval coverage, classification precision/recall and calibration).
3. Show uncertainty only if calibrated and validated; suppress unsupported numeric certainty.
4. Track training window, data freshness, model/code version, feature version, evaluation result and prediction timestamp.
5. Alert on drift, insufficient history, stale observations, failed jobs or low quality; fall back to descriptive reporting when prediction quality is inadequate.
6. Enforce tenant boundaries in feature extraction, training-set creation, model artifacts, inference, logs, dashboards and exports. **No cross-workspace training on customer data by default**; separately obtain legal basis and explicit contractual permission for any shared training.
7. Restrict model and data access with server-side authorization and audit logs. Do not store raw tokens, secret keys, or unnecessary personal details in prediction logs.
8. Require human review for consequential decisions. A warning can recommend investigation; it must not automatically approve spending, reassign staff or cancel work.

## API sketch (not implemented)

- `GET /api/workspaces/:workspaceId/kpis` — list authorized KPI definitions and quality metadata.
- `GET /api/projects/:projectId/kpis/:kpiId/series` — actual observations, time boundaries and status.
- `POST /api/projects/:projectId/predictions` — request/queue an authorized forecast; idempotency key.
- `GET /api/projects/:projectId/predictions/:runId` — status, outputs, model version and limitations.
- `GET /api/projects/:projectId/predictions/:runId/evaluation` — retrospective performance when actuals arrive.

Do not expose the worker directly or accept arbitrary workspace IDs without enforcing membership.

## Delivery sequence

1. **Data readiness:** KPI registry, observation history, event history, report snapshots, tenant scope, validation and retention.
2. **Prototype bridge:** reproduce the academic model in a controlled nonproduction environment; document features and target, freeze a baseline, test on representative historical records.
3. **First end-to-end slice:** a single selected KPI; authorized request -> prediction job -> database record -> historical/forecast chart; explicit prediction labeling.
4. **Evaluation and monitoring:** backtesting, accuracy and calibration dashboards, drift checks, model governance, alerts and rollback.
5. **Tenant rollout:** opt-in beta to a few workspaces, permissions and billing entitlements, monitoring of service costs and reliability.
6. **Expansion:** additional KPIs, risk classification, anomaly detection, scenario planning if data and evaluation justify them.

## Acceptance criteria for first production KPI

- No predictions when history is insufficient; clear "not enough data" message.
- Baseline and model metrics are recorded, reproducible and meet predeclared acceptance thresholds.
- A second workspace cannot view, infer, export or trigger another workspace's features, runs or training data.
- Users see prediction horizon, timestamp, actual-vs-predicted distinction and limitations.
- Observed KPI history is not modified by a prediction.
- Forecast jobs are idempotent, monitored, rate-limited and auditable.
- Failed or disabled forecasts do not interrupt core project tracking or scheduled historical reports.
