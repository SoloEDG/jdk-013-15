import { reactive, ref } from "vue";
import type { Camera } from "../../../shared/types";
import { clamp, wrap } from "../../../shared/format.ts";
import { interpolateCamera, transitionDuration } from "../lib/motion.ts";

/**
 * 镜头状态机：
 * - idle：已落定的真实构图，可以收藏为锚点、会被记忆；
 * - auto：自动运镜途中，逐帧画面是临时构图，不可收藏、不被记忆；
 * - manual：用户正在拖动/缩放，画面是用户选择的真实构图。
 *
 * 临时构图成为真实状态的时刻：运镜自然完成（到达终点），
 * 或用户输入随时接管（interrupt / move / zoom 取消运镜，以当前画面为准）。
 */
export type CameraPhase = "idle" | "auto" | "manual";

/** 不支持动画（无 rAF）或用户偏好减少动态时，运镜直接跳到相同终点。 */
function animationAllowed(): boolean {
  if (typeof requestAnimationFrame !== "function") return false;
  if (typeof matchMedia === "function")
    return !matchMedia("(prefers-reduced-motion: reduce)").matches;
  return true;
}

export function createCamera() {
  const camera = reactive<Camera>({ yaw: 0, pitch: 0, fov: 70 });
  const phase = ref<CameraPhase>("idle");
  let raf = 0;

  function apply(value: Camera) {
    camera.yaw = wrap(value.yaw);
    camera.pitch = clamp(value.pitch, -65, 65);
    camera.fov = clamp(value.fov, 35, 95);
  }
  function stopTween() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  /** 用户接管：取消未完成的运镜，当前画面即刻成为已确认状态。 */
  function interrupt() {
    stopTween();
    phase.value = "idle";
  }
  /** 硬切到指定构图（手记回访、访谈返回、刷新恢复）。 */
  function restore(value: Camera) {
    stopTween();
    apply(value);
    phase.value = "idle";
  }
  /** 平滑运镜到指定构图；再次调用会从当前位置重新起镜，不留半完成状态。 */
  function flyTo(target: Camera) {
    stopTween();
    const to: Camera = {
      yaw: wrap(target.yaw),
      pitch: clamp(target.pitch, -65, 65),
      fov: clamp(target.fov, 35, 95),
    };
    const duration = transitionDuration(camera, to);
    if (!animationAllowed()) {
      apply(to);
      phase.value = "idle";
      return;
    }
    const from: Camera = { ...camera };
    const start = performance.now();
    phase.value = "auto";
    const step = (now: number) => {
      if (now - start >= duration) {
        raf = 0;
        apply(to); // 运镜完成：终点成为已确认的真实构图
        phase.value = "idle";
        return;
      }
      apply(interpolateCamera(from, to, (now - start) / duration));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  return {
    camera,
    phase,
    restore,
    flyTo,
    interrupt,
    move: (dx: number, dy: number) => {
      interrupt();
      phase.value = "manual";
      apply({
        ...camera,
        yaw: camera.yaw - dx * 0.13,
        pitch: camera.pitch + dy * 0.13,
      });
    },
    zoom: (delta: number) => {
      interrupt();
      phase.value = "manual";
      apply({ ...camera, fov: camera.fov + delta * 0.03 });
    },
    /** 手动操作结束（抬起指针、滚轮停歇），构图落定。 */
    settle: () => {
      if (phase.value === "manual") phase.value = "idle";
    },
  };
}
export type CameraController = ReturnType<typeof createCamera>;
