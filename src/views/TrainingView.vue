<template>
  <main class="app-view">
    <CameraStage
      @hands="handleHands"
      @faces="handleFaces"
      @ready="cameraReady = $event"
      @tracker-ready="trackerReady = $event"
      @error="showMessage"
    />

    <TrainingControls
      v-model:word="word"
      v-model:target="targetSamples"
      :captured="capturedThisRun"
      :capturing="capturing"
      :disabled="!canCapture"
      :disabled-reason="disabledReason"
      :labels="model.labels"
      @start="startCapture"
      @stop="stopCapture"
      @delete-label="deleteLabel"
    />

    <div class="floating-actions">
      <ModelManager
        :model="model"
        compact
        allow-clear
        @imported="handleImportedModel"
        @clear="clearModel"
        @error="showMessage"
      />

      <v-tooltip text="Practicar" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="flat" color="primary" @click="goToPractice">
            <Camera :size="19" />
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <div class="capture-status glass-panel" :class="{ active: capturing }">
      <span>{{ captureStatus }}</span>
      <strong v-if="capturing">{{ capturedThisRun }}/{{ targetSamples }}</strong>
    </div>

    <v-snackbar v-model="snackbar.visible" location="top" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { Camera } from 'lucide-vue-next';
import CameraStage from '@/components/CameraStage.vue';
import ModelManager from '@/components/ModelManager.vue';
import TrainingControls from '@/components/TrainingControls.vue';
import { extractFeatures, hasUsableHands } from '@/services/features';
import {
  createEmptyModel,
  createSample,
  recalculateSampleCounts,
  removeLabel,
  touchModel,
  upsertLabel,
} from '@/services/model';
import { clearStoredModel, loadModel, saveModel } from '@/services/modelStore';
import type { HandPose, LsbModelJson, SignLabel, FacePose } from '@/types/model';

const router = useRouter();
const model = ref<LsbModelJson>(createEmptyModel());
const word = ref('');
const targetSamples = ref(40);
const capturedThisRun = ref(0);
const capturing = ref(false);
const cameraReady = ref(false);
const trackerReady = ref(false);
const detectedHands = ref(0);
const lastFaces = ref<FacePose[]>([]);
const snackbar = reactive({
  visible: false,
  message: '',
});

let activeLabel: SignLabel | null = null;
let lastCapturedAt = 0;

const captureStatus = computed(() => {
  if (capturing.value) {
    if (!trackerReady.value) {
      return 'Detector de manos no listo';
    }

    if (detectedHands.value === 0) {
      return 'Esperando mano detectada';
    }

    return `Capturando ${detectedHands.value} mano${detectedHands.value === 1 ? '' : 's'}`;
  }

  if (!cameraReady.value) {
    return 'Esperando camara';
  }

  if (!trackerReady.value) {
    return 'Esperando detector de manos';
  }

  if (model.value.samples.length === 0) {
    return 'Modelo local vacio';
  }

  return `${model.value.labels.length} palabras entrenadas`;
});

const canCapture = computed(() => cameraReady.value && trackerReady.value);

const disabledReason = computed(() => {
  if (!cameraReady.value) {
    return 'Esperando camara';
  }

  if (!trackerReady.value) {
    return 'Esperando detector de manos';
  }

  return '';
});

onMounted(async () => {
  model.value = recalculateSampleCounts(await loadModel());
});

onBeforeRouteLeave(async () => {
  await persistCurrentModel();
});

function handleHands(hands: HandPose[]): void {
  detectedHands.value = hands.length;

  if (!capturing.value || !activeLabel || !hasUsableHands(hands)) {
    return;
  }

  const now = performance.now();

  if (now - lastCapturedAt < 120) {
    return;
  }

  lastCapturedAt = now;
  const features = extractFeatures(hands, lastFaces.value);
  model.value.samples.push(createSample(activeLabel, cloneHands(hands), features, cloneFaces(lastFaces.value)));
  model.value = recalculateSampleCounts(touchModel(model.value));
  capturedThisRun.value += 1;

  if (capturedThisRun.value >= targetSamples.value) {
    void stopCapture();
  }
}

function handleFaces(faces: FacePose[]): void {
  lastFaces.value = faces;
}

function startCapture(): void {
  const text = word.value.trim();

  if (!text) {
    showMessage('Escribe una palabra para entrenar.');
    return;
  }

  if (!canCapture.value) {
    showMessage(disabledReason.value || 'Todavia no se puede grabar.');
    return;
  }

  activeLabel = upsertLabel(model.value, text);
  model.value = recalculateSampleCounts(touchModel(model.value));
  capturedThisRun.value = 0;
  detectedHands.value = 0;
  lastCapturedAt = 0;
  capturing.value = true;
}

async function stopCapture(): Promise<void> {
  if (!capturing.value) {
    return;
  }

  capturing.value = false;
  activeLabel = null;
  await persistCurrentModel();
  showMessage('Modelo guardado localmente.');
}

async function goToPractice(): Promise<void> {
  capturing.value = false;
  activeLabel = null;
  model.value = recalculateSampleCounts(touchModel(model.value));
  await persistCurrentModel();
  await router.push('/practicar');
}

async function deleteLabel(labelId: string): Promise<void> {
  model.value = removeLabel(model.value, labelId);
  await saveModel(model.value);
}

async function handleImportedModel(nextModel: LsbModelJson): Promise<void> {
  model.value = recalculateSampleCounts(nextModel);
  await saveModel(model.value);
  showMessage('Modelo importado y guardado.');
}

async function clearModel(): Promise<void> {
  model.value = await clearStoredModel();
  capturedThisRun.value = 0;
  detectedHands.value = 0;
  capturing.value = false;
  activeLabel = null;
  showMessage('Modelo local vaciado.');
}

function showMessage(message: string): void {
  snackbar.message = message;
  snackbar.visible = true;
}

async function persistCurrentModel(): Promise<void> {
  model.value = recalculateSampleCounts(touchModel(model.value));
  await saveModel(model.value);
}

function cloneHands(hands: HandPose[]): HandPose[] {
  return hands.map((hand) => ({
    handedness: hand.handedness,
    score: hand.score,
    landmarks: hand.landmarks.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
      visible: point.visible,
    })),
  }));
}

function cloneFaces(faces: FacePose[]): FacePose[] {
  return faces.map((face) => ({
    landmarks: (face.landmarks || []).map((p) => ({ x: p.x, y: p.y, z: p.z, visible: p.visible })),
    bbox: face.bbox ? { ...face.bbox } : undefined,
    score: face.score,
  }));
}
</script>

<style scoped>
.capture-status {
  position: fixed;
  right: 18px;
  bottom: 26px;
  z-index: 18;
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 194px;
  padding: 11px 13px;
  color: rgb(246 251 255 / 0.78);
  border-radius: 8px;
}

.capture-status.active {
  color: #f7fff9;
  border-color: rgb(47 209 124 / 0.46);
  background: rgb(4 17 13 / 0.72);
}

.capture-status span {
  font-size: 0.86rem;
}

.capture-status strong {
  color: #2fd17c;
  font-size: 0.86rem;
}

@media (width <= 760px) {
  .capture-status {
    display: none;
  }
}
</style>
