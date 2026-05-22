<template>
  <aside class="training-panel glass-panel">
    <div class="panel-heading">
      <span>Entrenamiento</span>
      <strong>{{ totalSamples }} muestras</strong>
    </div>

    <v-text-field
      :model-value="word"
      label="Palabra"
      density="compact"
      variant="outlined"
      hide-details
      :disabled="capturing"
      @update:model-value="$emit('update:word', String($event))"
    />

    <div class="slider-row">
      <span>Muestras</span>
      <strong>{{ target }}</strong>
    </div>
    <v-slider
      :model-value="target"
      :min="10"
      :max="80"
      :step="5"
      color="primary"
      hide-details
      :disabled="capturing"
      @update:model-value="$emit('update:target', Number($event))"
    />

    <v-btn
      :color="capturing ? 'error' : 'primary'"
      variant="flat"
      block
      :disabled="!capturing && (!word.trim() || disabled)"
      @click="toggleCapture"
    >
      <span class="icon-label">
        <Square v-if="capturing" :size="18" />
        <Play v-else :size="18" />
        {{ capturing ? `Detener ${captured}/${target}` : 'Grabar rafaga' }}
      </span>
    </v-btn>

    <div v-if="disabledReason && !capturing" class="disabled-reason">
      {{ disabledReason }}
    </div>

    <v-progress-linear
      :model-value="target > 0 ? (captured / target) * 100 : 0"
      color="primary"
      height="8"
      rounded
    />

    <div class="label-list">
      <div v-if="labels.length === 0" class="empty-state">
        Aun no hay palabras entrenadas.
      </div>
      <div v-for="label in labels" :key="label.id" class="label-item">
        <div>
          <strong>{{ label.text }}</strong>
          <span>{{ label.sampleCount }} muestras</span>
        </div>
        <v-btn
          icon
          variant="text"
          color="error"
          size="small"
          :disabled="capturing"
          @click="$emit('delete-label', label.id)"
        >
          <Trash2 :size="16" />
        </v-btn>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Play, Square, Trash2 } from 'lucide-vue-next';
import { computed } from 'vue';
import type { SignLabel } from '@/types/model';

const props = defineProps<{
  word: string;
  target: number;
  captured: number;
  capturing: boolean;
  disabled: boolean;
  disabledReason: string;
  labels: SignLabel[];
}>();

const emit = defineEmits<{
  'update:word': [value: string];
  'update:target': [value: number];
  start: [];
  stop: [];
  'delete-label': [labelId: string];
}>();

const totalSamples = computed(() => props.labels.reduce((total, label) => total + label.sampleCount, 0));

function toggleCapture(): void {
  if (props.capturing) {
    emit('stop');
    return;
  }

  emit('start');
}
</script>

<style scoped>
.training-panel {
  position: fixed;
  top: 18px;
  bottom: 18px;
  left: 18px;
  z-index: 16;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(360px, calc(100vw - 36px));
  padding: 16px;
  overflow: hidden;
  border-radius: 8px;
}

.panel-heading,
.slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-heading span {
  color: #f6fbff;
  font-size: 1rem;
  font-weight: 750;
}

.panel-heading strong,
.slider-row strong {
  color: #2fd17c;
  font-size: 0.85rem;
}

.slider-row span {
  color: rgb(246 251 255 / 0.72);
  font-size: 0.85rem;
}

.label-list {
  min-height: 0;
  padding-top: 2px;
  overflow: auto;
}

.label-item {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 9px 8px 9px 12px;
  margin-bottom: 8px;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 8px;
  background: rgb(255 255 255 / 0.055);
}

.label-item div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.label-item strong {
  overflow: hidden;
  color: #f6fbff;
  font-size: 0.96rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.label-item span,
.empty-state,
.disabled-reason {
  color: rgb(246 251 255 / 0.58);
  font-size: 0.82rem;
}

.disabled-reason {
  min-height: 18px;
  margin-top: -6px;
}

@media (width <= 760px) {
  .training-panel {
    top: auto;
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
    max-height: 48vh;
  }
}
</style>
