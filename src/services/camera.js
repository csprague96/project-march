let activeStream = null

export async function startRearCamera(videoElement) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not supported on this device.')
  }

  stopCamera()

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  })

  activeStream = stream
  videoElement.srcObject = stream
  videoElement.setAttribute('playsinline', 'true')
  await videoElement.play()

  return {
    stream,
    torchSupported: isTorchSupported(stream),
  }
}

export function stopCamera() {
  if (!activeStream) {
    return
  }

  activeStream.getTracks().forEach((track) => track.stop())
  activeStream = null
}

export function getActiveStream() {
  return activeStream
}

export function isTorchSupported(stream = activeStream) {
  const track = stream?.getVideoTracks?.()?.[0]
  const capabilities = track?.getCapabilities?.()
  return Boolean(capabilities?.torch)
}

export async function setTorch(enabled, stream = activeStream) {
  const track = stream?.getVideoTracks?.()?.[0]

  if (!track || !isTorchSupported(stream)) {
    return false
  }

  await track.applyConstraints({
    advanced: [{ torch: enabled }],
  })

  return true
}

export async function captureFrame(videoElement) {
  if (!videoElement?.videoWidth || !videoElement?.videoHeight) {
    throw new Error('Camera is not ready to capture yet.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight

  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (capturedBlob) => {
        if (!capturedBlob) {
          reject(new Error('Unable to capture frame from the camera.'))
          return
        }

        resolve(capturedBlob)
      },
      'image/jpeg',
      0.85,
    )
  })

  return {
    blob,
    dataUrl: canvas.toDataURL('image/jpeg', 0.85),
    width: canvas.width,
    height: canvas.height,
  }
}
