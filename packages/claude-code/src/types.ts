// Structural subset of the Claude Code mod API used by this adapter.
export interface ModApi {
  process: {
    run: (
      arguments_: readonly string[],
      options: { cwd: string } | undefined,
    ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  };
  session: {
    cwd: () => Promise<string>;
  };
  ui: {
    log: (text: string) => void;
  };
}

export interface PromptSection {
  id: string;
  text: string;
  scope: "shared" | "session";
}

export interface Events {
  "prompt.compose": {
    input: Readonly<Record<string, unknown>>;
    result: { sections: readonly PromptSection[] };
  };
  "agent.spawn": {
    input: Readonly<{ prompt: string; [field: string]: unknown }>;
    result: unknown;
  };
  "session.start": {
    input: Readonly<Record<string, unknown>>;
    result: unknown;
  };
}

export type Hook<Name extends keyof Events> = (
  $: ModApi,
  event: Events[Name]["input"],
  next: (event: Events[Name]["input"]) => Promise<Events[Name]["result"]>,
) => Promise<Events[Name]["result"]>;

export type On = <Name extends keyof Events>(name: Name, handler: Hook<Name>) => void;
