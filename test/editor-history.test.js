import assert from "node:assert/strict";
import test from "node:test";

import {
  commitEditorHistory,
  createEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
} from "../src/editorHistory.js";

const baseState = {
  effectStack: [{ id: "a", shaderKey: "wobble", params: {}, intensity: 1, enabled: true }],
  selectedEffectIdx: 0,
  activeFormat: "free",
};

const defaultTextOverlay = {
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

test("editor history commits, undoes and redoes state changes", () => {
  const initial = createEditorHistory(baseState);
  const changed = commitEditorHistory(initial, {
    ...baseState,
    effectStack: [...baseState.effectStack, { id: "b", shaderKey: "glitch", params: {}, intensity: 1, enabled: true }],
    selectedEffectIdx: 1,
  });

  assert.equal(changed.present.effectStack.length, 2);
  assert.equal(changed.past.length, 1);

  const undone = undoEditorHistory(changed);
  assert.equal(undone.present.effectStack.length, 1);
  assert.equal(undone.future.length, 1);

  const redone = redoEditorHistory(undone);
  assert.equal(redone.present.effectStack.length, 2);
  assert.equal(redone.present.selectedEffectIdx, 1);
});

test("editor history clamps selected effect index after stack changes", () => {
  const history = createEditorHistory({
    ...baseState,
    effectStack: [
      baseState.effectStack[0],
      { id: "b", shaderKey: "glitch", params: {}, intensity: 1, enabled: true },
    ],
    selectedEffectIdx: 9,
  });

  assert.equal(history.present.selectedEffectIdx, 1);
});

test("committing after undo clears redo future and respects history limit", () => {
  let history = createEditorHistory(baseState, 2);
  history = commitEditorHistory(history, { ...baseState, activeFormat: "ig_post" });
  history = commitEditorHistory(history, { ...baseState, activeFormat: "story" });
  history = commitEditorHistory(history, { ...baseState, activeFormat: "tiktok" });

  assert.equal(history.past.length, 2);
  assert.equal(history.present.activeFormat, "tiktok");

  const undone = undoEditorHistory(history);
  assert.equal(undone.present.activeFormat, "story");
  assert.equal(undone.future.length, 1);

  const branched = commitEditorHistory(undone, { ...baseState, activeFormat: "twitter" });
  assert.equal(branched.present.activeFormat, "twitter");
  assert.equal(branched.future.length, 0);
});

test("editor history sanitizes and tracks text overlay state", () => {
  const initial = createEditorHistory(baseState);

  assert.deepEqual(initial.present.textOverlay, defaultTextOverlay);

  const changed = commitEditorHistory(initial, {
    ...initial.present,
    textOverlay: {
      enabled: true,
      text: "Launch",
      fontFamily: "mono",
      fontSize: 148,
      color: "#f8fafc",
      opacity: 0.72,
      align: "right",
      x: 0.75,
      y: 0.25,
      rotation: -12,
    },
  });

  assert.equal(changed.present.textOverlay.enabled, true);
  assert.equal(changed.present.textOverlay.text, "Launch");
  assert.equal(changed.present.textOverlay.fontSize, 148);

  const undone = undoEditorHistory(changed);
  assert.deepEqual(undone.present.textOverlay, defaultTextOverlay);
});
