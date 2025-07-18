export type Context = Record<string, unknown>;

export type RunResult<TPatch = unknown> =
  | { status: "completed"; patch?: TPatch }
  | { status: "pending"; patch?: TPatch };

export interface Node<TConfig = unknown, TPatch = unknown> {
  /** Node ID with format <node_type>:<counter>, for example "query:2" */
  id: string;
  /** IDs that must complete before this node can start */
  deps: string[];
  /** Configuration (i.e. input) for the node */
  config: TConfig;
  /**
   * Business logic — receives an immutable snapshot of current ctx
   * and returns *anything*. The runner stores it under ctx[id].
   */
  run: (ctx: Readonly<Context>, config: TConfig) => Promise<RunResult<TPatch>>;
}

export interface NodeBuilder<TConfig, TPatch = unknown> {
  type: string;
  run: (ctx: Readonly<Context>, config: TConfig) => Promise<RunResult<TPatch>>;
}

export type Event =
  | { type: "workflow:started"; patch: unknown }
  | { type: "node:started"; nodeId: string }
  | { type: "node:pending"; nodeId: string; patch: unknown }
  | { type: "node:completed"; nodeId: string; patch: unknown }
  | { type: "workflow:completed" };

export type EventStore = {
  append: (ev: Event) => Promise<void>;
  all: () => Promise<Event[]>;
};
