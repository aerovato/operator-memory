import { Rpc } from "@opencode-ai/plugin/rpc";

export const OperatorNotifications = Rpc.define({
  id: "aerovato.operator-memory",
  methods: {
    status: {
      input: {
        type: "object",
        properties: { refresh: { type: "boolean" } },
        required: ["refresh"],
      },
      output: {
        type: "object",
        properties: {
          detail: { type: "string" },
          user: { enum: ["loaded", "uninitialized", "error"] },
          private: { enum: ["loaded", "uninitialized", "error"] },
          shared: { enum: ["loaded", "uninitialized", "error"] },
        },
        required: ["detail", "user", "private", "shared"],
      },
    },
  },
  events: {
    toast: {
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          message: { type: "string" },
          variant: { enum: ["info", "success", "warning", "error"] },
        },
        required: ["title", "message", "variant"],
      },
    },
  },
});

export type OperatorToast = {
  readonly title: string;
  readonly message: string;
  readonly variant: "info" | "success" | "warning" | "error";
};

export type PartitionStatus = "loaded" | "uninitialized" | "error";

export type OperatorStatus = {
  readonly detail: string;
  readonly user: PartitionStatus;
  readonly private: PartitionStatus;
  readonly shared: PartitionStatus;
};
