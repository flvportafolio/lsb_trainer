import type { HandPose, FacePose } from '@/types/model';
import { isLandmarkVisible } from '@/services/landmarkVisibility';

export const MAX_HANDS = 2;
export const LANDMARKS_PER_HAND = 21;
export const VALUES_PER_LANDMARK = 3;
export const FEATURES_PER_HAND = 1 + LANDMARKS_PER_HAND * VALUES_PER_LANDMARK;
// Face features: presence + centerX + centerY + size
export const MAX_FACES = 1;
export const VALUES_PER_FACE = 3;
export const FEATURES_PER_FACE = 1 + VALUES_PER_FACE;

export const FEATURE_VECTOR_SIZE = MAX_HANDS * FEATURES_PER_HAND + MAX_FACES * FEATURES_PER_FACE;

export function extractFeatures(hands: HandPose[], faces: FacePose[] = []): number[] {
  const normalizedHands = [...hands]
    .filter((hand) => hand.landmarks.length === LANDMARKS_PER_HAND)
    .sort((a, b) => {
      const aWrist = a.landmarks[0]?.x ?? 0;
      const bWrist = b.landmarks[0]?.x ?? 0;
      return aWrist - bWrist;
    })
    .slice(0, MAX_HANDS);

  const vector: number[] = [];

  for (let index = 0; index < MAX_HANDS; index += 1) {
    const hand = normalizedHands[index];

    if (!hand) {
      vector.push(...new Array(FEATURES_PER_HAND).fill(0));
      continue;
    }

    vector.push(1);
    vector.push(...normalizeHand(hand));
  }

  // Face features (append for fixed number of faces)
  const normalizedFaces = [...(faces || [])].slice(0, MAX_FACES);

  for (let i = 0; i < MAX_FACES; i += 1) {
    const face = normalizedFaces[i];

    if (!face || !face.landmarks || face.landmarks.length === 0) {
      // push zeros for missing face
      vector.push(...new Array(FEATURES_PER_FACE).fill(0));
      continue;
    }

    // compute centroid and size
    const visible = face.landmarks.filter(isLandmarkVisible);
    if (!visible.length) {
      vector.push(...new Array(FEATURES_PER_FACE).fill(0));
      continue;
    }

    const cx = visible.reduce((s, p) => s + p.x, 0) / visible.length;
    const cy = visible.reduce((s, p) => s + p.y, 0) / visible.length;
    const maxDist = visible.reduce((m, p) => Math.max(m, Math.hypot(p.x - cx, p.y - cy)), 0.0001);

    vector.push(1);
    vector.push(cx, cy, maxDist);
  }

  return vector;
}

function normalizeHand(hand: HandPose): number[] {
  const origin = hand.landmarks[0];

  if (!origin) {
    return new Array(LANDMARKS_PER_HAND * VALUES_PER_LANDMARK).fill(0);
  }

  const visibleLandmarks = hand.landmarks.filter(isLandmarkVisible);
  const maxDistance = visibleLandmarks.reduce((largest, point) => {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const dz = point.z - origin.z;
    const distance = Math.hypot(dx, dy, dz);
    return Math.max(largest, distance);
  }, 0.0001);

  return hand.landmarks.flatMap((point) => {
    if (!isLandmarkVisible(point)) {
      return [0, 0, 0];
    }

    return [
      (point.x - origin.x) / maxDistance,
      (point.y - origin.y) / maxDistance,
      (point.z - origin.z) / maxDistance,
    ];
  });
}

export function hasUsableHands(hands: HandPose[]): boolean {
  return hands.some((hand) => hand.landmarks.length === LANDMARKS_PER_HAND);
}
