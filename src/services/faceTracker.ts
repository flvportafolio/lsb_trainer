import {
  FilesetResolver,
  FaceLandmarker,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { FacePose, Landmark } from '@/types/model';

const WASM_BASE_URL = '/mediapipe/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/short/1/face_landmarker.task';

export class FaceTracker {
  private constructor(private readonly landmarker: FaceLandmarker) {}

  static async create(): Promise<FaceTracker> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const options = {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU' as const,
      },
      runningMode: 'VIDEO' as const,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    };

    const landmarker = await FaceLandmarker.createFromOptions(fileset, options).catch(() =>
      FaceLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
      }),
    );

    return new FaceTracker(landmarker);
  }

  detect(video: HTMLVideoElement): FacePose[] {
    const result = this.landmarker.detectForVideo(video, performance.now());
    return mapResult(result);
  }

  close(): void {
    this.landmarker.close();
  }
}

function mapResult(result: FaceLandmarkerResult): FacePose[] {
  // The face landmarker returns normalized landmarks per face; map to our FacePose type
  return (result.faceLandmarks ?? []).map((landmarks) => ({
    landmarks: landmarks.map(mapLandmark),
    score: 1,
  }));
}

function mapLandmark(point: NormalizedLandmark): Landmark {
  return {
    x: point.x,
    y: point.y,
    z: point.z ?? 0,
    visible: true,
  };
}
