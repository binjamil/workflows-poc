import { createActor, createMachine, assign, fromPromise } from "xstate";

const executeQuery = async ({
  input: { query },
}: {
  input: { query: Record<string, unknown> };
}) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Executing query:", query);
  return [
    {
      id: 1,
      name: "Company A",
      isActive: true,
      employees: [
        {
          id: 1,
          name: "John Doe",
          startDate: "2023-01-01T00:00:00.000Z",
          endDate: null,
          basicSalary: 5000,
          fullSalary: 6000,
        },
      ],
    },
  ]; // Simulate an asynchronous query execution
};

const workflowMachine = createMachine({
  id: "workflow_yuzh72",
  context: {
    "trigger:1": { type: "cron", schedule: "0 0 1 * *" },
    "query:1": {
      query: {
        entity: "companies",
        columns: { id: true, name: true, isActive: true },
        where: {
          operator: "AND",
          conditions: [
            { operator: "EQ", column: "id", value: 1 },
            { operator: "EQ", column: "isActive", value: true },
          ],
        },
        with: {
          employees: {
            columns: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              basicSalary: true,
              fullSalary: true,
            },
            where: {
              operator: "OR",
              conditions: [
                {
                  operator: "LT",
                  column: "endDate",
                  value: "2025-07-16T16:43:31.991Z",
                },
                { operator: "IS_NULL", column: "endDate" },
              ],
            },
          },
        },
      },
    },
    errors: {},
  },
  initial: "trigger:1",
  states: {
    "trigger:1": {
      on: {
        "workflow.next": {
          target: "query:1",
        },
      },
    },
    "query:1": {
      invoke: {
        src: fromPromise(executeQuery),
        input: ({ context }) => ({ query: context["query:1"].query }),
        onDone: {
          target: "success",
          actions: assign({
            "query:1": ({ context, event }) => ({
              ...context["query:1"],
              results: event.output,
            }),
          }),
        },
        onError: {
          target: "failure",
          actions: assign({
            errors: ({ context, event }) => ({
              ...context.errors,
              "query:1": (event.error as Error).message,
            }),
          }),
        },
      },
    },
    success: {
      type: "final",
    },
    failure: {
      type: "final",
    },
  },
});

const actor = createActor(workflowMachine);

actor.subscribe((snapshot) => {
  const state = snapshot.value;
  const context = snapshot.context;
  console.log({ state, context });
});

actor.start();
actor.send({ type: "workflow.next" });
