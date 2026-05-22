import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { applyLandmarkVisibility } from '@/services/landmarkVisibility';
import type { HandPose, Handedness, Landmark } from '@/types/model';

const WASM_BASE_URL = '/mediapipe/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  private constructor(private readonly landmarker: HandLandmarker) {}

  static async create(): Promise<HandTracker> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const options = {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU' as const,
      },
      runningMode: 'VIDEO' as const,
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    };
    const landmarker = await HandLandmarker.createFromOptions(fileset, options).catch(() =>
      HandLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
      }),
    );

    return new HandTracker(landmarker);
  }

  detect(video: HTMLVideoElement): HandPose[] {
    const result = this.landmarker.detectForVideo(video, performance.now());
    return mapResult(result);
  }

  close(): void {
    this.landmarker.close();
  }
}

function mapResult(result: HandLandmarkerResult): HandPose[] {
  return result.landmarks.map((landmarks, index) => {
    const category = result.handednesses[index]?.[0];

    return applyLandmarkVisibility({
      landmarks: landmarks.map(mapLandmark),
      handedness: mapHandedness(category?.categoryName),
      score: category?.score ?? 0,
    });
  });
}

function mapLandmark(point: NormalizedLandmark): Landmark {
  return {
    x: point.x,
    y: point.y,
    z: point.z,
    visible: true,
  };
}

function mapHandedness(value: string | undefined): Handedness {
  if (value === 'Left' || value === 'Right') {
    return value;
  }

  return 'Unknown';
}
