<template>
  <div class="model-manager" :class="{ compact }">
    <input
      ref="fileInput"
      class="file-input"
      type="file"
      accept="application/json,.json"
      @change="handleFile"
    />

    <v-tooltip text="Importar modelo JSON" location="bottom">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          :disabled="busy"
          icon
          variant="flat"
          color="surface"
          @click="fileInput?.click()"
        >
          <Upload :size="19" />
        </v-btn>
      </template>
    </v-tooltip>

    <v-tooltip text="Exportar modelo JSON" location="bottom">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          :disabled="busy || model.labels.length === 0"
          icon
          variant="flat"
          color="surface"
          @click="downloadModel(model)"
        >
          <Download :size="19" />
        </v-btn>
      </template>
    </v-tooltip>

    <v-tooltip v-if="allowClear" text="Vaciar modelo local" location="bottom">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          :disabled="busy"
          icon
          variant="flat"
          color="surface"
          @click="$emit('clear')"
        >
          <Trash2 :size="18" />
        </v-btn>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { Download, Trash2, Upload } from 'lucide-vue-next';
import { ref } from 'vue';
import { downloadModel, importModelFile } from '@/services/modelStore';
import type { LsbModelJson } from '@/types/model';

withDefaults(
  defineProps<{
    model: LsbModelJson;
    busy?: boolean;
    compact?: boolean;
    allowClear?: boolean;
  }>(),
  {
    busy: false,
    compact: false,
    allowClear: false,
  },
);

const emit = defineEmits<{
  imported: [model: LsbModelJson];
  clear: [];
  error: [message: string];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

async function handleFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  try {
    const model = await importModelFile(file);
    emit('imported', model);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo importar el modelo.';
    emit('error', message);
  } finally {
    input.value = '';
  }
}
</script>

<style scoped>
.model-manager {
  display: flex;
  gap: 10px;
  align-items: center;
}

.model-manager.compact {
  gap: 8px;
}

.file-input {
  display: none;
}
</style>
