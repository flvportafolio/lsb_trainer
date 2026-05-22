<template>
  <canvas ref="canvasEl" class="hand-overlay" aria-hidden="true" />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { isLandmarkVisible } from '@/services/landmarkVisibility';
import type { HandPose, FacePose } from '@/types/model';

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const;

const props = withDefaults(
  defineProps<{
    hands: HandPose[];
    faces?: FacePose[];
    mirror?: boolean;
    sourceWidth?: number;
    sourceHeight?: number;
    debugVisibility?: boolean;
  }>(),
  {
    mirror: true,
    sourceWidth: 0,
    sourceHeight: 0,
    debugVisibility: false,
  },
);

const canvasEl = ref<HTMLCanvasElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

watch(
  () => [props.hands, props.faces],
  () => drawHands(),
  { deep: true },
);

onMounted(async () => {
  await nextTick();
  const canvas = canvasEl.value;

  if (!canvas) {
    return;
  }

  resizeObserver = new ResizeObserver(() => drawHands());
  resizeObserver.observe(canvas);
  drawHands();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

function drawHands(): void {
  const canvas = canvasEl.value;

  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  context.clearRect(0, 0, width, height);
  context.save();
  context.scale(ratio, ratio);

  for (const hand of props.hands) {
    const projection = createProjection(rect.width, rect.height);
    drawConnections(context, hand, projection);
    drawPoints(context, hand, projection);
  }
  // draw detected faces (if any)
  if (props.faces && props.faces.length) {
    const projection = createProjection(rect.width, rect.height);
    for (const face of props.faces) {
      drawFace(context, face, projection);
    }
  }

  context.restore();
}

function drawConnections(
  context: CanvasRenderingContext2D,
  hand: HandPose,
  projection: Projection,
): void {
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const [from, to] of HAND_CONNECTIONS) {
    const start = hand.landmarks[from];
    const end = hand.landmarks[to];

    const startVisible = !!start && isLandmarkVisible(start);
    const endVisible = !!end && isLandmarkVisible(end);

    if (!start || !end || (!startVisible && !endVisible && !props.debugVisibility)) {
      continue;
    }

    const startPoint = projectPoint(start.x, start.y, projection);
    const endPoint = projectPoint(end.x, end.y, projection);

    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);

    if (startVisible && endVisible) {
      context.strokeStyle = 'rgb(47 209 124 / 0.86)';
      context.shadowColor = 'rgb(47 209 124 / 0.4)';
      context.shadowBlur = 10;
      context.setLineDash([]);
    } else {
      context.strokeStyle = 'rgb(255 99 71 / 0.72)';
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.setLineDash([6, 4]);
    }

    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
  }

  context.setLineDash([]);
  context.shadowBlur = 0;
}

function drawPoints(
  context: CanvasRenderingContext2D,
  hand: HandPose,
  projection: Projection,
): void {
  for (const [index, point] of hand.landmarks.entries()) {
    const visible = isLandmarkVisible(point);

    if (!visible && !props.debugVisibility) {
      continue;
    }

    const radius = index === 0 ? 6 : 4.4;
    const projected = projectPoint(point.x, point.y, projection);

    context.beginPath();

    if (visible) {
      context.fillStyle = index === 0 ? '#ffd166' : '#f6fbff';
      context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = 'rgb(5 8 13 / 0.55)';
      context.stroke();
    } else {
      context.lineWidth = 1.2;
      context.setLineDash([2, 2]);
      context.strokeStyle = 'rgb(255 99 71 / 0.9)';
      context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
  }

  // If debug is enabled and the service marked the thumb as hidden, show a small label
  if (props.debugVisibility && hand.thumbHidden) {
    const wrist = hand.landmarks[0];
    if (wrist) {
      const p = projectPoint(wrist.x, wrist.y, projection);
      context.font = '12px system-ui, Arial';
      context.fillStyle = 'rgb(255 99 71 / 0.95)';
      context.fillText('thumb hidden', p.x + 6, p.y - 8);
    }
  }
}

interface Projection {
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
}

function createProjection(width: number, height: number): Projection {
  const sourceWidth = props.sourceWidth || width;
  const sourceHeight = props.sourceHeight || height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const displayWidth = sourceWidth * scale;
  const displayHeight = sourceHeight * scale;

  return {
    offsetX: (width - displayWidth) / 2,
    offsetY: (height - displayHeight) / 2,
    displayWidth,
    displayHeight,
  };
}

function projectPoint(x: number, y: number, projection: Projection): { x: number; y: number } {
  const projectedX = projection.offsetX + (props.mirror ? 1 - x : x) * projection.displayWidth;
  const projectedY = projection.offsetY + y * projection.displayHeight;

  return {
    x: projectedX,
    y: projectedY,
  };
}

function drawFace(context: CanvasRenderingContext2D, face: FacePose, projection: Projection): void {
  if (!face || !face.landmarks || face.landmarks.length === 0) {
    return;
  }

  const visible = face.landmarks.filter(isLandmarkVisible);
  if (!visible.length) {
    return;
  }

  const cx = visible.reduce((s, p) => s + p.x, 0) / visible.length;
  const cy = visible.reduce((s, p) => s + p.y, 0) / visible.length;
  const maxDist = visible.reduce((m, p) => Math.max(m, Math.hypot(p.x - cx, p.y - cy)), 0.0001);

  const projected = projectPoint(cx, cy, projection);
  const size = maxDist * Math.max(projection.displayWidth, projection.displayHeight);

  // draw center
  context.beginPath();
  context.fillStyle = 'rgba(66, 135, 245, 0.9)';
  context.arc(projected.x, projected.y, 6, 0, Math.PI * 2);
  context.fill();

  // draw approximate circle representing face size
  context.beginPath();
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(66, 135, 245, 0.6)';
  context.setLineDash([4, 4]);
  context.arc(projected.x, projected.y, size, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  // optional bbox if provided
  if (face.bbox) {
    const x1 = projection.offsetX + (props.mirror ? 1 - (face.bbox.x + face.bbox.width) : face.bbox.x) * projection.displayWidth;
    const y1 = projection.offsetY + face.bbox.y * projection.displayHeight;
    const w = face.bbox.width * projection.displayWidth;
    const h = face.bbox.height * projection.displayHeight;
    context.beginPath();
    context.lineWidth = 1.5;
    context.strokeStyle = 'rgba(66, 135, 245, 0.6)';
    context.strokeRect(x1, y1, w, h);
  }
}
</script>

<style scoped>
.hand-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
