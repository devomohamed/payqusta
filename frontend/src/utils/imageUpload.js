const createImageBitmapFallback = (file) => (
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    image.src = objectUrl;
  })
);

const canvasToBlob = (canvas, type, quality) => (
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to optimize image before upload'));
        return;
      }

      resolve(blob);
    }, type, quality);
  })
);

export const optimizeImageFileForUpload = async (file, options = {}) => {
  if (!(file instanceof File) || !String(file.type || '').startsWith('image/')) {
    return file;
  }

  const {
    maxDimension = 1280,
    maxTargetBytes = 1.1 * 1024 * 1024,
    targetType = 'image/webp',
    qualitySteps = [0.82, 0.74, 0.66, 0.58, 0.5],
  } = options;

  let sourceImage;

  try {
    sourceImage = typeof createImageBitmap === 'function'
      ? await createImageBitmap(file)
      : await createImageBitmapFallback(file);
  } catch {
    return file;
  }

  const width = sourceImage.width || sourceImage.naturalWidth;
  const height = sourceImage.height || sourceImage.naturalHeight;

  if (!width || !height) {
    if ('close' in sourceImage && typeof sourceImage.close === 'function') {
      sourceImage.close();
    }
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = nextWidth;
  canvas.height = nextHeight;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    if ('close' in sourceImage && typeof sourceImage.close === 'function') {
      sourceImage.close();
    }
    return file;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, nextWidth, nextHeight);
  context.drawImage(sourceImage, 0, 0, nextWidth, nextHeight);

  if ('close' in sourceImage && typeof sourceImage.close === 'function') {
    sourceImage.close();
  }

  let optimizedBlob = null;

  for (const quality of qualitySteps) {
    optimizedBlob = await canvasToBlob(canvas, targetType, quality);

    if (optimizedBlob.size <= maxTargetBytes) {
      break;
    }
  }

  if (!optimizedBlob || optimizedBlob.size >= file.size) {
    return file;
  }

  const originalBaseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  return new File([optimizedBlob], `${originalBaseName}.webp`, {
    type: targetType,
    lastModified: Date.now(),
  });
};

export const optimizeImageFilesForUpload = (files, options = {}) => Promise.all(
  (Array.isArray(files) ? files : []).map((file) => optimizeImageFileForUpload(file, options))
);

export const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
