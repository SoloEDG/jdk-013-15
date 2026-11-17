import { clamp, wrap } from "../../../shared/format.ts";
import type { Camera } from "../../../shared/types.ts";

/**
 * 两个构图之间的角度距离（度）。
 * yaw 取越过 ±180° 接缝的最短路径，fov 折算为等效视角参与衡量，
 * 用于估算运镜时长与判断两个构图是否实质相同。
 */
export function cameraDistance(a: Camera, b: Camera): number {
  const dyaw = wrap(b.yaw - a.yaw);
  const dpitch = b.pitch - a.pitch;
  const dfov = (b.fov - a.fov) * 0.5;
  return Math.hypot(dyaw, dpitch, dfov);
}

export function easeInOut(t: number): number {
  const k = clamp(t, 0, 1);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

/**
 * 球面插值：yaw 沿接缝的最短方向走（例如 170° → -170° 只跨 20°），
 * pitch/fov 线性过渡。全程只涉及角度，与窗口比例无关。
 */
export function interpolateCamera(from: Camera, to: Camera, t: number): Camera {
  const k = easeInOut(t);
  return {
    yaw: wrap(from.yaw + wrap(to.yaw - from.yaw) * k),
    pitch: from.pitch + (to.pitch - from.pitch) * k,
    fov: from.fov + (to.fov - from.fov) * k,
  };
}

/** 运镜时长（毫秒）：距离越长越慢，但限制在自然的区间内。 */
export function transitionDuration(from: Camera, to: Camera): number {
  return clamp(0.45 + cameraDistance(from, to) / 160, 0.5, 1.8) * 1000;
}
