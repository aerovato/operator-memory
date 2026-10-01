window.__ModuleLoader__.load({
  id: "@aerovato/operator-deepseek",
  factory(require) {
    const React = require("react");

    function OperatorIndicator() {
      return React.createElement(
        "span",
        { className: "operator-memory-indicator" },
        React.createElement(
          "span",
          { className: "operator-memory-indicator__label" },
          "Operator Ready (v__OPERATOR_VERSION__)",
        ),
      );
    }

    return {
      inject: ["slots"],
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement("style");
          style.textContent = "__OPERATOR_CSS__";
          document.head.appendChild(style);
          return () => style.remove();
        }, "operator-memory: indicator style");
        ctx.slots.inject("conversation.composer.dock", () =>
          ctx.slots.register(
            {
              name: "conversation.composer.dock",
              id: "operator-memory",
              order: -1,
            },
            OperatorIndicator,
          ),
        );
      },
    };
  },
});
