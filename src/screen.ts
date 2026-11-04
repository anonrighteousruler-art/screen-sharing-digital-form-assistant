// Screen capture, sent to the model as one JPEG frame per second.

const FRAME_MS = 1000;
const MAX_WIDTH = 1280;

export async function startScreen(
  onFrame: (base64Jpeg: string) => void,
  onEnded: () => void,
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d')!;
  const timer = setInterval(() => {
    if (!video.videoWidth) return;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    g.drawImage(video, 0, 0, canvas.width, canvas.height);
    onFrame(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
  }, FRAME_MS);

  stream.getVideoTracks()[0].onended = onEnded;
  return () => {
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
  };
}
