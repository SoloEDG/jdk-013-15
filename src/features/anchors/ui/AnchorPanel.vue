<script setup lang="ts">
import { computed, ref } from "vue";
import { Bookmark, Trash2, Video } from "lucide-vue-next";
import type { CameraPhase } from "../../panorama";
import type { Anchors } from "../model/anchors";

const props = defineProps<{
  anchors: Anchors;
  chapterId: string;
  cameraPhase: CameraPhase;
  /** 访谈进行中：镜头被锁定，锚点不可应用也不可收藏 */
  locked: boolean;
}>();
const emit = defineEmits<{
  apply: [id: string];
  remove: [id: string];
  save: [name: string];
}>();

const name = ref("");
const list = computed(() => props.anchors.forChapter(props.chapterId));
const flying = computed(() => props.cameraPhase === "auto");

function submit() {
  if (props.locked || flying.value) return;
  emit("save", name.value);
  name.value = "";
}
</script>
<template>
  <div class="anchor-panel">
    <div class="section-heading">
      <h2>镜头锚点</h2>
      <span>ANCHORS</span>
    </div>
    <p class="sidebar-copy">为这一章收藏喜欢的构图，随时回到同一个方向。</p>
    <p v-if="anchors.error.value" role="alert" class="anchor-hint">
      {{ anchors.error.value }}
    </p>
    <p v-if="!list.length" class="anchor-empty">本章还没有镜头锚点。</p>
    <div v-else class="anchor-list">
      <div v-for="a in list" :key="a.id" class="anchor-row">
        <button
          class="anchor-apply"
          :disabled="locked"
          :title="`对准「${a.name}」`"
          @click="emit('apply', a.id)"
        >
          <Video /><span>{{ a.name }}</span
          ><em>↗</em>
        </button>
        <button
          class="anchor-delete"
          :aria-label="`删除锚点 ${a.name}`"
          @click="emit('remove', a.id)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>
    <div class="anchor-save">
      <input
        v-model="name"
        maxlength="20"
        aria-label="锚点名称"
        :placeholder="`镜头 ${String(list.length + 1).padStart(2, '0')}`"
        :disabled="locked"
        @keydown.enter="submit"
      /><button :disabled="locked || flying" @click="submit">
        <Bookmark :size="13" /> 收藏当前镜头
      </button>
    </div>
    <p v-if="flying" class="anchor-hint">运镜进行中，落定后可收藏。</p>
  </div>
</template>
