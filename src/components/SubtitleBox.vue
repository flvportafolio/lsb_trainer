<template>
  <div v-if="result.accepted" class="subtitle-box" :class="{ accepted: result.accepted }">
    <span>{{ displayText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecognitionResult } from '@/types/model';

const props = defineProps<{
  result: RecognitionResult;
}>();

const displayText = computed(() => (props.result.accepted ? props.result.label : '...'));
</script>

<style scoped>
.subtitle-box {
  position: fixed;
  bottom: 26px;
  left: 50%;
  z-index: 18;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: min(420px, calc(100vw - 32px));
  min-height: 48px;
  padding: 10px 20px;
  color: #f7fbff;
  text-align: center;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 8px;
  background: rgb(4 7 12 / 0.64);
  box-shadow: 0 18px 44px rgb(0 0 0 / 0.42);
  backdrop-filter: blur(16px);
  transform: translateX(-50%);
}

.subtitle-box {
  transition: opacity 160ms ease, transform 160ms ease;
}

.subtitle-box span {
  overflow: hidden;
  font-size: clamp(1.2rem, 2.4vw, 2rem);
  font-weight: 750;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-transform: lowercase;
  white-space: nowrap;
}

.subtitle-box.accepted {
  border-color: rgb(47 209 124 / 0.42);
  background: rgb(4 17 13 / 0.68);
}

@media (width <= 760px) {
  .subtitle-box {
    bottom: 18px;
    min-height: 44px;
    padding: 8px 14px;
  }
}
</style>
