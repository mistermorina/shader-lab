export function createRendererContract(methods = {}) {
  return {
    setup: methods.setup || (() => null),
    render: methods.render || (() => null),
    exportFrame: methods.exportFrame || (() => null),
    getOriginalFrame: methods.getOriginalFrame || (() => null),
    isAnimated: methods.isAnimated || (() => false),
  };
}
