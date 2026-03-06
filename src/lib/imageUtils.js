export function getSourceDimensions(source) {
  return {
    width: source?.naturalWidth || source?.videoWidth || source?.width || 0,
    height: source?.naturalHeight || source?.videoHeight || source?.height || 0,
  };
}

export function drawImageCover(ctx, img, width, height) {
  const { width: iw, height: ih } = getSourceDimensions(img);
  const scale = Math.max(width / iw, height / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, (width - sw) / 2, (height - sh) / 2, sw, sh);
}

export function createSizedCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function downscaleImage(img, maxDim = 2400) {
  if (img.width <= maxDim && img.height <= maxDim) {
    return {
      image: img,
      src: img.src,
      naturalWidth: img.naturalWidth || img.width,
      naturalHeight: img.naturalHeight || img.height,
    };
  }

  const scale = maxDim / Math.max(img.width, img.height);
  const canvas = createSizedCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const src = canvas.toDataURL("image/png");
  const finalImage = await loadImageFromSrc(src);

  return {
    image: finalImage,
    src,
    naturalWidth: finalImage.naturalWidth || finalImage.width,
    naturalHeight: finalImage.naturalHeight || finalImage.height,
  };
}

export function createThumbnailFromSource(source, width = 420, height = 260) {
  const canvas = createSizedCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);
  drawImageCover(ctx, source, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
}
