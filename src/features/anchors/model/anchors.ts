import { ref } from "vue";
import type { Anchor, Camera } from "../../../shared/types";
import { loadAnchorStore, persistAnchorStore } from "../lib/storage.ts";

/**
 * 镜头锚点与每章“上次方向”的记忆。
 * 锚点与探索手记是两个独立的收藏：删除锚点不会影响任何已收藏的发现。
 */
export function createAnchors() {
  const stored = loadAnchorStore();
  const anchors = ref<Anchor[]>(stored.anchors),
    memory = ref<Record<string, Camera>>(stored.memory),
    error = ref("");
  let memoryTimer: number | undefined;

  function persist(): boolean {
    const ok = persistAnchorStore({
      anchors: anchors.value,
      memory: memory.value,
    });
    error.value = ok ? "" : "本地空间不足，镜头锚点未保存";
    return ok;
  }
  /** 拖动途中会持续更新记忆，写入做防抖；刷新后恢复的总是已确认的镜头。 */
  function persistMemorySoon() {
    clearTimeout(memoryTimer);
    memoryTimer = window.setTimeout(persist, 250);
  }
  function forChapter(chapterId: string) {
    return anchors.value.filter((a) => a.chapterId === chapterId);
  }
  return {
    anchors,
    error,
    forChapter,
    find: (id: string) => anchors.value.find((a) => a.id === id),
    save(chapterId: string, name: string, camera: Camera): Anchor {
      const anchor: Anchor = {
        id: crypto.randomUUID(),
        chapterId,
        name:
          name.trim().slice(0, 20) ||
          `镜头 ${String(forChapter(chapterId).length + 1).padStart(2, "0")}`,
        camera: { ...camera },
        createdAt: Date.now(),
      };
      anchors.value = [...anchors.value, anchor];
      persist();
      return anchor;
    },
    /** 只删除锚点本身；探索手记里对应的发现保持不变。 */
    remove(id: string) {
      anchors.value = anchors.value.filter((a) => a.id !== id);
      persist();
    },
    /** 记录某章最后已确认的镜头；运镜途中的临时构图不应传到这里。 */
    remember(chapterId: string, camera: Camera) {
      memory.value = { ...memory.value, [chapterId]: { ...camera } };
      persistMemorySoon();
    },
    recall: (chapterId: string) => memory.value[chapterId],
  };
}
export type Anchors = ReturnType<typeof createAnchors>;
