export async function requestCameraStream(): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new Error('La camara requiere localhost o HTTPS. Abre la app desde http://127.0.0.1:5173/.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Este navegador no permite usar la camara.');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
}

export async function attachStream(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  video.srcObject = stream;
  await video.play();
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
