import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GIFEncoder from "./lib/GIFEncoder.js";
import { FORMATS } from "./lib/formats.js";
import {
  applyAsciiPreset,
  ASCII_CHARSET_OPTIONS,
  ASCII_COLOR_MODES,
  ASCII_DIRECTION_OPTIONS,
  ASCII_DITHER_OPTIONS,
  ASCII_FONT_OPTIONS,
  ASCII_FX_PRESETS,
  ASCII_MOTION_MODE_OPTIONS,
  ASCII_PRESETS,
  ASCII_QUALITY_OPTIONS,
  ASCII_STYLE_OPTIONS,
  DEFAULT_ASCII_CONFIG,
  ensureAsciiFontsLoaded,
  isAsciiAnimated,
  randomizeAsciiConfig,
  renderAsciiFrame,
} from "./lib/asciiRenderer.js";
import { downscaleImage, loadImageFromFile } from "./lib/imageUtils.js";
import {
  captureCanvasPoster,
  createCameraSource,
  createImageAssetFromPreview,
  createVideoAssetFromFile,
  stopMediaStream,
} from "./lib/mediaSources.js";
import { createRendererContract } from "./lib/rendererContract.js";

const STORAGE_KEY = "shader-lab.ascii.creations.v2";

const ASCII_TEMPLATES = [
  { id: "poster", name: "Poster Relay", format: "ig_post", presetId: "mono_wire", note: "Square campaign still" },
  { id: "story", name: "Story Signal", format: "ig_story", presetId: "matrix_rain", note: "Tall social motion still" },
  { id: "thumb", name: "Thumbnail Grid", format: "yt_thumb", presetId: "night_grid", note: "Wide contrast-heavy preview" },
  { id: "product", name: "Product Card", format: "twitter", presetId: "poster_mono", note: "Marketing product crop" },
  { id: "cover", name: "Cover Slate", format: "linkedin", presetId: "dense_frost", note: "Editorial hero lockup" },
];

const SOURCE_MODE_OPTIONS = [
  { id: "image", label: "Image / Still" },
  { id: "video", label: "Video" },
  { id: "camera", label: "Live Cam" },
];

const INTERACTION_OPTIONS = [
  { id: "none", label: "Off" },
  { id: "attract", label: "Attract" },
  { id: "push", label: "Push" },
];

const IMAGE_ONLY_MOTION_NOTE = "Directional motion is image-only in this release.";

function Section({ title, children, muted = false }) {
  return (
    <section style={{ padding: "14px 0", borderTop: muted ? "1px dashed #232323" : "1px solid #1a1a1a" }}>
      <p style={{ marginBottom: 10, fontSize: 11, letterSpacing: ".18em", color: "#777", textTransform: "uppercase" }}>
        {title}
      </p>
      {children}
    </section>
  );
}

function SliderField({ label, min, max, step, value, onChange, formatValue, disabled = false }) {
  return (
    <div style={{ marginBottom: 12, opacity: disabled ? 0.42 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#a6a6a6", letterSpacing: ".06em" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#f5f5f5", fontVariantNumeric: "tabular-nums" }}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        style={{ width: "100%", cursor: disabled ? "not-allowed" : "pointer" }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: "#a6a6a6", letterSpacing: ".06em" }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#070707",
          color: "#f4f4f4",
          border: "1px solid #2a2a2a",
          borderRadius: 0,
          fontSize: 12,
          letterSpacing: ".04em",
        }}
      >
        {options.map((option) => (
          <option key={option.id ?? option.value} value={option.id ?? option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 10px",
        marginBottom: 8,
        background: "#070707",
        border: `1px solid ${value ? "#e0d200" : "#2a2a2a"}`,
        color: value ? "#f4f1c7" : "#a6a6a6",
        fontSize: 11,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <span>{value ? "On" : "Off"}</span>
    </button>
  );
}

function ChoiceGrid({ items, value, onChange, columns = 2, disabled = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 6, opacity: disabled ? 0.42 : 1 }}>
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(item.id);
            }}
            style={{
              padding: "10px 8px",
              border: `1px solid ${active ? "#e0d200" : "#2a2a2a"}`,
              background: active ? "#121200" : "#050505",
              color: active ? "#f6f1af" : "#cfcfcf",
              fontSize: 11,
              letterSpacing: ".06em",
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "left",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function DirectionGrid({ items, value, onChange, disabled = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, opacity: disabled ? 0.42 : 1 }}>
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            title={item.label}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(item.id);
            }}
            style={{
              minHeight: 32,
              border: `1px solid ${active ? "#e0d200" : "#2a2a2a"}`,
              background: active ? "#121200" : "#050505",
              color: active ? "#f6f1af" : "#d0d0d0",
              fontSize: 18,
              lineHeight: 1,
              cursor: disabled ? "not-allowed" : "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            {item.symbol}
          </button>
        );
      })}
    </div>
  );
}

function swatchStyle(color, active) {
  return {
    width: 22,
    height: 22,
    border: `1px solid ${active ? "#e0d200" : "#333"}`,
    background: color,
    cursor: "pointer",
  };
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.floor(seconds % 60));
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function AsciiWorkspace({
  hidden = false,
  workspaceMode = "ascii",
  setWorkspaceMode = () => {},
}) {
  const [panelMode, setPanelMode] = useState("library");
  const [sourceMode, setSourceMode] = useState("image");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [cameraAsset, setCameraAsset] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [comparePos, setComparePos] = useState(0.5);
  const [draggingCompare, setDraggingCompare] = useState(false);
  const [activeFormat, setActiveFormat] = useState("free");
  const [asciiConfig, setAsciiConfig] = useState(DEFAULT_ASCII_CONFIG);
  const [fontReady, setFontReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordSec, setRecordSec] = useState(3);
  const [activePresetId, setActivePresetId] = useState(ASCII_PRESETS[0].id);
  const [lastPresetName, setLastPresetName] = useState(ASCII_PRESETS[0].name);
  const [creations, setCreations] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [statusLine, setStatusLine] = useState("Image, video and live-cam ASCII workspace with local presets, templates and creations.");

  const fileInputRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const compareAreaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const animFrameRef = useRef(null);
  const rendererRef = useRef(createRendererContract());
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const pointerRef = useRef({ active: false, x: 0.5, y: 0.5 });
  const videosRef = useRef([]);
  const cameraStreamRef = useRef(null);

  const selectedImage = images.find((image) => image.id === selectedImageId) || null;
  const selectedVideo = videos.find((video) => video.id === selectedVideoId) || null;

  const currentSourceRecord = useMemo(() => {
    if (sourceMode === "image") return selectedImage;
    if (sourceMode === "video") return selectedVideo;
    if (sourceMode === "camera" && cameraAsset) {
      return {
        id: "camera-source",
        type: "camera",
        name: "Live Cam",
        poster: cameraAsset.poster,
        naturalWidth: cameraAsset.naturalWidth,
        naturalHeight: cameraAsset.naturalHeight,
        video: cameraAsset.video,
      };
    }
    return null;
  }, [sourceMode, selectedImage, selectedVideo, cameraAsset]);

  const currentSource = useMemo(() => {
    if (sourceMode === "image") return selectedImage?.img || null;
    if (sourceMode === "video") return selectedVideo?.video || null;
    if (sourceMode === "camera") return cameraAsset?.video || null;
    return null;
  }, [sourceMode, selectedImage, selectedVideo, cameraAsset]);

  const currentSourceType = currentSourceRecord?.type || sourceMode;
  const motionAvailable = currentSourceType === "image";
  const directionLabel = ASCII_DIRECTION_OPTIONS.find((option) => option.id === asciiConfig.motionDirection)?.symbol || "↖";

  useEffect(() => {
    let cancelled = false;
    ensureAsciiFontsLoaded().then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCreations(JSON.parse(raw));
    } catch (error) {
      console.warn("Could not load ASCII creations", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creations));
    } catch (error) {
      console.warn("Could not persist ASCII creations", error);
    }
  }, [creations]);

  useEffect(() => {
    if (sourceMode !== "video") return;
    videos.forEach((entry) => {
      if (entry.id === selectedVideoId) {
        entry.video.play().catch(() => {});
      } else {
        entry.video.pause();
      }
    });
  }, [videos, sourceMode, selectedVideoId]);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(() => {
    cameraStreamRef.current = cameraAsset?.stream || null;
  }, [cameraAsset]);

  useEffect(() => () => {
    videosRef.current.forEach((entry) => {
      entry.video.pause();
      URL.revokeObjectURL(entry.src);
    });
    stopMediaStream(cameraStreamRef.current);
  }, []);

  const updateConfig = useCallback((patch) => {
    setAsciiConfig((current) => ({ ...current, ...patch }));
  }, []);

  const handleImageLoad = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const loaded = await loadImageFromFile(file);
    const downscaled = await downscaleImage(loaded, 2400);
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const entry = {
      id,
      type: "image",
      img: downscaled.image,
      src: downscaled.src,
      poster: downscaled.src,
      name: file.name,
      naturalWidth: downscaled.naturalWidth,
      naturalHeight: downscaled.naturalHeight,
    };
    setImages((current) => [entry, ...current]);
    setSelectedImageId(id);
    setSourceMode("image");
    setPanelMode("library");
    setStatusLine(`Loaded image: ${file.name}`);
  }, []);

  const handleVideoLoad = useCallback(async (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    const asset = await createVideoAssetFromFile(file);
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const entry = {
      id,
      type: "video",
      ...asset,
      name: file.name,
    };
    setVideos((current) => [entry, ...current]);
    setSelectedVideoId(id);
    setSourceMode("video");
    setPanelMode("library");
    setStatusLine(`Loaded video: ${file.name}`);
  }, []);

  const handleAssetFile = useCallback(async (file) => {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      await handleImageLoad(file);
    } else if (file.type.startsWith("video/")) {
      await handleVideoLoad(file);
    }
  }, [handleImageLoad, handleVideoLoad]);

  const startCamera = useCallback(async () => {
    if (cameraAsset) {
      setSourceMode("camera");
      setCameraError("");
      setStatusLine("Live cam active.");
      return;
    }

    try {
      const asset = await createCameraSource();
      setCameraAsset(asset);
      setSourceMode("camera");
      setCameraError("");
      setPanelMode("library");
      setStatusLine("Live cam connected.");
    } catch (error) {
      setCameraError("Camera access failed or was denied.");
      setStatusLine("Could not start live cam.");
    }
  }, [cameraAsset]);

  const stopCamera = useCallback(() => {
    stopMediaStream(cameraAsset?.stream);
    setCameraAsset(null);
    setCameraError("");
    if (sourceMode === "camera") {
      if (images.length > 0) {
        setSourceMode("image");
        setSelectedImageId((current) => current || images[0].id);
      } else if (videos.length > 0) {
        setSourceMode("video");
        setSelectedVideoId((current) => current || videos[0].id);
      }
    }
    setStatusLine("Live cam disconnected.");
  }, [cameraAsset, sourceMode, images, videos]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );
    files.forEach((file) => {
      handleAssetFile(file);
    });
  }, [handleAssetFile]);

  const renderCurrentFrame = useCallback((time = 0) => {
    if (!currentSource || !fontReady || !outputCanvasRef.current || !originalCanvasRef.current) return;
    renderAsciiFrame({
      source: currentSource,
      outputCanvas: outputCanvasRef.current,
      originalCanvas: originalCanvasRef.current,
      config: asciiConfig,
      formatKey: activeFormat,
      time,
      pointer: pointerRef.current,
      sourceType: currentSourceType,
    });
  }, [currentSource, fontReady, asciiConfig, activeFormat, currentSourceType]);

  useEffect(() => {
    rendererRef.current = createRendererContract({
      setup: ({ source, format }) => {
        if (!source) return null;
        return renderAsciiFrame({
          source,
          outputCanvas: outputCanvasRef.current,
          originalCanvas: originalCanvasRef.current,
          config: asciiConfig,
          formatKey: format || activeFormat,
          time: timeRef.current,
          pointer: pointerRef.current,
          sourceType: currentSourceType,
        });
      },
      render: ({ time = 0 } = {}) => renderCurrentFrame(time),
      exportFrame: () => outputCanvasRef.current,
      getOriginalFrame: () => originalCanvasRef.current,
      isAnimated: () => isAsciiAnimated(asciiConfig, currentSourceType),
    });
  }, [asciiConfig, activeFormat, renderCurrentFrame, currentSourceType]);

  useEffect(() => {
    if (hidden || !currentSource || !fontReady) return undefined;
    rendererRef.current.setup({ source: currentSource, format: activeFormat });

    if (rendererRef.current.isAnimated()) {
      const animate = (timestamp) => {
        if (!lastFrameRef.current) lastFrameRef.current = timestamp;
        timeRef.current += (timestamp - lastFrameRef.current) / 1000;
        lastFrameRef.current = timestamp;
        rendererRef.current.render({ time: timeRef.current });
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        lastFrameRef.current = 0;
      };
    }

    rendererRef.current.render({ time: timeRef.current });
    return undefined;
  }, [hidden, currentSource, fontReady, activeFormat, asciiConfig, sourceMode]);

  useEffect(() => {
    if (!draggingCompare || !compareAreaRef.current) return undefined;
    const handlePointerMove = (event) => {
      const rect = compareAreaRef.current.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      setComparePos(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
    };
    const stop = () => setDraggingCompare(false);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", stop);
    };
  }, [draggingCompare]);

  const handlePreviewPointerMove = useCallback((event) => {
    if (!compareAreaRef.current) return;
    const rect = compareAreaRef.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    pointerRef.current = {
      active: true,
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
    if (!rendererRef.current.isAnimated()) {
      rendererRef.current.render({ time: timeRef.current });
    }
  }, []);

  const handlePreviewPointerLeave = useCallback(() => {
    pointerRef.current = { active: false, x: 0.5, y: 0.5 };
    if (!rendererRef.current.isAnimated()) {
      rendererRef.current.render({ time: timeRef.current });
    }
  }, []);

  const applyPresetById = useCallback((presetId) => {
    const preset = ASCII_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    const nextConfig = applyAsciiPreset(asciiConfig, preset);
    setAsciiConfig(nextConfig);
    setActivePresetId(presetId);
    setLastPresetName(preset.name);
    setStatusLine(
      !motionAvailable && nextConfig.motionMode === "directional"
        ? `Preset loaded: ${preset.name}. ${IMAGE_ONLY_MOTION_NOTE}`
        : `Preset loaded: ${preset.name}`
    );
  }, [asciiConfig, motionAvailable]);

  const applyTemplate = useCallback((template) => {
    setActiveFormat(template.format);
    applyPresetById(template.presetId);
    setPanelMode("templates");
    setStatusLine(`Template loaded: ${template.name}`);
  }, [applyPresetById]);

  const handleRandomize = useCallback(() => {
    const { config, preset } = randomizeAsciiConfig(asciiConfig);
    setAsciiConfig(config);
    setActivePresetId(preset.id);
    setLastPresetName(`${preset.name} Variant`);
    setStatusLine(
      !motionAvailable && config.motionMode === "directional"
        ? `Randomized from ${preset.name}. ${IMAGE_ONLY_MOTION_NOTE}`
        : `Randomized from ${preset.name}`
    );
  }, [asciiConfig, motionAvailable]);

  const saveCreation = useCallback(() => {
    const outputCanvas = rendererRef.current.exportFrame();
    const originalCanvas = rendererRef.current.getOriginalFrame();
    if (!outputCanvas || !currentSourceRecord) return;
    const sourcePreview = originalCanvas ? captureCanvasPoster(originalCanvas) : currentSourceRecord.poster;
    const entry = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: `${lastPresetName} ${new Date().toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
      thumbnail: outputCanvas.toDataURL("image/jpeg", 0.86),
      sourceType: currentSourceRecord.type,
      sourceName: currentSourceRecord.name,
      sourceSrc: currentSourceRecord.type === "image" ? currentSourceRecord.src : null,
      sourceAssetId: currentSourceRecord.id,
      sourcePreview,
      config: asciiConfig,
      format: activeFormat,
      presetId: activePresetId,
      createdAt: new Date().toISOString(),
    };
    setCreations((current) => [entry, ...current].slice(0, 48));
    setPanelMode("creations");
    setStatusLine(`Saved creation: ${entry.name}`);
  }, [currentSourceRecord, asciiConfig, activeFormat, activePresetId, lastPresetName]);

  const loadCreation = useCallback(async (creation) => {
    if (creation.sourceType === "image" && creation.sourceSrc) {
      const existingImage = images.find((entry) => entry.src === creation.sourceSrc);
      if (existingImage) {
        setSelectedImageId(existingImage.id);
        setSourceMode("image");
      } else {
        const created = await createImageAssetFromPreview(creation.sourceSrc, creation.sourceName);
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        setImages((current) => [{ ...created, id, type: "image" }, ...current]);
        setSelectedImageId(id);
        setSourceMode("image");
      }
    } else if (creation.sourceType === "video") {
      const existingVideo = videos.find((entry) => entry.id === creation.sourceAssetId || entry.name === creation.sourceName);
      if (existingVideo) {
        setSelectedVideoId(existingVideo.id);
        setSourceMode("video");
      } else if (creation.sourcePreview) {
        const fallback = await createImageAssetFromPreview(creation.sourcePreview, `${creation.sourceName} still`);
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        setImages((current) => [{ ...fallback, id, type: "image" }, ...current]);
        setSelectedImageId(id);
        setSourceMode("image");
        setStatusLine(`Loaded creation as still fallback. Original video source is no longer available.`);
      }
    } else if (creation.sourceType === "camera" && creation.sourcePreview) {
      const fallback = await createImageAssetFromPreview(creation.sourcePreview, "Live Cam still");
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      setImages((current) => [{ ...fallback, id, type: "image" }, ...current]);
      setSelectedImageId(id);
      setSourceMode("image");
      setStatusLine(`Loaded live-cam creation as still fallback.`);
    }

    setAsciiConfig({ ...DEFAULT_ASCII_CONFIG, ...creation.config });
    setActiveFormat(creation.format || "free");
    setActivePresetId(creation.presetId || ASCII_PRESETS[0].id);
    setLastPresetName(creation.name);
    setPanelMode("creations");
    if (!creation.sourceType || creation.sourceType === "image") {
      setStatusLine(`Loaded creation: ${creation.name}`);
    }
  }, [images, videos]);

  const downloadPNG = useCallback(() => {
    const canvas = rendererRef.current.exportFrame();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ascii_${activePresetId}_${activeFormat}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [activePresetId, activeFormat]);

  const downloadGIF = useCallback(async () => {
    const canvas = rendererRef.current.exportFrame();
    if (!canvas || !currentSource) return;
    setExporting(true);
    setExportProgress(0);

    const longest = Math.max(canvas.width, canvas.height);
    const scale = Math.min(1, 560 / longest);
    const width = Math.round(canvas.width * scale);
    const height = Math.round(canvas.height * scale);
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext("2d");
    const encoder = new GIFEncoder(width, height);
    encoder.setDelay(50);

    const animated = rendererRef.current.isAnimated();
    const frames = animated ? 36 : 24;
    for (let index = 0; index < frames; index += 1) {
      if (sourceMode === "video" || sourceMode === "camera") {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const time = animated ? timeRef.current + index / 18 : timeRef.current;
      rendererRef.current.render({ time });
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(canvas, 0, 0, width, height);
      encoder.addFrame(ctx);
      setExportProgress(Math.round(((index + 1) / frames) * 100));
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const blob = encoder.finish();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `ascii_${activePresetId}.gif`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    setExportProgress(0);
    rendererRef.current.render({ time: timeRef.current });
  }, [activePresetId, currentSource, sourceMode]);

  const recordVideo = useCallback(() => {
    const canvas = rendererRef.current.exportFrame();
    if (!canvas || recording) return;

    const mimeTypes = [
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = mimeTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate));
    if (!mimeType) {
      alert("Video recording is not supported in this browser.");
      return;
    }

    setRecording(true);
    setRecordProgress(0);
    recordChunksRef.current = [];

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordChunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(recordChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `ascii_${activePresetId}_${recordSec}s.${extension}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setRecording(false);
      setRecordProgress(0);
    };

    recorder.start(100);
    const duration = recordSec * 1000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setRecordProgress(Math.min(100, Math.round((elapsed / duration) * 100)));
      if (elapsed >= duration) {
        clearInterval(timer);
        if (recorder.state === "recording") recorder.stop();
      }
    }, 50);
  }, [activePresetId, recording, recordSec]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const libraryCards = useMemo(() => {
    if (sourceMode === "video") {
      return videos.map((entry) => ({
        id: entry.id,
        type: "video",
        name: entry.name,
        thumbnail: entry.poster,
        meta: `${entry.naturalWidth}×${entry.naturalHeight} · ${formatDuration(entry.duration)}`,
        active: entry.id === selectedVideoId,
      }));
    }

    if (sourceMode === "camera") {
      if (!cameraAsset) return [];
      return [{
        id: "camera-source",
        type: "camera",
        name: "Live Cam",
        thumbnail: cameraAsset.poster,
        meta: `${cameraAsset.naturalWidth}×${cameraAsset.naturalHeight}`,
        active: true,
      }];
    }

    return images.map((entry) => ({
      id: entry.id,
      type: "image",
      name: entry.name,
      thumbnail: entry.poster || entry.src,
      meta: `${entry.naturalWidth}×${entry.naturalHeight}`,
      active: entry.id === selectedImageId,
    }));
  }, [sourceMode, images, videos, selectedImageId, selectedVideoId, cameraAsset]);

  return (
    <div
      style={{
        display: hidden ? "none" : "grid",
        gridTemplateRows: "68px 1fr",
        height: "100vh",
        background: "#000000",
        color: "#ededed",
        fontFamily: "'IBM Plex Mono','JetBrains Mono',monospace",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');
        .ascii-root * { box-sizing: border-box; }
        .ascii-root input[type=range] { -webkit-appearance: none; appearance: none; height: 2px; background: #2a2a2a; outline: none; }
        .ascii-root input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 999px; background: #f0e144; border: 1px solid #040404; cursor: pointer; }
        .ascii-root ::-webkit-scrollbar { width: 8px; height: 8px; }
        .ascii-root ::-webkit-scrollbar-thumb { background: #232323; }
        .ascii-root ::-webkit-scrollbar-track { background: #060606; }
      `}</style>

      <div
        className="ascii-root"
        style={{
          gridRow: "1 / span 1",
          borderBottom: "1px solid #161616",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "0 18px",
          background: "#020202",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setWorkspaceMode("filters")}
            style={{
              padding: "10px 12px",
              border: `1px solid ${workspaceMode === "filters" ? "#7a44f6" : "#2b2b2b"}`,
              background: workspaceMode === "filters" ? "#12071f" : "transparent",
              color: workspaceMode === "filters" ? "#cba9ff" : "#a4a4a4",
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Filter Studio
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode("ascii")}
            style={{
              padding: "10px 12px",
              border: "1px solid #d7cb00",
              background: "#121200",
              color: "#f5eb86",
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            ASCII Studio
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div>
            <h1 style={{ fontFamily: "'IBM Plex Sans','Helvetica Neue',sans-serif", fontSize: 34, fontWeight: 600, letterSpacing: "-.04em" }}>
              ASCII
            </h1>
            <p style={{ fontSize: 10, color: "#7c7c7c", letterSpacing: ".18em", textTransform: "uppercase" }}>
              Editor for stills, mp4/webm uploads, live cam and motion-reactive ASCII exports
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setCompareMode((current) => !current)}
              style={{
                padding: "10px 12px",
                border: `1px solid ${compareMode ? "#d7cb00" : "#2b2b2b"}`,
                background: compareMode ? "#121200" : "transparent",
                color: compareMode ? "#f5eb86" : "#a5a5a5",
                fontSize: 11,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {compareMode ? "Hide Compare" : "Compare"}
            </button>
            <button type="button" onClick={saveCreation} style={{ padding: "10px 12px", border: "1px solid #2b2b2b", background: "transparent", color: "#d9d9d9", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
              Save
            </button>
            <button type="button" onClick={handleRandomize} style={{ padding: "10px 12px", border: "1px solid #d7cb00", background: "#121200", color: "#f5eb86", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
              Random
            </button>
            <button type="button" onClick={downloadPNG} style={{ padding: "10px 12px", border: "1px solid #2b2b2b", background: "transparent", color: "#d9d9d9", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
              PNG
            </button>
            <button type="button" onClick={downloadGIF} disabled={exporting || recording} style={{ padding: "10px 12px", border: "1px solid #2b2b2b", background: exporting ? "#141414" : "transparent", color: exporting ? "#f5eb86" : "#d9d9d9", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
              {exporting ? `GIF ${exportProgress}%` : "GIF"}
            </button>
            <button type="button" onClick={recording ? stopRecording : recordVideo} disabled={exporting} style={{ padding: "10px 12px", border: `1px solid ${recording ? "#ff5a5a" : "#2b2b2b"}`, background: recording ? "#210808" : "transparent", color: recording ? "#ff8e8e" : "#d9d9d9", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
              {recording ? `REC ${recordProgress}%` : `Video ${recordSec}s`}
            </button>
            <select
              value={recordSec}
              onChange={(event) => setRecordSec(Number(event.target.value))}
              style={{ padding: "10px", background: "#060606", border: "1px solid #2b2b2b", color: "#d0d0d0", fontSize: 11 }}
            >
              {[2, 3, 5, 8, 10, 15].map((seconds) => (
                <option key={seconds} value={seconds}>{seconds}s</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        className="ascii-root"
        style={{
          gridRow: "2 / span 1",
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr) 390px",
          minHeight: 0,
        }}
      >
        <aside style={{ borderRight: "1px solid #161616", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #161616" }}>
            {[
              ["library", "Library"],
              ["templates", "Templates"],
              ["creations", "Creations"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanelMode(key)}
                style={{
                  flex: 1,
                  padding: "14px 12px",
                  border: "none",
                  borderBottom: `2px solid ${panelMode === key ? "#d7cb00" : "transparent"}`,
                  background: "transparent",
                  color: panelMode === key ? "#f5eb86" : "#8a8a8a",
                  fontSize: 11,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: 16, borderBottom: "1px solid #161616" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
              {SOURCE_MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (option.id === "camera") {
                      startCamera();
                    } else {
                      setSourceMode(option.id);
                    }
                  }}
                  style={{
                    padding: "9px 8px",
                    border: `1px solid ${sourceMode === option.id ? "#d7cb00" : "#2d2d2d"}`,
                    background: sourceMode === option.id ? "#121200" : "#060606",
                    color: sourceMode === option.id ? "#f5eb86" : "#d2d2d2",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(event) => {
                Array.from(event.target.files || []).forEach((file) => handleAssetFile(file));
                event.target.value = "";
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "12px 14px",
                  border: "1px dashed #2d2d2d",
                  background: "#060606",
                  color: "#f0f0f0",
                  fontSize: 12,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Add Media
              </button>
              <button
                type="button"
                onClick={cameraAsset ? stopCamera : startCamera}
                style={{
                  padding: "12px 14px",
                  border: `1px solid ${cameraAsset ? "#ff5a5a" : "#2d2d2d"}`,
                  background: cameraAsset ? "#150606" : "#060606",
                  color: cameraAsset ? "#ff9b9b" : "#d2d2d2",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {cameraAsset ? "Stop Cam" : "Live Cam"}
              </button>
            </div>
            <p style={{ marginTop: 10, fontSize: 11, color: "#797979", lineHeight: 1.6 }}>{statusLine}</p>
            {cameraError && <p style={{ marginTop: 8, fontSize: 11, color: "#ff8c8c" }}>{cameraError}</p>}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
            {panelMode === "library" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {libraryCards.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      if (asset.type === "image") {
                        setSelectedImageId(asset.id);
                        setSourceMode("image");
                      } else if (asset.type === "video") {
                        setSelectedVideoId(asset.id);
                        setSourceMode("video");
                      } else {
                        startCamera();
                      }
                    }}
                    style={{
                      padding: 0,
                      border: `1px solid ${asset.active ? "#d7cb00" : "#222"}`,
                      background: "#040404",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <img src={asset.thumbnail} alt={asset.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", top: 8, left: 8, padding: "4px 6px", background: "#000000cc", color: "#d2d2d2", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase" }}>
                        {asset.type}
                      </span>
                    </div>
                    <div style={{ padding: "8px 8px 10px" }}>
                      <p style={{ fontSize: 11, color: asset.active ? "#f5eb86" : "#d2d2d2", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</p>
                      <p style={{ fontSize: 10, color: "#717171" }}>{asset.meta}</p>
                    </div>
                  </button>
                ))}
                {libraryCards.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", border: "1px dashed #222", padding: 18, color: "#777", fontSize: 12, lineHeight: 1.6 }}>
                    {sourceMode === "camera"
                      ? "Start the live cam to render ASCII from the current feed."
                      : "Drop JPG, PNG, WebP, MP4 or WebM files here or use the upload button."}
                  </div>
                )}
              </div>
            )}

            {panelMode === "templates" && (
              <div style={{ display: "grid", gap: 10 }}>
                {ASCII_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    style={{
                      padding: "14px 14px 12px",
                      border: "1px solid #222",
                      background: "#050505",
                      color: "#efefef",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <strong style={{ fontSize: 13, fontWeight: 500 }}>{template.name}</strong>
                      <span style={{ fontSize: 10, color: "#757575", textTransform: "uppercase", letterSpacing: ".12em" }}>{FORMATS[template.format].label}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#8a8a8a" }}>{template.note}</p>
                  </button>
                ))}
              </div>
            )}

            {panelMode === "creations" && (
              <div style={{ display: "grid", gap: 10 }}>
                {creations.map((creation) => (
                  <button
                    key={creation.id}
                    type="button"
                    onClick={() => loadCreation(creation)}
                    style={{
                      padding: 0,
                      border: "1px solid #222",
                      background: "#040404",
                      color: "#ededed",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <img src={creation.thumbnail} alt={creation.name} style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", top: 8, left: 8, padding: "4px 6px", background: "#000000cc", color: "#d2d2d2", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase" }}>
                        {creation.sourceType || "image"}
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ fontSize: 12, marginBottom: 5 }}>{creation.name}</p>
                      <p style={{ fontSize: 10, color: "#6e6e6e" }}>
                        {new Date(creation.createdAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </button>
                ))}
                {creations.length === 0 && (
                  <div style={{ border: "1px dashed #222", padding: 18, color: "#777", fontSize: 12, lineHeight: 1.6 }}>
                    Saved creations stay local in this browser. Video and live-cam creations fall back to stored stills when the original source is unavailable.
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <main
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{ position: "relative", display: "grid", placeItems: "center", minWidth: 0, minHeight: 0, background: "#010101" }}
        >
          {!currentSource && (
            <div
              onClick={() => {
                if (sourceMode === "camera") {
                  startCamera();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              style={{
                width: "min(740px, 80%)",
                aspectRatio: "16 / 10",
                border: `1px dashed ${isDragging ? "#d7cb00" : "#262626"}`,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                background: isDragging ? "#111100" : "#050505",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <p style={{ marginBottom: 10, fontSize: 16, letterSpacing: ".08em" }}>
                  {sourceMode === "camera" ? "Start live cam to preview ASCII" : "Drop image/video or click to browse"}
                </p>
                <p style={{ fontSize: 12, color: "#808080" }}>Phase 2 now supports MP4/WebM uploads, live cam and pointer-reactive ASCII FX.</p>
              </div>
            </div>
          )}

          {currentSource && (
            <>
              <div
                ref={compareAreaRef}
                onMouseMove={handlePreviewPointerMove}
                onTouchMove={handlePreviewPointerMove}
                onMouseLeave={handlePreviewPointerLeave}
                onTouchEnd={handlePreviewPointerLeave}
                style={{
                  position: "relative",
                  width: "min(88%, 980px)",
                  maxHeight: "84%",
                  aspectRatio: `${outputCanvasRef.current?.width || currentSourceRecord?.naturalWidth || 16} / ${outputCanvasRef.current?.height || currentSourceRecord?.naturalHeight || 9}`,
                  border: "1px solid #1b1b1b",
                  background: "#020202",
                  overflow: "hidden",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                }}
              >
                <canvas ref={outputCanvasRef} style={{ width: "100%", height: "100%", display: "block", background: "#010101" }} />
                <canvas
                  ref={originalCanvasRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: compareMode ? "block" : "none",
                    clipPath: `inset(0 ${(1 - comparePos) * 100}% 0 0)`,
                    borderRight: compareMode ? "1px solid rgba(255,255,255,0.25)" : "none",
                  }}
                />
                {compareMode && (
                  <>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: `${comparePos * 100}%`, width: 1, background: "#d7cb00" }} />
                    <button
                      type="button"
                      onMouseDown={() => setDraggingCompare(true)}
                      onTouchStart={() => setDraggingCompare(true)}
                      style={{
                        position: "absolute",
                        left: `calc(${comparePos * 100}% - 18px)`,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 36,
                        height: 36,
                        borderRadius: "999px",
                        border: "1px solid #d7cb00",
                        background: "#111100",
                        color: "#f5eb86",
                        cursor: "ew-resize",
                      }}
                    >
                      ◐
                    </button>
                  </>
                )}
              </div>

              <div style={{ position: "absolute", bottom: 18, left: 18, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ padding: "6px 10px", border: "1px solid #1b1b1b", background: "#050505", color: "#a6a6a6", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
                  {FORMATS[activeFormat].label}
                </span>
                <span style={{ padding: "6px 10px", border: "1px solid #1b1b1b", background: "#050505", color: "#a6a6a6", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
                  {ASCII_STYLE_OPTIONS.find((item) => item.id === asciiConfig.style)?.label}
                </span>
                <span style={{ padding: "6px 10px", border: "1px solid #1b1b1b", background: "#050505", color: "#a6a6a6", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
                  {currentSourceRecord?.type || sourceMode}
                </span>
                {motionAvailable && asciiConfig.motionMode === "directional" && (
                  <span style={{ padding: "6px 10px", border: "1px solid #272109", background: "#100f03", color: "#f5eb86", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
                    Dir {directionLabel}
                  </span>
                )}
                <span style={{ padding: "6px 10px", border: "1px solid #1b1b1b", background: "#050505", color: "#a6a6a6", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
                  {lastPresetName}
                </span>
              </div>
            </>
          )}

          {isDragging && currentSource && (
            <div style={{ position: "absolute", inset: 0, border: "1px dashed #d7cb00", background: "rgba(215,203,0,0.06)", pointerEvents: "none" }} />
          )}
        </main>

        <aside style={{ borderLeft: "1px solid #161616", minHeight: 0, overflowY: "auto", padding: "18px 16px 32px" }}>
          <Section title="Source">
            <ChoiceGrid items={SOURCE_MODE_OPTIONS} value={sourceMode} onChange={(mode) => {
              if (mode === "camera") {
                startCamera();
              } else {
                setSourceMode(mode);
              }
            }} columns={3} />
            <div style={{ marginTop: 10 }}>
              <SelectField
                label="Aspect"
                value={activeFormat}
                onChange={setActiveFormat}
                options={Object.entries(FORMATS).map(([id, format]) => ({ id, label: format.label }))}
              />
              <SelectField
                label="Quality"
                value={asciiConfig.quality}
                onChange={(value) => updateConfig({ quality: Number(value) })}
                options={ASCII_QUALITY_OPTIONS.map((value) => ({ id: value, label: `${value}` }))}
              />
            </div>
            {currentSourceRecord && (
              <div style={{ padding: "10px 12px", border: "1px solid #222", background: "#050505", color: "#909090", fontSize: 11, lineHeight: 1.6 }}>
                <strong style={{ display: "block", color: "#ececec", marginBottom: 4 }}>{currentSourceRecord.name}</strong>
                {currentSourceRecord.naturalWidth}×{currentSourceRecord.naturalHeight}
                {currentSourceRecord.type === "video" && currentSourceRecord.duration ? ` · ${formatDuration(currentSourceRecord.duration)}` : ""}
              </div>
            )}
          </Section>

          <Section title="Style">
            <ChoiceGrid items={ASCII_STYLE_OPTIONS} value={asciiConfig.style} onChange={(style) => updateConfig({ style })} columns={2} />
          </Section>

          <Section title="Typography">
            <SelectField label="Font" value={asciiConfig.fontFamily} onChange={(fontFamily) => updateConfig({ fontFamily })} options={ASCII_FONT_OPTIONS} />
            <SelectField label="Character Set" value={asciiConfig.charsetId} onChange={(charsetId) => updateConfig({ charsetId })} options={ASCII_CHARSET_OPTIONS} />
            <SliderField label="Cell Size" min={8} max={18} step={0.5} value={asciiConfig.cellSize} onChange={(cellSize) => updateConfig({ cellSize })} formatValue={(value) => `${value.toFixed(1)}px`} />
            <SliderField label="Character Spacing" min={0.85} max={1.3} step={0.01} value={asciiConfig.characterSpacing} onChange={(characterSpacing) => updateConfig({ characterSpacing })} formatValue={(value) => `${value.toFixed(2)}x`} />
          </Section>

          <Section title="Dither">
            <SelectField label="Algorithm" value={asciiConfig.ditherAlgorithm} onChange={(ditherAlgorithm) => updateConfig({ ditherAlgorithm })} options={ASCII_DITHER_OPTIONS} />
            <SliderField label="Brightness" min={-0.35} max={0.35} step={0.01} value={asciiConfig.brightness} onChange={(brightness) => updateConfig({ brightness })} formatValue={(value) => value.toFixed(2)} />
            <SliderField label="Contrast" min={0.65} max={1.85} step={0.01} value={asciiConfig.contrast} onChange={(contrast) => updateConfig({ contrast })} formatValue={(value) => value.toFixed(2)} />
            <SliderField label="Dither Strength" min={0} max={1} step={0.01} value={asciiConfig.ditherStrength} onChange={(ditherStrength) => updateConfig({ ditherStrength })} formatValue={(value) => value.toFixed(2)} />
            <SliderField label="BG Dither" min={0} max={0.5} step={0.01} value={asciiConfig.bgDither} onChange={(bgDither) => updateConfig({ bgDither })} formatValue={(value) => value.toFixed(2)} />
            <ToggleRow label="Invert Dither" value={asciiConfig.invertDither} onChange={(invertDither) => updateConfig({ invertDither })} />
          </Section>

          <Section title="Color">
            <ChoiceGrid items={ASCII_COLOR_MODES} value={asciiConfig.colorMode} onChange={(colorMode) => updateConfig({ colorMode })} columns={2} />
            <ToggleRow label="Invert Color" value={asciiConfig.invertColor} onChange={(invertColor) => updateConfig({ invertColor })} />
            <SliderField label="Opacity" min={0.65} max={1} step={0.01} value={asciiConfig.opacity} onChange={(opacity) => updateConfig({ opacity })} formatValue={(value) => value.toFixed(2)} />
            {asciiConfig.colorMode === "custom" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: "#a6a6a6", letterSpacing: ".06em" }}>Ink</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {["#f4f1dc", "#8fe7ff", "#ff714b", "#f4d35e"].map((color) => (
                      <button key={color} type="button" onClick={() => updateConfig({ inkColor: color })} style={swatchStyle(color, asciiConfig.inkColor === color)} />
                    ))}
                    <input type="color" value={asciiConfig.inkColor} onChange={(event) => updateConfig({ inkColor: event.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: "#a6a6a6", letterSpacing: ".06em" }}>Background</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {["#040404", "#071018", "#120301", "#050806"].map((color) => (
                      <button key={color} type="button" onClick={() => updateConfig({ bgColor: color })} style={swatchStyle(color, asciiConfig.bgColor === color)} />
                    ))}
                    <input type="color" value={asciiConfig.bgColor} onChange={(event) => updateConfig({ bgColor: event.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section title="FX">
            <ChoiceGrid items={ASCII_FX_PRESETS} value={asciiConfig.fxPreset} onChange={(fxPreset) => updateConfig({ fxPreset })} columns={2} />
            <SliderField label="FX Strength" min={0} max={0.8} step={0.01} value={asciiConfig.fxStrength} onChange={(fxStrength) => updateConfig({ fxStrength })} formatValue={(value) => value.toFixed(2)} />
            <SliderField label="Border Glow" min={0} max={0.35} step={0.01} value={asciiConfig.borderGlow} onChange={(borderGlow) => updateConfig({ borderGlow })} formatValue={(value) => value.toFixed(2)} />
            <SliderField label="Vignette" min={0} max={0.45} step={0.01} value={asciiConfig.vignette} onChange={(vignette) => updateConfig({ vignette })} formatValue={(value) => value.toFixed(2)} />
          </Section>

          <Section title="Directional Motion">
            <ChoiceGrid items={ASCII_MOTION_MODE_OPTIONS} value={asciiConfig.motionMode} onChange={(motionMode) => updateConfig({ motionMode })} columns={2} disabled={!motionAvailable} />
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#a6a6a6", letterSpacing: ".06em" }}>Direction</span>
                <span style={{ fontSize: 11, color: "#f5f5f5", fontVariantNumeric: "tabular-nums" }}>{directionLabel}</span>
              </div>
              <DirectionGrid items={ASCII_DIRECTION_OPTIONS} value={asciiConfig.motionDirection} onChange={(motionDirection) => updateConfig({ motionDirection })} disabled={!motionAvailable} />
            </div>
            <div style={{ marginTop: 10 }}>
              <SliderField label="Interval Spacing" min={4} max={18} step={0.1} value={asciiConfig.intervalSpacing} onChange={(intervalSpacing) => updateConfig({ intervalSpacing })} formatValue={(value) => value.toFixed(1)} disabled={!motionAvailable} />
              <SliderField label="Interval Speed" min={0.15} max={1.8} step={0.01} value={asciiConfig.intervalSpeed} onChange={(intervalSpeed) => updateConfig({ intervalSpeed })} formatValue={(value) => value.toFixed(2)} disabled={!motionAvailable} />
              <SliderField label="Interval Width" min={1} max={6} step={0.1} value={asciiConfig.intervalWidth} onChange={(intervalWidth) => updateConfig({ intervalWidth })} formatValue={(value) => value.toFixed(1)} disabled={!motionAvailable} />
            </div>
            {!motionAvailable && (
              <p style={{ marginTop: 10, fontSize: 11, lineHeight: 1.6, color: "#9f8c5f" }}>
                {IMAGE_ONLY_MOTION_NOTE}
              </p>
            )}
          </Section>

          <Section title="Mouse Interaction">
            <ChoiceGrid items={INTERACTION_OPTIONS} value={asciiConfig.interactionMode} onChange={(interactionMode) => updateConfig({ interactionMode })} columns={3} />
            <div style={{ marginTop: 10 }}>
              <SliderField label="Hover Strength" min={8} max={48} step={1} value={asciiConfig.hoverStrength} onChange={(hoverStrength) => updateConfig({ hoverStrength })} formatValue={(value) => `${value.toFixed(0)}`} />
              <SliderField label="Area Size" min={80} max={320} step={1} value={asciiConfig.areaSize} onChange={(areaSize) => updateConfig({ areaSize })} formatValue={(value) => `${value.toFixed(0)}px`} />
              <SliderField label="Spread" min={0.7} max={1.9} step={0.01} value={asciiConfig.spread} onChange={(spread) => updateConfig({ spread })} formatValue={(value) => `${value.toFixed(2)}x`} />
            </div>
          </Section>

          <Section title="Presets">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {ASCII_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPresetById(preset.id)}
                  style={{
                    padding: "12px 10px",
                    border: `1px solid ${activePresetId === preset.id ? "#d7cb00" : "#2a2a2a"}`,
                    background: activePresetId === preset.id ? "#121200" : "#050505",
                    color: activePresetId === preset.id ? "#f5eb86" : "#e8e8e8",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 11,
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Export" muted>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" onClick={downloadPNG} style={{ padding: "12px", border: "1px solid #2a2a2a", background: "#050505", color: "#ededed", cursor: "pointer" }}>PNG</button>
              <button type="button" onClick={downloadGIF} disabled={exporting || recording} style={{ padding: "12px", border: "1px solid #2a2a2a", background: "#050505", color: "#ededed", cursor: "pointer" }}>{exporting ? `${exportProgress}%` : "GIF"}</button>
              <button type="button" onClick={recording ? stopRecording : recordVideo} style={{ padding: "12px", border: "1px solid #2a2a2a", background: "#050505", color: "#ededed", cursor: "pointer" }}>{recording ? "Stop" : "Video"}</button>
              <button type="button" onClick={saveCreation} style={{ padding: "12px", border: "1px solid #d7cb00", background: "#121200", color: "#f5eb86", cursor: "pointer" }}>Save</button>
            </div>
            <p style={{ marginTop: 12, fontSize: 11, color: "#777", lineHeight: 1.6 }}>
              Preview, compare, PNG freeze, GIF and MP4/WebM recording now render through the same source-aware ASCII path. Directional motion currently applies to still images only.
            </p>
          </Section>
        </aside>
      </div>
    </div>
  );
}
