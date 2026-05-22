import { FEATURE_VECTOR_SIZE, LANDMARKS_PER_HAND, MAX_HANDS, VALUES_PER_LANDMARK, MAX_FACES, VALUES_PER_FACE } from '@/services/features';
import { createId } from '@/services/ids';
import type { HandPose, LsbModelJson, SignLabel, TrainingSample } from '@/types/model';

export function createEmptyModel(): LsbModelJson {
  const now = new Date().toISOString();

  return {
    app: 'lsb-trainer',
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    featureConfig: {
      type: 'mediapipe-hands-face-normalized-v1',
      maxHands: MAX_HANDS,
      landmarksPerHand: LANDMARKS_PER_HAND,
      valuesPerLandmark: VALUES_PER_LANDMARK,
      vectorSize: FEATURE_VECTOR_SIZE,
      maxFaces: MAX_FACES,
      valuesPerFace: VALUES_PER_FACE,
    },
    labels: [],
    samples: [],
  };
}

export function cloneModel(model: LsbModelJson): LsbModelJson {
  return structuredClone(model);
}

export function touchModel(model: LsbModelJson): LsbModelJson {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
  };
}

export function upsertLabel(model: LsbModelJson, text: string): SignLabel {
  const normalizedText = normalizeLabel(text);
  const existing = model.labels.find((label) => normalizeLabel(label.text) === normalizedText);

  if (existing) {
    return existing;
  }

  const label: SignLabel = {
    id: createId('label'),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    sampleCount: 0,
  };

  model.labels.push(label);
  return label;
}

export function createSample(label: SignLabel, hands: HandPose[], features: number[], faces?: unknown): TrainingSample {
  return {
    id: createId('sample'),
    labelId: label.id,
    label: label.text,
    hands,
    faces: (faces as any) ?? [],
    features,
    handCount: hands.length,
    createdAt: new Date().toISOString(),
  };
}

export function removeLabel(model: LsbModelJson, labelId: string): LsbModelJson {
  return touchModel({
    ...model,
    labels: model.labels.filter((label) => label.id !== labelId),
    samples: model.samples.filter((sample) => sample.labelId !== labelId),
  });
}

export function recalculateSampleCounts(model: LsbModelJson): LsbModelJson {
  const counts = new Map<string, number>();

  for (const sample of model.samples) {
    counts.set(sample.labelId, (counts.get(sample.labelId) ?? 0) + 1);
  }

  return {
    ...model,
    labels: model.labels.map((label) => ({
      ...label,
      sampleCount: counts.get(label.id) ?? 0,
    })),
  };
}

export function normalizeImportedModel(value: unknown): LsbModelJson {
  if (!isModelLike(value)) {
    throw new Error('El archivo no tiene el formato de modelo LSB esperado.');
  }

  const model = recalculateSampleCounts({
    app: 'lsb-trainer',
    schemaVersion: 1,
    createdAt: value.createdAt,
    updatedAt: new Date().toISOString(),
    featureConfig: value.featureConfig,
    labels: value.labels,
    samples: value.samples,
  });

  if (model.featureConfig.vectorSize !== FEATURE_VECTOR_SIZE) {
    throw new Error('El modelo fue creado con una configuracion de landmarks incompatible.');
  }

  return model;
}

function isModelLike(value: unknown): value is LsbModelJson {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LsbModelJson>;

  return (
    candidate.app === 'lsb-trainer' &&
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.labels) &&
    Array.isArray(candidate.samples) &&
    !!candidate.featureConfig
  );
}

function normalizeLabel(text: string): string {
  return text.trim().toLocaleLowerCase('es-BO');
}
