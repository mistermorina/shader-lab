import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("package exposes the expected local quality gates", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.build, "vite build");
  assert.equal(packageJson.scripts.lint, "eslint .");
  assert.equal(packageJson.scripts.test, "node --test test/*.test.js");
  assert.equal(packageJson.scripts["test:smoke"], "playwright test");
});

test("sample SVG fixture remains available for smoke uploads", () => {
  const fixture = readFileSync(new URL("./fixtures/sample.svg", import.meta.url), "utf8");

  assert.match(fixture, /<svg\b/);
  assert.match(fixture, /<circle\b/);
  assert.match(fixture, /<rect\b/);
});

test("pwa files and document hooks are present without extra dependencies", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const manifestPath = new URL("../public/manifest.webmanifest", import.meta.url);
  const serviceWorkerPath = new URL("../public/sw.js", import.meta.url);

  assert.equal(packageJson.dependencies?.["vite-plugin-pwa"], undefined);
  assert.equal(packageJson.devDependencies?.["vite-plugin-pwa"], undefined);
  assert.equal(existsSync(manifestPath), true);
  assert.equal(existsSync(serviceWorkerPath), true);
  assert.match(indexHtml, /<link rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(indexHtml, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.name, "shader.lab");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
});
