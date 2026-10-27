<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import GameDialog from './ui/GameDialog.vue';
import type { EndingView } from '../types';

const endingImageModules = import.meta.glob('../assets/endings/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const endingImageMap = Object.fromEntries(
  Object.entries(endingImageModules).map(([path, src]) => {
    const filename = path.split('/').pop() ?? '';
    return [decodeURIComponent(filename.replace(/\.[^.]+$/, '')), src];
  }),
);

const props = defineProps<{
  ending: EndingView | null;
}>();

// Retain the last content while the dialog plays its closing transition.
const displayedEnding = shallowRef(props.ending);
watch(() => props.ending, (ending) => {
  if (ending) displayedEnding.value = ending;
});

defineEmits<{
  (event: 'restart'): void;
}>();

const endingImageSrc = computed(() =>
  displayedEnding.value ? endingImageMap[displayedEnding.value.name] ?? '' : '',
);
</script>

<template>
  <GameDialog :open="Boolean(ending)" :title="displayedEnding?.name ?? '结局'" variant="ending">
    <template v-if="displayedEnding">
      <div class="ending-visual" :style="{ '--ending-accent': displayedEnding.accent }">
        <img
          v-if="endingImageSrc"
          class="ending-visual__image"
          :src="endingImageSrc"
          :alt="displayedEnding.name"
        />
        <template v-else>
          <span>ENDING IMAGE PLACEHOLDER</span>
          <strong>{{ displayedEnding.name }}</strong>
        </template>
      </div>
      <div class="ending-copy">
        <p class="modal-window__eyebrow">{{ displayedEnding.title }}</p>
        <h2>{{ displayedEnding.name }}</h2>
        <p class="modal-window__body">{{ displayedEnding.description }}</p>
      </div>
      <button class="ui-button ui-button--primary" @click="$emit('restart')">
        再开一局
      </button>
    </template>
  </GameDialog>
</template>
