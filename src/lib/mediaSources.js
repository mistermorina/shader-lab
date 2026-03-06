import {
  createSizedCanvas,
  createThumbnailFromSource,
  getSourceDimensions,
  loadImageFromSrc,
} from "./imageUtils.js";

function once(target, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, handleLoad);
      target.removeEventListener("error", handleError);
    };
    target.addEventListener(eventName, handleLoad, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}

function hasDecodedVideoFrame(video) {
  const { width, height } = getSourceDimensions(video);
  return video.readyState >= 2 && width > 0 && height > 0;
}

async function waitForDecodedVideoFrame(video) {
  if (hasDecodedVideoFrame(video)) return;
  await once(video, "loadeddata");
}

export async function createVideoAssetFromFile(file) {
  const src = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.load();

  await waitForDecodedVideoFrame(video);

  try {
    const targetTime = Math.min(0.12, Math.max(0, (video.duration || 0) * 0.1));
    if (targetTime > 0.01) {
      video.currentTime = targetTime;
      await once(video, "seeked", 2000);
    }
  } catch {
    // ignore seek issues and use the first decoded frame
  }

  const poster = createThumbnailFromSource(video, 420, 260);
  const { width, height } = getSourceDimensions(video);

  return {
    src,
    video,
    poster,
    naturalWidth: width,
    naturalHeight: height,
    duration: video.duration || 0,
  };
}

export async function createImageAssetFromPreview(src, name = "creation-preview") {
  const image = await loadImageFromSrc(src);
  const { width, height } = getSourceDimensions(image);
  return {
    src,
    img: image,
    poster: src,
    naturalWidth: width,
    naturalHeight: height,
    name,
  };
}

export async function createCameraSource() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  const playPromise = video.play().catch(() => {});
  await waitForDecodedVideoFrame(video);
  await playPromise;

  const { width, height } = getSourceDimensions(video);
  return {
    stream,
    video,
    naturalWidth: width,
    naturalHeight: height,
    poster: createThumbnailFromSource(video, 420, 260),
  };
}

export function stopMediaStream(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export function captureCanvasPoster(canvas) {
  const posterCanvas = createSizedCanvas(canvas.width, canvas.height);
  const ctx = posterCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  return posterCanvas.toDataURL("image/jpeg", 0.84);
}
