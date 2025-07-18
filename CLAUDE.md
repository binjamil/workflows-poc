# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun src/main.ts` or `bun dev` - Run the main workflow execution demo
- `bun src/seed.ts` or `bun db:seed` - Seed the database with sample workflow definitions
- `bun db:push` - Push database schema changes using Drizzle Kit
- `bun db:studio` - Open Drizzle Studio for database inspection

## Core Architecture

This is an **event-driven workflow execution system** built with functional composition patterns. The system executes workflows as directed acyclic graphs (DAGs) where nodes represent tasks with dependencies.

### Key Components

**DAG Runner (`src/core/dag-runner.ts`)**
- Central orchestrator that executes workflow runs
- Uses topological sorting (Kahn's algorithm) to determine execution order
- Handles event sourcing and context rebuilding
- Supports resumable execution via event replay

**Event Store (`src/core/event-store.ts`)**
- Implements event sourcing pattern for workflow state
- Events: `node:started`, `node:pending`, `node:completed`, `workflow:completed`
- Provides append-only event log with sequence numbers

**Node Registry (`src/core/node-registry.ts`)**
- Factory pattern for node type resolution (query, log, payment)
- Maps node IDs (format: `type:counter`) to execution functions
- Loads workflow definitions from database

**Node Architecture**
- All nodes implement the same interface: `(ctx, config) => Promise<RunResult>`
- Nodes are pure functions that receive immutable context snapshots
- Return either `{status: "completed", patch}` or `{status: "pending", patch}`
- Context is built by applying patches from completed/pending nodes

### Functional Composition Patterns

1. **Builder Pattern**: All core components use builder functions (`buildDAGRunner`, `buildEventStore`, `buildNodeRegistry`)
2. **Dependency Injection**: Database instance is injected into all builders
3. **Pure Functions**: Nodes are side-effect free, context is immutable
4. **Function Composition**: Complex workflows built by composing simple node functions
5. **Event Sourcing**: State rebuilt through function application over event streams

### Database Schema

- `workflow_definitions` - Stores workflow DAG definitions (nodes array in JSONB)
- `workflow_runs` - Tracks individual workflow executions
- `workflow_events` - Event log with sequence ordering and unique constraints

### Tech Stack

- **Runtime**: Bun with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Architecture**: Event sourcing + Functional composition
- **Future**: Redis planned as message bus (LPUSH + BRPOP pattern)

### Execution Flow

1. Create workflow run → Load workflow definition
2. Rebuild context from existing events  
3. Resolve remaining nodes (filter completed dependencies)
4. Topologically sort and execute nodes sequentially
5. Emit events for each execution stage
6. Handle pending nodes by early return for resumability

### Node Implementation Guidelines

When implementing new node types:
- Follow the builder pattern: `buildXNode(db: Database)`
- Return object with `type` and `run` function
- Use typed config interfaces
- Register in `node-registry.ts` mappings
- Export from `nodes/index.ts`