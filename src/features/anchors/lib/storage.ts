import type { Anchor, Camera } from "../../../shared/types";

const key = "tidal-anchors-v1";

export interface AnchorStore {
  /** 用户收藏的命名镜头锚点 */
  anchors: Anchor[];
  /** 每个章节最后已确认的镜头（用于“继续上次方向”） */
  memory: Record<string, Camera>;
}

function isCamera(value: unknown): value is Camera {
  const c = value as Camera;
  return (
    !!c &&
    Number.isFinite(c.yaw) &&
    Number.isFinite(c.pitch) &&
    Number.isFinite(c.fov)
  );
}

function isAnchor(value: unknown): value is Anchor {
  const a = value as Anchor;
  return (
    !!a &&
    typeof a.id === "string" &&
    typeof a.chapterId === "string" &&
    typeof a.name === "string" &&
    isCamera(a.camera) &&
    Number.isFinite(a.createdAt)
  );
}

export function loadAnchorStore(): AnchorStore {
  const empty: AnchorStore = { anchors: [], memory: {} };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) || "{}");
    if (!raw || typeof raw !== "object") return empty;
    const store = raw as Partial<AnchorStore>;
    const memory: Record<string, Camera> = {};
    for (const [chapterId, camera] of Object.entries(store.memory ?? {}))
      if (isCamera(camera))
        memory[chapterId] = {
          yaw: camera.yaw,
          pitch: camera.pitch,
          fov: camera.fov,
        };
    return {
      anchors: Array.isArray(store.anchors)
        ? store.anchors.filter(isAnchor)
        : [],
      memory,
    };
  } catch {
    return empty;
  }
}

export function persistAnchorStore(store: AnchorStore): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
