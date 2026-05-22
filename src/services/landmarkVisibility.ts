import type { HandPose, Landmark } from '@/types/model';

const THUMB_LANDMARKS = [1, 2, 3, 4] as const;
const NON_THUMB_LANDMARKS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

export function applyLandmarkVisibility(hand: HandPose): HandPose {
  const landmarks = hand.landmarks.map((point) => ({
    ...point,
    visible: point.visible ?? true,
  }));

  const thumbHidden = isThumbTuckedIntoPalmSilhouette(landmarks);

  if (thumbHidden) {
    for (const index of THUMB_LANDMARKS) {
      const landmark = landmarks[index];

      if (landmark) {
        landmark.visible = false;
      }
    }
  }

  return {
    ...hand,
    landmarks,
    thumbHidden,
  };
}

export function isLandmarkVisible(point: Landmark | undefined): boolean {
  return !!point && point.visible !== false;
}

function isThumbTuckedIntoPalmSilhouette(landmarks: Landmark[]): boolean {
  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];

  if (!thumbCmc || !thumbMcp || !thumbIp || !thumbTip || !indexMcp || !pinkyMcp) {
    return false;
  }

  const palmScale = getPalmScale(landmarks);
  const knuckleWidth = Math.max(distance2d(indexMcp, pinkyMcp), 0.0001);
  const thumbSide = normalize2d({
    x: indexMcp.x - pinkyMcp.x,
    y: indexMcp.y - pinkyMcp.y,
    z: 0,
  });
  const thumbChainLength =
    distance2d(thumbCmc, thumbMcp) +
    distance2d(thumbMcp, thumbIp) +
    distance2d(thumbIp, thumbTip);
  const thumbSpread = Math.max(
    distance2d(thumbCmc, thumbTip),
    distance2d(thumbMcp, thumbTip),
    distance2d(thumbIp, thumbTip),
  );
  const thumbLeavesIndexSide = Math.max(
    project2d(thumbCmc, indexMcp, thumbSide),
    project2d(thumbMcp, indexMcp, thumbSide),
    project2d(thumbIp, indexMcp, thumbSide),
    project2d(thumbTip, indexMcp, thumbSide),
  );
  const silhouette = convexHull(NON_THUMB_LANDMARKS.map((index) => landmarks[index]).filter(Boolean) as Landmark[]);
  // Count thumb points that are truly *inside* the palm silhouette by also
  // requiring a minimum distance from the silhouette edges. This avoids
  // treating points that lie near the border (visible) as tucked.
  const deepInsideThreshold = palmScale * 0.035;
  const thumbPointsInsidePalm = [thumbMcp, thumbIp, thumbTip].filter((point) => {
    if (!isPointInPolygon(point, silhouette)) {
      return false;
    }

    const dist = pointToPolygonMinDistance(point, silhouette);
    return dist > deepInsideThreshold;
  }).length;
  // Balance sensitivity: require enough of the thumb to be inside the
  // palm silhouette and use a moderate protrusion threshold so that
  // typical "four-fingers" poses (thumb tucked) are detected while
  // avoiding excessive false positives.
  const thumbDoesNotProtrude = thumbLeavesIndexSide < knuckleWidth * 0.08;
  const thumbLooksCollapsed = thumbChainLength < palmScale * 0.52 || thumbSpread < palmScale * 0.3;

  return (thumbDoesNotProtrude && thumbPointsInsidePalm >= 2) || (thumbDoesNotProtrude && thumbLooksCollapsed);
}

function getPalmScale(landmarks: Landmark[]): number {
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];

  if (!wrist || !indexMcp || !middleMcp || !pinkyMcp) {
    return 0.0001;
  }

  return Math.max(
    distance2d(wrist, middleMcp),
    distance2d(indexMcp, pinkyMcp),
    0.0001,
  );
}

function distance2d(left: Landmark | undefined, right: Landmark | undefined): number {
  if (!left || !right) {
    return 0;
  }

  return Math.hypot(left.x - right.x, left.y - right.y);
}

function normalize2d(vector: Landmark): Landmark {
  const length = Math.hypot(vector.x, vector.y) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: 0,
  };
}

function project2d(point: Landmark, origin: Landmark, axis: Landmark): number {
  return (point.x - origin.x) * axis.x + (point.y - origin.y) * axis.y;
}

function convexHull(points: Landmark[]): Landmark[] {
  const sorted = [...points].sort((left, right) => (left.x === right.x ? left.y - right.y : left.x - right.x));

  if (sorted.length <= 3) {
    return sorted;
  }

  const lower: Landmark[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: Landmark[] = [];
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function cross(origin: Landmark | undefined, left: Landmark | undefined, right: Landmark): number {
  if (!origin || !left) {
    return 0;
  }

  return (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
}

function isPointInPolygon(point: Landmark, polygon: Landmark[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];

    if (!currentPoint || !previousPoint) {
      continue;
    }

    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y || 0.0001) +
          currentPoint.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointToPolygonMinDistance(point: Landmark, polygon: Landmark[]): number {
  if (polygon.length < 2) {
    return Infinity;
  }

  let min = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    if (!a || !b) {
      continue;
    }

    const d = pointToSegmentDistance(point, a, b);
    if (d < min) {
      min = d;
    }
  }

  return min;
}

function pointToSegmentDistance(p: Landmark, a: Landmark, b: Landmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}
