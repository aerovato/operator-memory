declare const __OPERATOR_PLUGIN_ID__: string | undefined;

// Builds replace __OPERATOR_PLUGIN_ID__ with the plugin ID; tests and other
// unbundled execution fall back to the canonical ID.
export const pluginId =
  typeof __OPERATOR_PLUGIN_ID__ === "string" ? __OPERATOR_PLUGIN_ID__ : "aerovato.operator-memory";
