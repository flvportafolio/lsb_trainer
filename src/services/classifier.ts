import type { ClassifierOptions, RecognitionResult, SignLabel, TrainingSample } from '@/types/model';

const DEFAULT_RESULT: RecognitionResult = {
  labelId: null,
  label: '...',
  confidence: 0,
  accepted: false,
  distance: null,
};

export function classifySign(
  features: number[],
  samples: TrainingSample[],
  labels: SignLabel[],
  options: ClassifierOptions,
): RecognitionResult {
  if (!features.length || samples.length === 0 || labels.length === 0) {
    return DEFAULT_RESULT;
  }

  const nearest = samples
    .map((sample) => ({
      sample,
      distance: normalizedDistance(features, sample.features),
    }))
    .filter((item) => Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(1, options.k));

  if (nearest.length === 0) {
    return DEFAULT_RESULT;
  }

  const grouped = new Map<string, { label: string; total: number; count: number }>();

  for (const item of nearest) {
    const current = grouped.get(item.sample.labelId) ?? {
      label: item.sample.label,
      total: 0,
      count: 0,
    };

    current.total += item.distance;
    current.count += 1;
    grouped.set(item.sample.labelId, current);
  }

  const best = [...grouped.entries()]
    .map(([labelId, value]) => ({
      labelId,
      label: value.label,
      distance: value.total / value.count,
      votes: value.count,
    }))
    .sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }

      return a.distance - b.distance;
    })[0];

  if (!best) {
    return DEFAULT_RESULT;
  }

  const confidence = distanceToConfidence(best.distance);
  const knownLabel = labels.find((label) => label.id === best.labelId);

  return {
    labelId: best.labelId,
    label: knownLabel?.text ?? best.label,
    confidence,
    accepted: confidence >= options.threshold,
    distance: best.distance,
  };
}

function normalizedDistance(left: number[], right: number[]): number {
  const size = Math.min(left.length, right.length);

  if (size === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;

  for (let index = 0; index < size; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    sum += delta * delta;
  }

  return Math.sqrt(sum / size);
}

function distanceToConfidence(distance: number): number {
  const confidence = 1 - distance / 0.65;
  return Math.max(0, Math.min(1, confidence));
}
