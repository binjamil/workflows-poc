# workflows-poc

- `workflow_definitions` table should be version controlled as `workflow_runs` relies on it.
- Implement trigger mechanism (as we have removed it from nodes)
- Introduce Redis as a message bus (the only entrypoint to dag runner). Use LPUSH + BRPOP
- Think about workflow run statuses and how to update/use them.
- Think about failures and how to handle them, e.g. `workflow_failed` event or retries?
