import { FORMATS } from "./formats.js";
import { createSizedCanvas, drawImageCover, getSourceDimensions } from "./imageUtils.js";

const BAYER_8 = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];

const BRAILLE_CHARS = Array.from({ length: 256 }, (_, index) =>
  String.fromCharCode(0x2800 + index)
).join("");

export const ASCII_FONT_OPTIONS = [
  { id: "ibm_plex_mono", label: "IBM Plex Mono", stack: "'IBM Plex Mono','JetBrains Mono',monospace" },
  { id: "jetbrains_mono", label: "JetBrains Mono", stack: "'JetBrains Mono','IBM Plex Mono',monospace" },
  { id: "space_mono", label: "Space Mono", stack: "'Space Mono','IBM Plex Mono',monospace" },
  { id: "ibm_plex_sans", label: "IBM Plex Sans", stack: "'IBM Plex Sans','Helvetica Neue','Arial',sans-serif" },
];

export const ASCII_CHARSET_OPTIONS = [
  { id: "standard", label: "Standard", chars: " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$" },
  { id: "dense", label: "Dense", chars: " `.-:=+*#%@$WM8B&Q0OZdbqphao*mwXnuvczxrjft/|()1{}[]?-_+~i!lI;:,^\"'." },
  { id: "technical", label: "Technical", chars: " .,:;<>/\\\\|()[]{}=+*x#%@M" },
  { id: "blocks", label: "Blocks", chars: " ▁▂▃▄▅▆▇█▓▒░" },
];

export const ASCII_STYLE_OPTIONS = [
  { id: "classic", label: "Classic ASCII" },
  { id: "braille", label: "Braille" },
  { id: "halftone", label: "Halftone" },
  { id: "line", label: "Line" },
  { id: "dotCross", label: "Dot Cross" },
];

export const ASCII_DITHER_OPTIONS = [
  { id: "none", label: "None" },
  { id: "ordered8x8", label: "Ordered 8x8" },
  { id: "floydSteinberg", label: "Floyd-Steinberg" },
  { id: "atkinson", label: "Atkinson" },
];

export const ASCII_COLOR_MODES = [
  { id: "grayscale", label: "Grayscale" },
  { id: "fullColor", label: "Full Color" },
  { id: "matrix", label: "Matrix" },
  { id: "amber", label: "Amber" },
  { id: "custom", label: "Custom" },
];

export const ASCII_FX_PRESETS = [
  { id: "none", label: "None" },
  { id: "noiseField", label: "Noise Field" },
  { id: "scanlines", label: "Scanlines" },
  { id: "phosphor", label: "Phosphor" },
];

export const ASCII_MOTION_MODE_OPTIONS = [
  { id: "none", label: "Off" },
  { id: "directional", label: "Directional" },
];

export const ASCII_DIRECTION_OPTIONS = [
  { id: "up", label: "Up", symbol: "↑" },
  { id: "down", label: "Down", symbol: "↓" },
  { id: "left", label: "Left", symbol: "←" },
  { id: "right", label: "Right", symbol: "→" },
  { id: "upLeft", label: "Up Left", symbol: "↖" },
  { id: "upRight", label: "Up Right", symbol: "↗" },
  { id: "downLeft", label: "Down Left", symbol: "↙" },
  { id: "downRight", label: "Down Right", symbol: "↘" },
];

export const ASCII_QUALITY_OPTIONS = [160, 240, 320, 420];

export const DEFAULT_ASCII_CONFIG = {
  style: "classic",
  fontFamily: "ibm_plex_mono",
  charsetId: "standard",
  quality: 320,
  cellSize: 13,
  characterSpacing: 1.05,
  brightness: -0.02,
  contrast: 1.18,
  ditherAlgorithm: "floydSteinberg",
  ditherStrength: 0.72,
  bgDither: 0,
  invertDither: false,
  colorMode: "grayscale",
  inkColor: "#f4f1dc",
  bgColor: "#040404",
  invertColor: false,
  opacity: 1,
  vignette: 0.12,
  borderGlow: 0.08,
  fxPreset: "none",
  fxStrength: 0.35,
  motionMode: "none",
  motionDirection: "upLeft",
  intervalSpacing: 9,
  intervalSpeed: 0.9,
  intervalWidth: 3,
  interactionMode: "none",
  hoverStrength: 24,
  areaSize: 180,
  spread: 1.15,
};

export const ASCII_PRESETS = [
  { id: "mono_wire", name: "Mono Wire", config: { style: "classic", colorMode: "grayscale", charsetId: "technical", ditherAlgorithm: "ordered8x8", borderGlow: 0 } },
  { id: "matrix_rain", name: "Matrix Rain", config: { style: "classic", colorMode: "matrix", charsetId: "dense", fxPreset: "noiseField", fxStrength: 0.48, ditherAlgorithm: "floydSteinberg" } },
  { id: "amber_dispatch", name: "Amber Dispatch", config: { style: "line", colorMode: "amber", fontFamily: "ibm_plex_sans", ditherAlgorithm: "atkinson", cellSize: 10 } },
  { id: "braille_ghost", name: "Braille Ghost", config: { style: "braille", colorMode: "grayscale", quality: 420, cellSize: 12, ditherAlgorithm: "none" } },
  { id: "tabloid", name: "Tabloid", config: { style: "halftone", colorMode: "grayscale", charsetId: "blocks", ditherAlgorithm: "ordered8x8", bgDither: 0.25 } },
  { id: "signal_blue", name: "Signal Blue", config: { style: "dotCross", colorMode: "custom", inkColor: "#8fe7ff", bgColor: "#071018", borderGlow: 0.1 } },
  { id: "red_room", name: "Red Room", config: { style: "dotCross", colorMode: "custom", inkColor: "#ff714b", bgColor: "#120301", ditherAlgorithm: "floydSteinberg" } },
  { id: "soft_phosphor", name: "Soft Phosphor", config: { style: "classic", colorMode: "matrix", fxPreset: "phosphor", fxStrength: 0.42, borderGlow: 0.24 } },
  { id: "line_courier", name: "Line Courier", config: { style: "line", colorMode: "grayscale", fontFamily: "space_mono", ditherAlgorithm: "none", characterSpacing: 1.16 } },
  { id: "dense_frost", name: "Dense Frost", config: { style: "classic", colorMode: "custom", inkColor: "#cce3ff", bgColor: "#090c13", charsetId: "dense", quality: 420 } },
  { id: "poster_mono", name: "Poster Mono", config: { style: "classic", colorMode: "fullColor", charsetId: "blocks", ditherAlgorithm: "ordered8x8", cellSize: 13 } },
  { id: "night_grid", name: "Night Grid", config: { style: "halftone", colorMode: "custom", inkColor: "#d9f5a1", bgColor: "#050806", fxPreset: "scanlines", fxStrength: 0.5 } },
  { id: "north_beam", name: "North Beam", config: { style: "classic", colorMode: "grayscale", charsetId: "technical", motionMode: "directional", motionDirection: "up", intervalSpacing: 8, intervalSpeed: 0.76, intervalWidth: 2.7, fxStrength: 0.4 } },
  { id: "braille_surge", name: "Braille Surge", config: { style: "braille", colorMode: "grayscale", quality: 420, motionMode: "directional", motionDirection: "downRight", intervalSpacing: 9, intervalSpeed: 0.92, intervalWidth: 3.4, fxStrength: 0.44 } },
  { id: "halftone_drift", name: "Halftone Drift", config: { style: "halftone", colorMode: "custom", inkColor: "#e8ff98", bgColor: "#050805", motionMode: "directional", motionDirection: "left", intervalSpacing: 11, intervalSpeed: 0.84, intervalWidth: 3.8, fxStrength: 0.42 } },
  { id: "line_crosswind", name: "Line Crosswind", config: { style: "line", colorMode: "amber", fontFamily: "ibm_plex_sans", motionMode: "directional", motionDirection: "upLeft", intervalSpacing: 8, intervalSpeed: 1.05, intervalWidth: 2.5, fxStrength: 0.46 } },
  { id: "dot_vector", name: "Dot Vector", config: { style: "dotCross", colorMode: "custom", inkColor: "#8fe7ff", bgColor: "#091119", motionMode: "directional", motionDirection: "right", intervalSpacing: 10, intervalSpeed: 0.88, intervalWidth: 3.1, fxStrength: 0.43 } },
];

const STYLE_CHARSETS = {
  classic: null,
  halftone: " .,:;ox%#@",
  dotCross: " ·:+x*#@",
  line: " ─│╱╲┼#",
};

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  upLeft: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  upRight: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  downLeft: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  downRight: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
};

const atlasCache = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mod(value, base) {
  if (base === 0) return 0;
  return ((value % base) + base) % base;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const source = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const value = parseInt(source, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToCss({ r, g, b }, alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function mixRgb(a, b, t) {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

function getFontStack(fontId) {
  return ASCII_FONT_OPTIONS.find((option) => option.id === fontId)?.stack
    || ASCII_FONT_OPTIONS[0].stack;
}

function getDirectionVector(directionId) {
  return DIRECTION_VECTORS[directionId] || DIRECTION_VECTORS.upLeft;
}

function getCharset(config) {
  if (config.style === "braille") return BRAILLE_CHARS;
  if (config.style === "classic") {
    return ASCII_CHARSET_OPTIONS.find((option) => option.id === config.charsetId)?.chars
      || ASCII_CHARSET_OPTIONS[0].chars;
  }
  return STYLE_CHARSETS[config.style] || ASCII_CHARSET_OPTIONS[0].chars;
}

function getFormatSize(source, formatKey) {
  const format = FORMATS[formatKey] || FORMATS.free;
  const sourceSize = getSourceDimensions(source);
  return {
    width: format.w > 0 ? format.w : sourceSize.width,
    height: format.h > 0 ? format.h : sourceSize.height,
  };
}

function buildGlyphAtlas(fontFamily, fontSize, glyphs) {
  const cacheKey = `${fontFamily}:${fontSize}:${glyphs}`;
  if (atlasCache.has(cacheKey)) {
    return atlasCache.get(cacheKey);
  }

  const canvas = createSizedCanvas(1, 1);
  const ctx = canvas.getContext("2d");
  const stack = getFontStack(fontFamily);
  ctx.font = `600 ${fontSize}px ${stack}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let maxWidth = 0;
  for (const glyph of glyphs) {
    maxWidth = Math.max(maxWidth, ctx.measureText(glyph).width);
  }

  const tileWidth = Math.ceil(maxWidth + fontSize * 0.75);
  const tileHeight = Math.ceil(fontSize * 1.65);
  const columns = Math.min(16, glyphs.length);
  const rows = Math.ceil(glyphs.length / columns);

  canvas.width = tileWidth * columns;
  canvas.height = tileHeight * rows;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `600 ${fontSize}px ${stack}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";

  const glyphMap = new Map();
  [...glyphs].forEach((glyph, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * tileWidth + tileWidth / 2;
    const y = row * tileHeight + tileHeight / 2 + fontSize * 0.02;
    ctx.fillText(glyph, x, y);
    glyphMap.set(glyph, {
      sx: col * tileWidth,
      sy: row * tileHeight,
      sw: tileWidth,
      sh: tileHeight,
    });
  });

  const atlas = { canvas, glyphMap, tileWidth, tileHeight };
  atlasCache.set(cacheKey, atlas);
  return atlas;
}

function ensureOriginalCanvas(originalCanvas, source, formatKey) {
  if (!originalCanvas || !source) return null;
  const size = getFormatSize(source, formatKey);
  originalCanvas.width = size.width;
  originalCanvas.height = size.height;
  const ctx = originalCanvas.getContext("2d");
  drawImageCover(ctx, source, size.width, size.height);
  return size;
}

function createSampleCanvas(originalCanvas, quality) {
  const longest = Math.max(originalCanvas.width, originalCanvas.height);
  const scale = clamp(quality / longest, 0.18, 1);
  const sampleCanvas = createSizedCanvas(
    Math.max(32, Math.round(originalCanvas.width * scale)),
    Math.max(32, Math.round(originalCanvas.height * scale))
  );
  const sampleCtx = sampleCanvas.getContext("2d");
  sampleCtx.imageSmoothingEnabled = true;
  sampleCtx.drawImage(originalCanvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
  return { sampleCanvas, sampleCtx };
}

function samplePixel(data, width, height, x, y) {
  const px = clamp(Math.round(x), 0, width - 1);
  const py = clamp(Math.round(y), 0, height - 1);
  const idx = (py * width + px) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
  };
}

function luminance({ r, g, b }) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function applyFxToBrightness(base, x, y, config, time) {
  let value = clamp(base, 0, 1);

  if (config.fxPreset === "noiseField") {
    const wave = Math.sin((x * 0.37 + y * 0.23 + time * 2.1) * 1.7) * 0.5 + 0.5;
    value = clamp(lerp(value, value * wave + (1 - wave) * 0.85, config.fxStrength), 0, 1);
  }

  if (config.fxPreset === "scanlines") {
    const scanline = y % 2 === 0 ? 1 : 1 - config.fxStrength * 0.28;
    value = clamp(value * scanline, 0, 1);
  }

  if (config.fxPreset === "phosphor") {
    const tail = Math.sin(time * 1.8 + y * 0.12) * 0.5 + 0.5;
    value = clamp(lerp(value, value * 0.82 + tail * 0.12, config.fxStrength * 0.5), 0, 1);
  }

  return value;
}

function resolveDirectionalMotionField({
  col,
  row,
  cols,
  rows,
  cellWidth,
  cellHeight,
  config,
  time,
}) {
  if (config.motionMode !== "directional") {
    return {
      sampleOffsetX: 0,
      sampleOffsetY: 0,
      drawOffsetX: 0,
      drawOffsetY: 0,
      visibility: 1,
      brightnessShift: 0,
    };
  }

  const direction = getDirectionVector(config.motionDirection);
  const perpX = -direction.y;
  const perpY = direction.x;
  const centeredCol = col - cols * 0.5;
  const centeredRow = row - rows * 0.5;
  const along = centeredCol * direction.x + centeredRow * direction.y;
  const across = centeredCol * perpX + centeredRow * perpY;
  const spacing = clamp(config.intervalSpacing, 4, 18);
  const width = clamp(config.intervalWidth, 1, Math.max(1.15, spacing - 0.4));
  const speed = clamp(config.intervalSpeed, 0.15, 1.8);
  const cycle = Math.max(width + spacing, width + 1);
  const travel = along * 0.28 - time * speed * 6.5;
  const bandCoord = across + travel;
  const phase = mod(bandCoord, cycle);
  const distanceToBand = Math.min(phase, cycle - phase);
  const bandStrength = 1 - smoothstep(width * 0.45, width + 0.75, distanceToBand);
  const travelWave = Math.sin(travel * 0.5 + across * 0.15) * 0.5 + 0.5;
  const laneWave = Math.cos(across * 0.55 - time * speed * 1.5) * 0.5 + 0.5;
  const amplitude = Math.max(cellWidth, cellHeight) * config.fxStrength;
  const sampleLead = amplitude * (bandStrength * 0.45 + travelWave * 0.18);
  const drawLead = amplitude * (bandStrength * (0.9 + laneWave * 0.85));
  const lateralSway = amplitude * bandStrength * (laneWave - 0.5) * 0.8;

  return {
    sampleOffsetX: direction.x * sampleLead * 0.55 + perpX * lateralSway * 0.22,
    sampleOffsetY: direction.y * sampleLead * 0.55 + perpY * lateralSway * 0.22,
    drawOffsetX: direction.x * drawLead + perpX * lateralSway * 0.58,
    drawOffsetY: direction.y * drawLead + perpY * lateralSway * 0.58,
    visibility: clamp(0.38 + bandStrength * 0.62 + travelWave * 0.12, 0.22, 1),
    brightnessShift: bandStrength * 0.08 + (travelWave - 0.5) * 0.05,
  };
}

function resolvePointerMotionField({
  col,
  row,
  cols,
  rows,
  cellWidth,
  cellHeight,
  outputWidth,
  outputHeight,
  config,
  pointer,
}) {
  if (!pointer?.active || config.interactionMode === "none") {
    return {
      sampleOffsetX: 0,
      sampleOffsetY: 0,
      drawOffsetX: 0,
      drawOffsetY: 0,
      visibility: 1,
      brightnessShift: 0,
      influence: 0,
    };
  }

  const cellCenterX = ((col + 0.5) / cols) * outputWidth;
  const cellCenterY = ((row + 0.5) / rows) * outputHeight;
  const px = pointer.x * outputWidth;
  const py = pointer.y * outputHeight;
  const dx = px - cellCenterX;
  const dy = py - cellCenterY;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance > config.areaSize) {
    return {
      sampleOffsetX: 0,
      sampleOffsetY: 0,
      drawOffsetX: 0,
      drawOffsetY: 0,
      visibility: 1,
      brightnessShift: 0,
      influence: 0,
    };
  }

  const influence = clamp(1 - distance / Math.max(1, config.areaSize), 0, 1);
  const direction = config.interactionMode === "attract" ? 1 : -1;
  const nx = distance === 0 ? 0 : dx / distance;
  const ny = distance === 0 ? 0 : dy / distance;
  const baseScale = Math.max(cellWidth, cellHeight);
  const pointerForce = (config.hoverStrength / 36) * config.spread * influence;

  return {
    sampleOffsetX: nx * baseScale * pointerForce * 0.32 * direction,
    sampleOffsetY: ny * baseScale * pointerForce * 0.32 * direction,
    drawOffsetX: nx * baseScale * pointerForce * 0.9 * direction,
    drawOffsetY: ny * baseScale * pointerForce * 0.9 * direction,
    visibility: clamp(0.9 + influence * 0.14, 0.9, 1.05),
    brightnessShift: influence * 0.12 * direction,
    influence,
  };
}

function buildCellGrid(sampleCtx, outputWidth, outputHeight, config, time, pointer) {
  const glyphHeight = Math.max(8, config.cellSize);
  const glyphWidth = glyphHeight * 0.62 * config.characterSpacing;
  const cols = Math.max(16, Math.floor(outputWidth / glyphWidth));
  const rows = Math.max(12, Math.floor(outputHeight / glyphHeight));
  const cellWidth = outputWidth / cols;
  const cellHeight = outputHeight / rows;

  const { width: sampleWidth, height: sampleHeight } = sampleCtx.canvas;
  const { data } = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight);
  const brightnessGrid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const colorGrid = Array.from({ length: rows }, () => new Array(cols).fill({ r: 0, g: 0, b: 0 }));
  const blockGrid = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const motionGrid = Array.from({ length: rows }, () => new Array(cols).fill(null));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const baseSampleX = (col + 0.5) / cols * sampleWidth;
      const baseSampleY = (row + 0.5) / rows * sampleHeight;
      const directionalMotion = resolveDirectionalMotionField({
        col,
        row,
        cols,
        rows,
        cellWidth,
        cellHeight,
        config,
        time,
      });
      const pointerMotion = resolvePointerMotionField({
        col,
        row,
        cols,
        rows,
        cellWidth,
        cellHeight,
        outputWidth,
        outputHeight,
        config,
        pointer,
      });
      const sampleX = baseSampleX
        + ((directionalMotion.sampleOffsetX + pointerMotion.sampleOffsetX) * sampleWidth / outputWidth);
      const sampleY = baseSampleY
        + ((directionalMotion.sampleOffsetY + pointerMotion.sampleOffsetY) * sampleHeight / outputHeight);
      const points = [
        samplePixel(data, sampleWidth, sampleHeight, sampleX, sampleY),
        samplePixel(data, sampleWidth, sampleHeight, sampleX - 0.4, sampleY - 0.25),
        samplePixel(data, sampleWidth, sampleHeight, sampleX + 0.4, sampleY - 0.25),
        samplePixel(data, sampleWidth, sampleHeight, sampleX - 0.4, sampleY + 0.25),
        samplePixel(data, sampleWidth, sampleHeight, sampleX + 0.4, sampleY + 0.25),
      ];

      const avg = points.reduce((acc, point) => ({
        r: acc.r + point.r / points.length,
        g: acc.g + point.g / points.length,
        b: acc.b + point.b / points.length,
      }), { r: 0, g: 0, b: 0 });

      const rawLum = luminance(avg);
      const contrastAdjusted = clamp((rawLum - 0.5) * config.contrast + 0.5 + config.brightness, 0, 1);
      const brightness = clamp(
        applyFxToBrightness(contrastAdjusted, col, row, config, time)
          + directionalMotion.brightnessShift
          + pointerMotion.brightnessShift,
        0,
        1
      );

      brightnessGrid[row][col] = brightness;
      colorGrid[row][col] = avg;
      motionGrid[row][col] = {
        drawOffsetX: directionalMotion.drawOffsetX + pointerMotion.drawOffsetX,
        drawOffsetY: directionalMotion.drawOffsetY + pointerMotion.drawOffsetY,
        visibility: clamp(directionalMotion.visibility * pointerMotion.visibility, 0.18, 1),
      };

      if (config.style === "braille") {
        let bits = 0;
        const braillePoints = [
          [0.25, 0.125, 0x1],
          [0.25, 0.375, 0x2],
          [0.25, 0.625, 0x4],
          [0.25, 0.875, 0x40],
          [0.75, 0.125, 0x8],
          [0.75, 0.375, 0x10],
          [0.75, 0.625, 0x20],
          [0.75, 0.875, 0x80],
        ];

        for (const [dx, dy, mask] of braillePoints) {
          const point = samplePixel(
            data,
            sampleWidth,
            sampleHeight,
            (col + dx) / cols * sampleWidth,
            (row + dy) / rows * sampleHeight
          );
          const pointLum = luminance(point);
          if (config.invertDither ? pointLum > 0.5 : pointLum < 0.5) bits |= mask;
        }

        blockGrid[row][col] = bits;
      }
    }
  }

  return { cols, rows, cellWidth, cellHeight, brightnessGrid, colorGrid, blockGrid, motionGrid };
}

function quantizeBrightnessGrid(brightnessGrid, glyphCount, config) {
  const rows = brightnessGrid.length;
  const cols = brightnessGrid[0].length;
  const levels = Math.max(2, glyphCount - 1);
  const quantized = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const working = brightnessGrid.map((row) => row.slice());

  const quantize = (value, x, y) => {
    let adjusted = value;
    if (config.ditherAlgorithm === "ordered8x8") {
      adjusted = clamp(
        value + ((BAYER_8[y % 8][x % 8] / 63) - 0.5) * config.ditherStrength * 0.35,
        0,
        1
      );
    }

    const maybeInverted = config.invertDither ? 1 - adjusted : adjusted;
    return Math.round(maybeInverted * levels);
  };

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const oldValue = clamp(working[y][x], 0, 1);
      const level = quantize(oldValue, x, y);
      quantized[y][x] = level;

      if (config.ditherAlgorithm === "floydSteinberg" || config.ditherAlgorithm === "atkinson") {
        const newValue = level / levels;
        const error = (oldValue - newValue) * config.ditherStrength;
        const spread = config.ditherAlgorithm === "floydSteinberg"
          ? [
            [1, 0, 7 / 16],
            [-1, 1, 3 / 16],
            [0, 1, 5 / 16],
            [1, 1, 1 / 16],
          ]
          : [
            [1, 0, 1 / 8],
            [2, 0, 1 / 8],
            [-1, 1, 1 / 8],
            [0, 1, 1 / 8],
            [1, 1, 1 / 8],
            [0, 2, 1 / 8],
          ];

        for (const [dx, dy, weight] of spread) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            working[ny][nx] = clamp(working[ny][nx] + error * weight, 0, 1);
          }
        }
      }
    }
  }

  return quantized;
}

function resolveCellColors(avgColor, brightness, config) {
  const source = avgColor;
  let ink = { r: 244, g: 241, b: 220 };
  let bg = { r: 4, g: 4, b: 4 };

  if (config.colorMode === "fullColor") {
    ink = source;
    bg = mixRgb(source, { r: 0, g: 0, b: 0 }, 0.9);
  } else if (config.colorMode === "matrix") {
    ink = {
      r: lerp(32, 125, brightness),
      g: lerp(160, 255, brightness),
      b: lerp(60, 155, brightness),
    };
    bg = { r: 2, g: 7, b: 3 };
  } else if (config.colorMode === "amber") {
    ink = {
      r: lerp(160, 255, brightness),
      g: lerp(85, 198, brightness),
      b: lerp(18, 94, brightness),
    };
    bg = { r: 12, g: 6, b: 2 };
  } else if (config.colorMode === "custom") {
    ink = hexToRgb(config.inkColor);
    bg = hexToRgb(config.bgColor);
  } else {
    const gray = lerp(168, 255, brightness);
    ink = { r: gray, g: gray, b: gray };
    bg = { r: 3, g: 3, b: 3 };
  }

  const bgMix = clamp(config.bgDither, 0, 1) * (1 - brightness) * 0.16;
  bg = mixRgb(bg, ink, bgMix);

  if (config.invertColor) {
    return { ink: bg, bg: ink };
  }

  return { ink, bg };
}

function drawTintedGlyph(ctx, atlas, glyph, x, y, width, height, color, alpha) {
  const glyphRect = atlas.glyphMap.get(glyph) || atlas.glyphMap.get(" ") || atlas.glyphMap.values().next().value;
  if (!glyphRect) return;

  const insetX = width * 0.08;
  const insetY = height * 0.04;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(
    atlas.canvas,
    glyphRect.sx,
    glyphRect.sy,
    glyphRect.sw,
    glyphRect.sh,
    x + insetX,
    y + insetY,
    width - insetX * 2,
    height - insetY * 2
  );
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function chooseLineGlyph(quantized, left, right, top, bottom) {
  if (quantized <= 0) return " ";
  const dx = right - left;
  const dy = bottom - top;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < 0.06 && ady < 0.06) return quantized > 2 ? "┼" : "·";
  if (adx > ady * 1.45) return "─";
  if (ady > adx * 1.45) return "│";
  return dx * dy > 0 ? "╲" : "╱";
}

function drawAsciiGrid(outputCanvas, originalCanvas, config, time, pointer) {
  const outputCtx = outputCanvas.getContext("2d");
  const { sampleCtx } = createSampleCanvas(originalCanvas, config.quality);
  const grid = buildCellGrid(sampleCtx, outputCanvas.width, outputCanvas.height, config, time, pointer);
  const glyphs = getCharset(config);
  const atlas = buildGlyphAtlas(config.fontFamily, Math.round(config.cellSize * 1.08), glyphs);
  const toneGrid = quantizeBrightnessGrid(grid.brightnessGrid, glyphs.length, config);

  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.fillStyle = config.colorMode === "custom" ? config.bgColor : "#030303";
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const x = col * grid.cellWidth;
      const y = row * grid.cellHeight;
      const brightness = grid.brightnessGrid[row][col];
      const motionCell = grid.motionGrid[row][col];
      const { ink, bg } = resolveCellColors(grid.colorGrid[row][col], brightness, config);
      if (config.bgDither > 0.08 || config.colorMode === "fullColor" || config.colorMode === "custom") {
        outputCtx.fillStyle = rgbToCss(bg, 1);
        outputCtx.fillRect(x, y, grid.cellWidth, grid.cellHeight);
      }

      let glyph = glyphs[Math.min(glyphs.length - 1, toneGrid[row][col])];
      if (config.style === "braille") {
        glyph = String.fromCharCode(0x2800 + (grid.blockGrid[row][col] || 0));
      } else if (config.style === "line") {
        const left = grid.brightnessGrid[row][Math.max(0, col - 1)];
        const right = grid.brightnessGrid[row][Math.min(grid.cols - 1, col + 1)];
        const top = grid.brightnessGrid[Math.max(0, row - 1)][col];
        const bottom = grid.brightnessGrid[Math.min(grid.rows - 1, row + 1)][col];
        glyph = chooseLineGlyph(toneGrid[row][col], left, right, top, bottom);
      }

      drawTintedGlyph(
        outputCtx,
        atlas,
        glyph,
        x + motionCell.drawOffsetX,
        y + motionCell.drawOffsetY,
        grid.cellWidth,
        grid.cellHeight,
        rgbToCss(ink, config.opacity * motionCell.visibility),
        config.opacity * motionCell.visibility
      );
    }
  }

  if (config.fxPreset === "phosphor" || config.borderGlow > 0) {
    const glowStrength = clamp(config.borderGlow + (config.fxPreset === "phosphor" ? config.fxStrength * 0.18 : 0), 0, 0.8);
    if (glowStrength > 0) {
      const glowCanvas = createSizedCanvas(outputCanvas.width, outputCanvas.height);
      const glowCtx = glowCanvas.getContext("2d");
      glowCtx.drawImage(outputCanvas, 0, 0);
      outputCtx.save();
      outputCtx.globalCompositeOperation = "screen";
      outputCtx.filter = `blur(${Math.max(2, glowStrength * 18)}px)`;
      outputCtx.globalAlpha = clamp(glowStrength * 0.9, 0, 0.75);
      outputCtx.drawImage(glowCanvas, 0, 0);
      outputCtx.restore();
    }
  }

  if (config.fxPreset === "scanlines") {
    outputCtx.save();
    outputCtx.globalAlpha = clamp(config.fxStrength * 0.22, 0, 0.35);
    outputCtx.fillStyle = "#000000";
    for (let y = 1; y < outputCanvas.height; y += 3) {
      outputCtx.fillRect(0, y, outputCanvas.width, 1);
    }
    outputCtx.restore();
  }

  if (config.vignette > 0) {
    const vignette = outputCtx.createRadialGradient(
      outputCanvas.width * 0.5,
      outputCanvas.height * 0.5,
      outputCanvas.width * 0.15,
      outputCanvas.width * 0.5,
      outputCanvas.height * 0.5,
      Math.max(outputCanvas.width, outputCanvas.height) * 0.7
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(0,0,0,${clamp(config.vignette * 0.7, 0, 0.75)})`);
    outputCtx.fillStyle = vignette;
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  }
}

export async function ensureAsciiFontsLoaded() {
  if (!document.fonts?.load) return;
  await Promise.all(
    ASCII_FONT_OPTIONS.map((font) => document.fonts.load(`600 16px ${getFontStack(font.id)}`))
  );
}

export function applyAsciiPreset(currentConfig, preset) {
  return {
    ...currentConfig,
    ...preset.config,
  };
}

export function randomizeAsciiConfig(currentConfig) {
  const seedPreset = ASCII_PRESETS[Math.floor(Math.random() * ASCII_PRESETS.length)];
  const base = applyAsciiPreset(currentConfig, seedPreset);
  const motionEnabled = Math.random() > 0.55;
  const motionDirection = ASCII_DIRECTION_OPTIONS[Math.floor(Math.random() * ASCII_DIRECTION_OPTIONS.length)].id;
  const next = {
    ...base,
    quality: ASCII_QUALITY_OPTIONS[Math.floor(Math.random() * ASCII_QUALITY_OPTIONS.length)],
    cellSize: clamp(base.cellSize + (Math.random() * 4 - 2), 8, 18),
    characterSpacing: clamp(base.characterSpacing + (Math.random() * 0.24 - 0.12), 0.9, 1.24),
    brightness: clamp(base.brightness + (Math.random() * 0.22 - 0.11), -0.35, 0.35),
    contrast: clamp(base.contrast + (Math.random() * 0.28 - 0.14), 0.72, 1.8),
    ditherStrength: clamp(base.ditherStrength + (Math.random() * 0.24 - 0.12), 0, 1),
    bgDither: clamp(base.bgDither + (Math.random() * 0.18 - 0.09), 0, 0.5),
    opacity: clamp(base.opacity + (Math.random() * 0.12 - 0.06), 0.75, 1),
    vignette: clamp(base.vignette + (Math.random() * 0.18 - 0.09), 0, 0.45),
    borderGlow: clamp(base.borderGlow + (Math.random() * 0.12 - 0.06), 0, 0.4),
    fxStrength: clamp(base.fxStrength + (Math.random() * 0.2 - 0.1), 0, 0.8),
    motionMode: motionEnabled ? "directional" : "none",
    motionDirection,
    intervalSpacing: clamp((base.intervalSpacing ?? 9) + (Math.random() * 4 - 2), 5, 16),
    intervalSpeed: clamp((base.intervalSpeed ?? 0.9) + (Math.random() * 0.45 - 0.22), 0.2, 1.6),
    intervalWidth: clamp((base.intervalWidth ?? 3) + (Math.random() * 1.5 - 0.75), 1.2, 5.4),
    hoverStrength: clamp(base.hoverStrength + (Math.random() * 10 - 5), 8, 48),
    areaSize: clamp(base.areaSize + (Math.random() * 60 - 30), 80, 320),
    spread: clamp(base.spread + (Math.random() * 0.25 - 0.12), 0.7, 1.9),
  };

  return {
    config: next,
    preset: seedPreset,
  };
}

export function isAsciiAnimated(config, sourceType = "image") {
  return config.fxPreset === "noiseField"
    || (sourceType === "image" && config.motionMode === "directional")
    || sourceType === "video"
    || sourceType === "camera";
}

export function renderAsciiFrame({
  source,
  outputCanvas,
  originalCanvas,
  config,
  formatKey = "free",
  time = 0,
  pointer = null,
  sourceType = "image",
}) {
  if (!source || !outputCanvas || !originalCanvas) return null;

  const size = ensureOriginalCanvas(originalCanvas, source, formatKey);
  outputCanvas.width = size.width;
  outputCanvas.height = size.height;
  const effectiveConfig = sourceType === "image"
    ? config
    : { ...config, motionMode: "none" };
  drawAsciiGrid(outputCanvas, originalCanvas, effectiveConfig, time, pointer);
  return size;
}
