<template>
  <aside class="practice-panel glass-panel">
    <div class="panel-header">
      <span>Practica LSB</span>
      <strong>{{ completedCount }}/{{ labels.length }}</strong>
    </div>

    <div v-if="labels.length === 0" class="empty-state">
      Carga o entrena un modelo para ver palabras aqui.
    </div>

    <v-list v-else class="word-list" density="compact" bg-color="transparent">
      <v-list-item
        v-for="label in labels"
        :key="label.id"
        class="word-item"
        :class="{ done: completedIds.has(label.id) }"
      >
        <template #prepend>
          <span class="status-dot">
            <Check v-if="completedIds.has(label.id)" :size="18" />
            <Circle v-else :size="16" />
          </span>
        </template>
        <v-list-item-title>{{ label.text }}</v-list-item-title>
        <template #append>
          <span class="sample-count">{{ label.sampleCount }}</span>
        </template>
      </v-list-item>
    </v-list>
  </aside>
</template>

<script setup lang="ts">
import { Check, Circle } from 'lucide-vue-next';
import { computed } from 'vue';
import type { SignLabel } from '@/types/model';

const props = defineProps<{
  labels: SignLabel[];
  completedIds: Set<string>;
}>();

const completedCount = computed(() => props.labels.filter((label) => props.completedIds.has(label.id)).length);
</script>

<style scoped>
.practice-panel {
  position: fixed;
  top: 18px;
  bottom: 18px;
  left: 18px;
  z-index: 16;
  width: min(320px, calc(100vw - 36px));
  padding: 14px;
  overflow: hidden;
  border-radius: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 12px;
  color: rgb(246 251 255 / 0.94);
}

.panel-header span {
  font-size: 0.98rem;
  font-weight: 700;
}

.panel-header strong {
  color: #2fd17c;
  font-size: 0.88rem;
}

.word-list {
  max-height: calc(100vh - 112px);
  overflow: auto;
}

.word-item {
  min-height: 46px;
  margin-bottom: 8px;
  color: rgb(246 251 255 / 0.82);
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 8px;
  background: rgb(255 255 255 / 0.055);
}

.word-item.done {
  color: #f7fff9;
  border-color: rgb(47 209 124 / 0.42);
  background: rgb(47 209 124 / 0.18);
}

.status-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #8ba4bb;
}

.word-item.done .status-dot {
  color: #2fd17c;
}

.sample-count {
  min-width: 28px;
  color: rgb(246 251 255 / 0.52);
  font-size: 0.78rem;
  text-align: right;
}

.empty-state {
  padding: 18px 10px;
  color: rgb(246 251 255 / 0.66);
  font-size: 0.94rem;
  line-height: 1.45;
}

@media (width <= 760px) {
  .practice-panel {
    top: auto;
    right: 12px;
    bottom: 86px;
    left: 12px;
    width: auto;
    max-height: 34vh;
  }

  .word-list {
    max-height: calc(34vh - 58px);
  }
}
</style>
