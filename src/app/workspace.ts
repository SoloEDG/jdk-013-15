import { ref, watch } from "vue";
import { createCamera, cameraDistance } from "../features/panorama";
import { createPlayback } from "../features/chapters";
import { createDiscovery } from "../features/hotspots";
import { createBranch } from "../features/interviews";
import { createJournal } from "../features/journal";
import { createAnchors } from "../features/anchors";
import { chapters } from "../shared/content";
import type { Camera, Command, Position } from "../shared/types";

const FALLBACK_OPENING: Camera = { yaw: 0, pitch: 0, fov: 70 };

export function createWorkspace() {
  const camera = createCamera(),
    playback = createPlayback(),
    discovery = createDiscovery(() => playback.state),
    branch = createBranch(),
    journal = createJournal(),
    anchors = createAnchors(),
    tab = ref("story"),
    /** 回看章节时提供“回到导演推荐方向”的选择 */
    resumeOffer = ref<{ chapterId: string } | null>(null);

  const openingFor = (id: string): Camera =>
    chapters.find((c) => c.id === id)?.opening ?? FALLBACK_OPENING;

  const position = (): Position => ({
    chapterId: playback.state.chapterId,
    time: playback.state.time,
    camera: { ...camera.camera },
    playing: playback.state.playing,
  });

  /** 进入章节：优先继续上次方向；与导演推荐方向接近时不打扰。 */
  function arrive(chapterId: string) {
    const recalled = anchors.recall(chapterId);
    camera.restore(recalled ?? openingFor(chapterId));
    resumeOffer.value =
      recalled && cameraDistance(recalled, openingFor(chapterId)) >= 3
        ? { chapterId }
        : null;
  }

  // 刷新后恢复已确认的镜头
  arrive(playback.state.chapterId);

  // 只有已确认的镜头（手动/落定）才记忆；运镜途中的临时构图跳过
  watch(
    () => ({ phase: camera.phase.value, ...camera.camera }),
    (s) => {
      if (s.phase === "auto") return;
      if (s.phase === "manual") resumeOffer.value = null;
      anchors.remember(playback.state.chapterId, {
        yaw: s.yaw,
        pitch: s.pitch,
        fov: s.fov,
      });
    },
  );

  /** 离开当前章前留存镜头；运镜途中的临时构图不留。 */
  function keepCurrentCamera() {
    if (camera.phase.value !== "auto")
      anchors.remember(playback.state.chapterId, { ...camera.camera });
  }

  function enterPerson(id: string) {
    camera.interrupt(); // 进入访谈：取消未完成的运镜，以当前画面为准
    resumeOffer.value = null;
    branch.enter(id, position());
    playback.state.playing = false;
    discovery.close();
  }

  function dispatch(command: Command) {
    switch (command.type) {
      case "chapter": {
        if (branch.personId.value) return;
        const from = playback.state.chapterId;
        keepCurrentCamera();
        playback.select(command.id);
        discovery.close();
        if (command.id === from) {
          resumeOffer.value = null;
          camera.flyTo(openingFor(from)); // 点当前章：回到导演推荐方向
        } else {
          arrive(command.id);
        }
        break;
      }
      case "seek":
        playback.seek(command.time);
        break;
      case "hotspot":
        discovery.select(command.id);
        break;
      case "return": {
        const saved = branch.leave();
        if (saved) {
          playback.select(saved.chapterId);
          playback.seek(saved.time);
          camera.restore(saved.camera);
          playback.state.playing = saved.playing;
        }
        break;
      }
      case "revisit":
        branch.leave();
        resumeOffer.value = null;
        playback.select(command.entry.chapterId);
        playback.seek(command.entry.time);
        camera.restore(command.entry.camera); // 旧手记始终按原构图回访
        discovery.select(command.entry.hotspotId);
        tab.value = "story";
        break;
    }
  }

  function save() {
    camera.interrupt(); // 收藏即确认：若正在运镜，以当前画面为准
    const h = discovery.detail.value;
    if (h) journal.save(h, position());
  }

  /** 收藏当前镜头为命名锚点；运镜途中的临时构图不可收藏。 */
  function saveAnchor(name: string) {
    if (branch.personId.value || camera.phase.value === "auto") return;
    anchors.save(playback.state.chapterId, name, { ...camera.camera });
  }

  /** 对准锚点：从当前画面平滑转场；再次点击另一锚点会重新起镜。 */
  function applyAnchor(id: string) {
    if (branch.personId.value) return;
    const anchor = anchors.find(id);
    if (!anchor) return;
    resumeOffer.value = null;
    if (anchor.chapterId !== playback.state.chapterId) {
      keepCurrentCamera();
      playback.select(anchor.chapterId);
      discovery.close();
    }
    camera.flyTo(anchor.camera);
  }

  /** 删除锚点只影响镜头收藏，对应的发现仍留在探索手记里。 */
  function removeAnchor(id: string) {
    anchors.remove(id);
  }

  function useRecommended() {
    if (branch.personId.value) return;
    resumeOffer.value = null;
    camera.flyTo(openingFor(playback.state.chapterId));
  }

  return {
    camera,
    playback,
    discovery,
    branch,
    journal,
    anchors,
    tab,
    resumeOffer,
    position,
    enterPerson,
    dispatch,
    save,
    saveAnchor,
    applyAnchor,
    removeAnchor,
    useRecommended,
    dismissResume: () => (resumeOffer.value = null),
  };
}
