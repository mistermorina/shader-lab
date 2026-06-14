const DEFAULT_HISTORY_LIMIT = 50;
const DEFAULT_TEXT_OVERLAY = {
  enabled: false,
  text: "shader.lab",
  fontFamily: "space",
  fontSize: 96,
  color: "#ffffff",
  opacity: 0.9,
  align: "center",
  x: 0.5,
  y: 0.5,
  rotation: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEffect(effect, index) {
  return {
    id: effect?.id || `effect_${index}`,
    shaderKey: effect?.shaderKey || "wobble",
    params: { ...(effect?.params || {}) },
    intensity: Number.isFinite(effect?.intensity) ? effect.intensity : 1,
    enabled: effect?.enabled !== false,
  };
}

function normalizeTextOverlay(textOverlay) {
  const source = textOverlay && typeof textOverlay === "object" ? textOverlay : {};

  return {
    enabled: source.enabled === true,
    text: typeof source.text === "string" ? source.text : DEFAULT_TEXT_OVERLAY.text,
    fontFamily: typeof source.fontFamily === "string" ? source.fontFamily : DEFAULT_TEXT_OVERLAY.fontFamily,
    fontSize: clamp(Number.isFinite(source.fontSize) ? source.fontSize : DEFAULT_TEXT_OVERLAY.fontSize, 24, 260),
    color: typeof source.color === "string" ? source.color : DEFAULT_TEXT_OVERLAY.color,
    opacity: clamp(Number.isFinite(source.opacity) ? source.opacity : DEFAULT_TEXT_OVERLAY.opacity, 0, 1),
    align: ["left", "center", "right"].includes(source.align) ? source.align : DEFAULT_TEXT_OVERLAY.align,
    x: clamp(Number.isFinite(source.x) ? source.x : DEFAULT_TEXT_OVERLAY.x, 0, 1),
    y: clamp(Number.isFinite(source.y) ? source.y : DEFAULT_TEXT_OVERLAY.y, 0, 1),
    rotation: clamp(Number.isFinite(source.rotation) ? source.rotation : DEFAULT_TEXT_OVERLAY.rotation, -45, 45),
  };
}

function statesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function sanitizeEditorState(state) {
  const effectStack = Array.isArray(state?.effectStack) && state.effectStack.length > 0
    ? state.effectStack.map(normalizeEffect)
    : [normalizeEffect({ shaderKey: "wobble" }, 0)];
  const selectedEffectIdx = clamp(
    Number.isFinite(state?.selectedEffectIdx) ? state.selectedEffectIdx : 0,
    0,
    effectStack.length - 1
  );

  return {
    effectStack,
    selectedEffectIdx,
    activeFormat: state?.activeFormat || "free",
    textOverlay: normalizeTextOverlay(state?.textOverlay),
  };
}

export function createEditorHistory(present, limit = DEFAULT_HISTORY_LIMIT) {
  return {
    past: [],
    present: sanitizeEditorState(present),
    future: [],
    limit,
  };
}

export function commitEditorHistory(history, updater) {
  const current = history.present;
  const next = sanitizeEditorState(typeof updater === "function" ? updater(current) : updater);
  if (statesEqual(current, next)) return history;

  return {
    ...history,
    past: [...history.past, current].slice(-history.limit),
    present: next,
    future: [],
  };
}

export function replaceEditorPresent(history, updater) {
  return {
    ...history,
    present: sanitizeEditorState(typeof updater === "function" ? updater(history.present) : updater),
  };
}

export function undoEditorHistory(history) {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];

  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEditorHistory(history) {
  if (history.future.length === 0) return history;
  const next = history.future[0];

  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: history.future.slice(1),
  };
}
