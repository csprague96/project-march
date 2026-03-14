function clampChannel(value) {
  return Math.max(0, Math.min(255, value))
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to create an image blob.'))
          return
        }

        resolve(blob)
      },
      'image/jpeg',
      0.85,
    )
  })
}

async function createBitmap(blob) {
  if (window.createImageBitmap) {
    return createImageBitmap(blob)
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to load the captured image.'))
    }
    image.src = objectUrl
  })
}

export async function preprocessImage(
  blob,
  { maxDimension = 1568, threshold = 128, contrast = 1.3 } = {},
) {
  const bitmap = await createBitmap(blob)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  canvas.width = width
  canvas.height = height
  context.drawImage(bitmap, 0, 0, width, height)

  // Free the ImageBitmap from GPU memory immediately after drawing.
  // Skipping this on memory-constrained devices (Android) can cause silent
  // failures on subsequent captures.
  if (typeof bitmap.close === 'function') {
    bitmap.close()
  }

  const imageData = context.getImageData(0, 0, width, height)
  const pixels = imageData.data

  for (let index = 0; index < pixels.length; index += 4) {
    const grayscale = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
    const contrasted = clampChannel((grayscale - 128) * contrast + 128)
    const adjusted = contrasted > threshold ? 255 : 0

    pixels[index] = adjusted
    pixels[index + 1] = adjusted
    pixels[index + 2] = adjusted
  }

  context.putImageData(imageData, 0, 0)

  const processedBlob = await canvasToBlob(canvas)
  const processedDataUrl = canvas.toDataURL('image/jpeg', 0.85)

  return {
    blob: processedBlob,
    dataUrl: processedDataUrl,
    base64: processedDataUrl.split(',')[1],
    width,
    height,
  }
}
