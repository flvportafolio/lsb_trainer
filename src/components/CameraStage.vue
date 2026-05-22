<template>
  <section class="camera-stage">
    <video ref="videoEl" class="camera-video" autoplay playsinline muted />
    <HandOverlayCanvas :hands="hands" :faces="faces" :source-width="videoSize.width" :source-height="videoSize.height" :debug-visibility="debugVisibility" />

    <div v-if="loading" class="camera-state glass-panel">
      <v-progress-circular indeterminate color="primary" size="28" />
      <span>Iniciando camara</span>
    </div>

    <div v-if="cameraError" class="camera-error glass-panel">
      <strong>No se pudo iniciar la camara</strong>
      <span>{{ cameraError }}</span>
    </div>

    <div v-else-if="trackerError" class="tracker-error glass-panel">
      <strong>Camara activa, detector sin iniciar</strong>
      <span>{{ trackerError }}</span>
    </div>

    <slot :hands="hands" :faces="faces" :ready="ready" :tracker-ready="trackerReady" />
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import HandOverlayCanvas from '@/components/HandOverlayCanvas.vue';
import { attachStream, requestCameraStream, stopStream } from '@/services/camera';
import { FaceTracker } from '@/services/faceTracker';
import type { FacePose } from '@/types/model';
import { describeError } from '@/services/errors';
import { HandTracker } from '@/services/handTracker';
import type { HandPose } from '@/types/model';

const emit = defineEmits<{
  hands: [hands: HandPose[]];
  faces: [faces: FacePose[]];
  ready: [ready: boolean];
  'tracker-ready': [ready: boolean];
  error: [message: string];
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const hands = ref<HandPose[]>([]);
const faces = ref<FacePose[]>([]);
const loading = ref(true);
const ready = ref(false);
const trackerReady = ref(false);
const cameraError = ref('');
const trackerError = ref('');
const videoSize = ref({ width: 0, height: 0 });

let stream: MediaStream | null = null;
let tracker: HandTracker | null = null;
let faceTracker: FaceTracker | null = null;
let frameHandle = 0;
let disposed = false;
// Enable visibility debug via URL param `?debug=1`
const debugVisibility = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

onMounted(() => {
  void start();
});

onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frameHandle);
  tracker?.close();
  faceTracker?.close();
  stopStream(stream);
});

async function start(): Promise<void> {
  try {
    const video = videoEl.value;

    if (!video) {
      return;
    }

    loading.value = true;
    stream = await requestCameraStream();
    await attachStream(video, stream);
    ready.value = true;
    emit('ready', true);
    loop();

    try {
      tracker = await HandTracker.create();
      trackerError.value = '';
      trackerReady.value = true;
      emit('tracker-ready', true);
    } catch (error) {
      const message = `${describeError(error)} Verifica tu conexion para descargar el modelo de manos de MediaPipe.`;
      trackerError.value = message;
      trackerReady.value = false;
      emit('tracker-ready', false);
      emit('error', message);
    }

    // Initialize face tracker (optional). If it fails, continue without face features.
    try {
      faceTracker = await FaceTracker.create();
    } catch (error) {
      faceTracker = null;
      /* eslint-disable no-console */
      console.info('FaceTracker not initialized:', error);
    }
  } catch (error) {
    const message = describeError(error);
    cameraError.value = message;
    emit('error', message);
  } finally {
    loading.value = false;
  }
}

function loop(): void {
  if (disposed) {
    return;
  }

  const video = videoEl.value;

  if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    videoSize.value = {
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }

  if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (tracker) {
      try {
        hands.value = tracker.detect(video);
      } catch (error) {
        const message = describeError(error);
        trackerError.value = message;
        trackerReady.value = false;
        emit('tracker-ready', false);
        emit('error', message);
        tracker.close();
        tracker = null;
        hands.value = [];
      }
    }

    if (faceTracker) {
      try {
        faces.value = faceTracker.detect(video);
      } catch (error) {
        faces.value = [];
      }
    }

    emit('hands', hands.value);
    emit('faces', faces.value);
  }

  frameHandle = requestAnimationFrame(loop);
}
</script>

<style scoped>
.camera-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #05080d;
}

.camera-video {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-stage::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  content: "";
  background:
    linear-gradient(90deg, rgb(0 0 0 / 0.54), transparent 35%),
    linear-gradient(0deg, rgb(0 0 0 / 0.3), transparent 32%);
}

.camera-state,
.camera-error,
.tracker-error {
  position: fixed;
  z-index: 30;
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: min(460px, calc(100vw - 32px));
  padding: 14px 16px;
  border-radius: 8px;
}

.camera-state {
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
}

.camera-error,
.tracker-error {
  top: 18px;
  right: 18px;
  flex-direction: column;
  align-items: flex-start;
}

.camera-error strong,
.tracker-error strong {
  color: #ffb4bf;
}

.camera-error span,
.tracker-error span,
.camera-state span {
  color: rgb(246 251 255 / 0.86);
  font-size: 0.93rem;
}

@media (width <= 760px) {
  .camera-error,
  .tracker-error {
    top: 70px;
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>
