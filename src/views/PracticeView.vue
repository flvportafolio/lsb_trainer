<template>
  <main class="app-view">
    <CameraStage @hands="handleHands" @faces="handleFaces" @error="showMessage" />

    <PracticeWordPanel :labels="model.labels" :completed-ids="completedIds" />

    <div class="floating-actions">
      <ModelManager
        :model="model"
        compact
        @imported="handleImportedModel"
        @error="showMessage"
      />

      <v-tooltip text="Reiniciar marcas" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="flat" color="surface" @click="resetPractice">
            <RefreshCcw :size="18" />
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Entrenar modelo" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="flat" color="primary" @click="router.push('/entrenar')">
            <GraduationCap :size="19" />
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <div class="confidence-meter glass-panel">
      <span>{{ confidenceLabel }}</span>
      <v-progress-linear
        :model-value="recognition.confidence * 100"
        :color="recognition.accepted ? 'primary' : 'warning'"
        height="6"
        rounded
      />
    </div>

    <SubtitleBox v-if="recognition.accepted" :result="recognition" />

    <v-snackbar v-model="snackbar.visible" location="top" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { GraduationCap, RefreshCcw } from 'lucide-vue-next';
import CameraStage from '@/components/CameraStage.vue';
import ModelManager from '@/components/ModelManager.vue';
import PracticeWordPanel from '@/components/PracticeWordPanel.vue';
import SubtitleBox from '@/components/SubtitleBox.vue';
import { classifySign } from '@/services/classifier';
import { extractFeatures, hasUsableHands } from '@/services/features';
import { createEmptyModel, recalculateSampleCounts } from '@/services/model';
import { loadModel, saveModel } from '@/services/modelStore';
import type { HandPose, FacePose, LsbModelJson, RecognitionResult } from '@/types/model';

const router = useRouter();
const model = ref<LsbModelJson>(createEmptyModel());
const completedIds = ref(new Set<string>());
const recognition = ref<RecognitionResult>({
  labelId: null,
  label: '...',
  confidence: 0,
  accepted: false,
  distance: null,
});
const snackbar = reactive({
  visible: false,
  message: '',
});

let lastClassificationAt = 0;
const lastFaces = ref<FacePose[]>([]);

const confidenceLabel = computed(() => {
  if (!recognition.value.accepted) {
    return 'Confianza baja';
  }

  return `${recognition.value.label} ${Math.round(recognition.value.confidence * 100)}%`;
});

onMounted(async () => {
  model.value = recalculateSampleCounts(await loadModel());
});

function handleHands(hands: HandPose[]): void {
  const now = performance.now();

  if (now - lastClassificationAt < 140) {
    return;
  }

  lastClassificationAt = now;

  if (!hasUsableHands(hands)) {
    recognition.value = emptyRecognition();
    return;
  }

  const result = classifySign(extractFeatures(hands, lastFaces.value), model.value.samples, model.value.labels, {
    k: 5,
    threshold: 0.72,
  });

  recognition.value = result.accepted ? result : emptyRecognition(result.confidence, result.distance);

  if (result.accepted && result.labelId) {
    const next = new Set(completedIds.value);
    next.add(result.labelId);
    completedIds.value = next;
  }
}

function handleFaces(faces: FacePose[]): void {
  lastFaces.value = faces;
}

async function handleImportedModel(nextModel: LsbModelJson): Promise<void> {
  model.value = recalculateSampleCounts(nextModel);
  await saveModel(model.value);
  resetPractice();
  showMessage('Modelo cargado para practicar.');
}

function resetPractice(): void {
  completedIds.value = new Set<string>();
}

function emptyRecognition(confidence = 0, distance: number | null = null): RecognitionResult {
  return {
    labelId: null,
    label: '...',
    confidence,
    accepted: false,
    distance,
  };
}

function showMessage(message: string): void {
  snackbar.message = message;
  snackbar.visible = true;
}
</script>

<style scoped>
.confidence-meter {
  position: fixed;
  right: 18px;
  bottom: 26px;
  z-index: 18;
  display: grid;
  gap: 8px;
  width: 190px;
  padding: 10px 12px;
  border-radius: 8px;
}

.confidence-meter span {
  overflow: hidden;
  color: rgb(246 251 255 / 0.76);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (width <= 980px) {
  .confidence-meter {
    display: none;
  }
}
</style>
