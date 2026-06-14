import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const SAMPLE_IMAGE = "test/fixtures/sample.svg";
const ORIENTATION_IMAGE = "test/fixtures/orientation.svg";
const FILTER_SHADER_LABELS = [
  "Wobble",
  "Glitch",
  "VHS",
  "Halftone",
  "Paper",
  "Fluted Glass",
  "Bloom",
  "Neon Glow",
  "ASCII",
  "Dither",
  "Chromatic",
  "Pixel Sort",
  "Duotone",
  "Posterize",
  "Scanlines",
  "Edge Detect",
  "Displacement Map",
];

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewport);
}

async function uploadFilterFixture(page) {
  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(SAMPLE_IMAGE);
  await expect(page.getByRole("button", { name: /select image sample\.svg/i })).toBeVisible();
}

async function expectRenderedCanvas(page) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      const canvas = document.querySelector(".filters-canvas canvas");
      if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return false;

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const stride = Math.max(4, Math.floor(pixels.length / 300));
      for (let index = 0; index < pixels.length; index += stride) {
        if (pixels[index] > 3 || pixels[index + 1] > 3 || pixels[index + 2] > 3) return true;
      }
      return false;
    });
  }, { timeout: 5_000 }).toBe(true);
}

async function expectCanvasTopIsRedBottomIsBlue(page) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      const canvas = document.querySelector(".filters-canvas canvas");
      if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return null;

      const readPixel = (x, y) => {
        const pixel = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return Array.from(pixel);
      };

      const x = Math.floor(canvas.width / 2);
      const top = readPixel(x, Math.max(0, canvas.height - 20));
      const bottom = readPixel(x, 20);
      return {
        topLooksRed: top[0] > top[2] + 40,
        bottomLooksBlue: bottom[2] > bottom[0] + 40,
        top,
        bottom,
      };
    });
  }, { timeout: 5_000 }).toMatchObject({ topLooksRed: true, bottomLooksBlue: true });
}

async function readDownloadBuffer(download, testInfo) {
  const path = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  return readFile(path);
}

function readPngDimensions(buffer) {
  expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function listZipEntryNames(buffer) {
  const names = [];
  for (let offset = 0; offset < buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    names.push(buffer.subarray(nameStart, nameStart + nameLength).toString("utf8"));
    offset = nameStart + nameLength + extraLength + commentLength - 1;
  }
  return names;
}

test("filter studio loads with keyboard-accessible upload", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /shader\.lab/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload images" })).toBeVisible();
  await expect(page.getByRole("button", { name: /ascii studio/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "ASCII" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("filter studio uploads an image and exposes the image card to keyboard users", async ({ page }) => {
  await page.goto("/");

  await uploadFilterFixture(page);

  const imageCard = page.getByRole("button", { name: /select image sample\.svg/i });
  await expect(imageCard).toBeVisible();
  await expect(imageCard).toHaveAttribute("aria-pressed", "true");

  await imageCard.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/1 image/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /remove image sample\.svg/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("effect search narrows the shader list without losing accessible replace actions", async ({ page }) => {
  await page.goto("/");

  const search = page.getByRole("searchbox", { name: "Search effects" });
  await search.fill("neon");

  await expect(page.getByRole("button", { name: "Replace selected effect with Neon Glow" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace selected effect with Wobble" })).toHaveCount(0);

  await search.fill("no matching shader");
  await expect(page.getByText("No effects match your search.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("header exposes grouped export actions after an image is loaded", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("toolbar", { name: "Export actions" })).toHaveCount(0);

  await uploadFilterFixture(page);

  const toolbar = page.getByRole("toolbar", { name: "Export actions" });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("button", { name: /PNG/i })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: /GIF/i })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: /MP4/i })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Clear all images" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("undo and redo restore editor stack changes", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  const historyToolbar = header.getByRole("toolbar", { name: "History actions" });
  await expect(historyToolbar).toBeVisible();

  const undo = historyToolbar.getByRole("button", { name: "Undo" });
  const redo = historyToolbar.getByRole("button", { name: "Redo" });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await page.getByRole("searchbox", { name: "Search effects" }).fill("glitch");
  await page.getByRole("button", { name: "Add Glitch effect" }).click();
  await expect(page.getByText("2/8")).toBeVisible();
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(page.getByText("1/8")).toBeVisible();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(page.getByText("2/8")).toBeVisible();
});

test("text overlay controls preview text and participate in undo redo", async ({ page }) => {
  await page.goto("/");
  await uploadFilterFixture(page);

  const header = page.getByRole("banner");
  const historyToolbar = header.getByRole("toolbar", { name: "History actions" });
  const undo = historyToolbar.getByRole("button", { name: "Undo" });
  const redo = historyToolbar.getByRole("button", { name: "Redo" });

  await page.getByRole("button", { name: "TEXT" }).click();
  await page.getByRole("checkbox", { name: "Enable text overlay" }).check();
  await page.getByRole("textbox", { name: "Overlay text" }).fill("Launch Drop");
  await page.getByRole("slider", { name: "Text X position" }).fill("0.25");
  await page.getByRole("slider", { name: "Text Y position" }).fill("0.3");

  await expect(page.getByRole("textbox", { name: "Overlay text" })).toHaveValue("Launch Drop");
  await expectRenderedCanvas(page);
  await expect(undo).toBeEnabled();

  for (let i = 0; i < 4; i += 1) await undo.click();
  await expect(page.getByRole("checkbox", { name: "Enable text overlay" })).not.toBeChecked();
  await expect(redo).toBeEnabled();

  for (let i = 0; i < 4; i += 1) await redo.click();
  await expect(page.getByRole("checkbox", { name: "Enable text overlay" })).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Overlay text" })).toHaveValue("Launch Drop");
  await expectNoHorizontalOverflow(page);
});

test("displacement map shader is searchable and renders in the effect stack", async ({ page }) => {
  await page.goto("/");
  await uploadFilterFixture(page);

  await page.getByRole("searchbox", { name: "Search effects" }).fill("displacement");
  await page.getByRole("button", { name: "Replace selected effect with Displacement Map" }).click();
  await expectRenderedCanvas(page);
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.getByRole("slider", { name: "Strength" }).fill("0.08");
  await expectRenderedCanvas(page);
});

test("adding a second effect preserves image orientation", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(ORIENTATION_IMAGE);
  await expect(page.getByRole("button", { name: /select image orientation\.svg/i })).toBeVisible();

  await expectCanvasTopIsRedBottomIsBlue(page);
  await page.getByRole("searchbox", { name: "Search effects" }).fill("glitch");
  await page.getByRole("button", { name: "Add Glitch effect" }).click();
  await expect(page.getByText("2/8")).toBeVisible();
  await expectCanvasTopIsRedBottomIsBlue(page);
});

test("every filter shader renders the uploaded image without console errors", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await uploadFilterFixture(page);
  await expectRenderedCanvas(page);

  for (const label of FILTER_SHADER_LABELS) {
    await page.getByRole("button", { name: `Replace selected effect with ${label}` }).click();
    await expectRenderedCanvas(page);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }

  expect(consoleErrors).toEqual([]);
});

test("filter export controls, compare and format switching are active after upload", async ({ page }) => {
  await page.goto("/");
  await uploadFilterFixture(page);

  await expect(page.getByRole("button", { name: /PNG/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /GIF/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /MP4/i })).toBeEnabled();

  const compareButton = page.getByRole("button", { name: /COMPARE/i });
  await compareButton.click();
  await expect(compareButton).toHaveText(/COMPARE/i);

  await page.getByRole("button", { name: "FORMAT" }).click();
  await page.getByRole("button", { name: /IG Post/i }).click();
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector(".filters-canvas canvas");
    return canvas ? { width: canvas.width, height: canvas.height } : null;
  })).toEqual({ width: 1080, height: 1080 });
});

test("png export downloads the active format at the expected dimensions", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadFilterFixture(page);
  await page.getByRole("button", { name: "FORMAT" }).click();
  await page.getByRole("button", { name: /IG Post/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /PNG/i }).click();
  const download = await downloadPromise;
  const buffer = await readDownloadBuffer(download, testInfo);

  expect(download.suggestedFilename()).toBe("shader_wobble_ig_post.png");
  expect(readPngDimensions(buffer)).toEqual({ width: 1080, height: 1080 });
});

test("gif export downloads a valid gif with active format in the filename", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadFilterFixture(page);
  await page.getByRole("button", { name: "FORMAT" }).click();
  await page.getByRole("button", { name: /IG Post/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /GIF/i }).click();
  const download = await downloadPromise;
  const buffer = await readDownloadBuffer(download, testInfo);

  expect(download.suggestedFilename()).toBe("shader_wobble_ig_post.gif");
  expect(buffer.subarray(0, 6).toString("ascii")).toBe("GIF89a");
  expect(buffer.length).toBeGreaterThan(1000);
});

test("batch zip export downloads processed png entries for the active format", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "FORMAT" }).click();
  await page.getByRole("button", { name: /IG Post/i }).click();
  await page.getByRole("button", { name: "BATCH" }).click();
  await page.locator('input[aria-label="Batch images"]').setInputFiles(SAMPLE_IMAGE);
  await page.getByRole("button", { name: "Process All" }).click();
  await expect(page.getByRole("button", { name: "↓ ZIP" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ ZIP" }).click();
  const download = await downloadPromise;
  const buffer = await readDownloadBuffer(download, testInfo);

  expect(download.suggestedFilename()).toBe("shader_batch_1_ig_post.zip");
  expect(buffer.readUInt32LE(0)).toBe(0x04034b50);
  expect(listZipEntryNames(buffer)).toEqual(["shader_sample_ig_post_1.png"]);
});

test("video export stops captured canvas tracks after download", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.__shaderLabTrackStopped = false;
    HTMLCanvasElement.prototype.captureStream = () => ({
      getTracks: () => [{
        stop: () => {
          window.__shaderLabTrackStopped = true;
        },
      }],
    });

    window.MediaRecorder = class FakeMediaRecorder extends EventTarget {
      static isTypeSupported(mimeType) {
        return mimeType.includes("webm");
      }

      constructor(stream, options) {
        super();
        this.stream = stream;
        this.mimeType = options.mimeType;
        this.state = "inactive";
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["video"], { type: this.mimeType }) });
        this.onstop?.();
      }
    };
  });

  await page.goto("/");
  await uploadFilterFixture(page);
  await page.getByRole("button", { name: "FORMAT" }).click();
  await page.getByRole("button", { name: /IG Post/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /MP4/i }).click();
  await page.getByRole("button", { name: /REC/i }).click();
  const download = await downloadPromise;
  const buffer = await readDownloadBuffer(download, testInfo);

  expect(download.suggestedFilename()).toBe("shader_wobble_ig_post_3s.webm");
  expect(buffer.toString("utf8")).toBe("video");
  await expect.poll(() => page.evaluate(() => window.__shaderLabTrackStopped)).toBe(true);
});

test("webgl failures are surfaced as a visible filter error state", async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
      if (type === "webgl" || type === "experimental-webgl") return null;
      return originalGetContext.call(this, type, ...args);
    };
  });

  await page.goto("/");
  await uploadFilterFixture(page);

  await expect(page.getByRole("alert")).toContainText("WebGL is unavailable");
});

test("batch tab accepts queued image files", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "BATCH" }).click();

  await page.locator('input[aria-label="Batch images"]').setInputFiles(SAMPLE_IMAGE);

  await expect(page.getByText("sample.svg")).toBeVisible();
  await expect(page.getByRole("button", { name: "Process All" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "↓ ZIP" })).toBeDisabled();
});

test("local filter presets can be deleted", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "shader-lab.filters.custom-presets.v1",
      JSON.stringify([{ name: "Local Test", shader: "wobble", icon: "💾", params: {} }])
    );
  });

  await page.goto("/");
  await page.getByRole("button", { name: "PRESETS" }).click();

  await expect(page.getByRole("button", { name: /apply local preset local test/i })).toBeVisible();
  await page.getByRole("button", { name: /delete local preset local test/i }).click();
  await expect(page.getByRole("button", { name: /apply local preset local test/i })).toHaveCount(0);
  await expect(page.getByText("No local presets saved.")).toBeVisible();
});

test("saved filter presets persist after reload", async ({ page }) => {
  page.on("dialog", async (dialog) => {
    await dialog.accept("Reloaded Preset");
  });

  await page.goto("/");
  await uploadFilterFixture(page);
  await page.getByRole("button", { name: "SAVE PRESET" }).click();
  await page.reload();
  await page.getByRole("button", { name: "PRESETS" }).click();

  await expect(page.getByRole("button", { name: /apply local preset reloaded preset/i })).toBeVisible();
});
