export type Context = Record<string, unknown>;

export type RunResult = { status: "completed"; patch?: unknown } | { status: "pending"; patch?: unknown };

export type Node = {
  /** Node ID with format <node_type>:<counter>, for example "query:2" */
  id: string;
  /** IDs that must complete before this node can start */
  deps: string[];
  /** Configuration (i.e. input) for the node */
  config: unknown;
  /**
   * Business logic — receives an immutable snapshot of current ctx
   * and returns *anything*. The runner stores it under ctx[id].
   */
  run: (ctx: Readonly<Context>, config: unknown) => Promise<RunResult>;
};

export type Event =
  | { type: "node:started"; nodeId: string }
  | { type: "node:pending"; nodeId: string; patch: unknown }
  | { type: "node:completed"; nodeId: string; patch: unknown }
  | { type: "workflow:completed" };

export type EventStore = {
  append: (ev: Event) => Promise<void>;
  all: () => Promise<Event[]>;
};
