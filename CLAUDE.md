# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun dev` - Run the REST API server with hot reload
- `bun db:seed` - Seed the database with sample workflow definitions
- `bun db:push` - Push database schema changes using Drizzle Kit
- `bun db:studio` - Open Drizzle Studio for database inspection

## Core Architecture

**Event-driven workflow execution REST API** that executes workflows as directed acyclic graphs (DAGs) using functional composition patterns.

### Key Components

- **DAG Runner** - Central orchestrator using topological sorting, event sourcing, and resumable execution
- **Event Store** - Append-only event log with events: `workflow:started`, `node:started/pending/completed`, `workflow:completed`
- **Message Bus** - Redis-based async processing using LPUSH/BRPOP pattern
- **Node Registry** - Factory pattern for node type resolution (query, log, payment)
- **Workflow Status** - Event-sourced status derivation: `created`, `running`, `pending`, `completed`, `failed`

### REST API Endpoints

- `POST /v1/workflows/run` - Start workflow execution
- `POST /v1/workflows/resume` - Resume workflow by runId
- `GET /v1/workflows/status?runId=X` - Get workflow status and context
- `GET /v1/workflows/events?runId=X` - Get workflow events
- `POST /v1/payments/settle` - Settle payment and resume workflow

### Tech Stack

- **Runtime**: Bun with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Message Bus**: Redis
- **REST API**: Express.js
- **Architecture**: Event sourcing + Functional composition

### Database Schema

- `workflow_definitions` - DAG definitions (JSONB nodes array)
- `workflow_runs` - Execution tracking with status
- `workflow_events` - Event log with sequence ordering
- `payments` - Payment records linked to workflow runs

### Execution Flow

1. API request → Create workflow run → Post to Redis
2. DAG Runner polls Redis → Load definition → Rebuild context from events
3. Execute nodes using topological sorting → Emit events → Update status
4. Handle pending nodes for external completion (payments) → Resume via API

### Node Implementation

All nodes follow `(ctx, config) => Promise<RunResult>` interface. Return `{status: "completed", patch}` or `{status: "pending", patch}`. Register in `node-registry.ts` and export from `nodes/index.ts`.