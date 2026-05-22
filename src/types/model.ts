export type Handedness = 'Left' | 'Right' | 'Unknown';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visible?: boolean;
}

export interface HandPose {
  landmarks: Landmark[];
  handedness: Handedness;
  score: number;
  thumbHidden?: boolean;
}

export interface FacePose {
  landmarks: Landmark[];
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score: number;
}

export interface SignLabel {
  id: string;
  text: string;
  createdAt: string;
  sampleCount: number;
}

export interface TrainingSample {
  id: string;
  labelId: string;
  label: string;
  hands: HandPose[];
  faces?: FacePose[];
  features: number[];
  handCount: number;
  createdAt: string;
}

export interface LsbModelJson {
  app: 'lsb-trainer';
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  featureConfig: {
    type: 'mediapipe-hands-face-normalized-v1' | 'mediapipe-hands-normalized-v1';
    maxHands: number;
    landmarksPerHand: number;
    valuesPerLandmark: number;
    vectorSize: number;
    // optional face feature info
    maxFaces?: number;
    valuesPerFace?: number;
  };
  labels: SignLabel[];
  samples: TrainingSample[];
}

export interface RecognitionResult {
  labelId: string | null;
  label: string;
  confidence: number;
  accepted: boolean;
  distance: number | null;
}

export interface ClassifierOptions {
  k: number;
  threshold: number;
}
