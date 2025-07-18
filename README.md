# workflows-poc

- <del>Introduce Redis as a message bus (the only entrypoint to dag runner). Use LPUSH + BRPOP</del>
- <dev>Think about workflow run statuses and how to update/use them.</del>
- Implement trigger mechanism (as we have removed it from nodes)
- Think about failures and how to handle them, e.g. `workflow_failed` event or retries?
- `workflow_definitions` table should be version controlled as `workflow_runs` relies on it.

## Flow after Redis

- Redis acts as a message bus.
- DAG runner is subscribed to bus and listens for "workflow:start" event. This is only entrypoint for running the workflow now
- We somehow trigger/start the workflow (in this demo it is a POST endpoint. Other options listed below under Triggers)
- The seed workflow pauses after creating payment. So in POST `/v1/payments/settle` we resume the workflow (some boilerplate is there which can be fixed)
- Workflow run statuses are derived from events and updated in DB after each event is appended.

## Triggers

- Will be configured directly on a workflow definition (since every workflow needs a trigger)
- Defines when that workflow will be run
- Will support two configuration options:
  - `cron`: Run the workflow based on a cron expression (e.g., "0 0 * * *" for every day at midnight)
  - `hooks`: Predefined locations where the workflow should be triggered (i.e. withdrawal requested, etc)
