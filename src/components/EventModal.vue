<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import GameDialog from './ui/GameDialog.vue';
import type { EventView } from '../types';

const eventImageModules = import.meta.glob('../assets/events/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const eventImageMap = Object.fromEntries(
  Object.entries(eventImageModules).map(([path, src]) => {
    const filename = path.split('/').pop() ?? '';
    return [decodeURIComponent(filename.replace(/\.[^.]+$/, '')), src];
  }),
);

const props = defineProps<{
  event: EventView | null;
}>();

const emit = defineEmits<{
  (event: 'continue', optionId?: string): void;
}>();

// Keep the outgoing event visible until the dialog fade finishes.
const displayedEvent = shallowRef(props.event);
watch(() => props.event, (event) => {
  if (event) displayedEvent.value = event;
});

const selectedOptionId = ref<string | null>(null);

const hasOptions = computed(() => Boolean(displayedEvent.value?.options.length));
const canContinue = computed(() => !hasOptions.value || Boolean(selectedOptionId.value));
const isCalmWeek = computed(() => displayedEvent.value?.id.startsWith('calm-') ?? false);
const isSettlement = computed(() => displayedEvent.value?.id.startsWith('settlement-') ?? false);
const eventImageSrc = computed(() => {
  if (!displayedEvent.value || isSettlement.value) {
    return '';
  }

  return eventImageMap[displayedEvent.value.title] ?? '';
});
const shouldShowVisual = computed(() => !isSettlement.value);
const eventSourceLabel = computed(() => {
  if (!displayedEvent.value) {
    return '';
  }

  if (isCalmWeek.value) {
    return '平稳结算';
  }

  const labels = {
    A: '必定事件',
    B: '条件概率事件',
    C: '概率事件',
  } as const;

  return labels[displayedEvent.value.tier];
});
const eventSourceClass = computed(() => {
  if (!displayedEvent.value) {
    return '';
  }

  if (isCalmWeek.value) {
    return 'event-source--calm';
  }

  return `event-source--${displayedEvent.value.tier.toLowerCase()}`;
});
const descriptionLines = computed(() =>
  (displayedEvent.value?.description.split('\n') ?? [])
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => {
      let type = 'event';

      if (text.startsWith('基础结算')) {
        type = 'base';
      } else if (text.startsWith('你选择了')) {
        type = 'choice';
      } else if (index > 0) {
        type = 'settlement';
      }

      return { text, type };
    }),
);
const badgeLabel = computed(() =>
  isSettlement.value
    ? '本周结算'
    : isCalmWeek.value
      ? '无额外事件'
      : displayedEvent.value?.isNegative
        ? '负面波动'
        : '事件触发',
);

const selectOption = (optionId: string) => {
  selectedOptionId.value = optionId;
};

const continueEvent = () => {
  if (!canContinue.value) {
    return;
  }

  emit('continue', selectedOptionId.value ?? undefined);
};

watch(
  () => props.event?.id,
  () => {
    selectedOptionId.value = null;
  },
);
</script>

<template>
  <GameDialog
    :open="Boolean(props.event)"
    :title="displayedEvent?.title ?? '事件'"
    variant="event"
    :class="eventSourceClass"
  >
    <template v-if="displayedEvent">
      <header class="modal-window__header">
        <div class="event-title-block">
          <h2>{{ displayedEvent.title }}</h2>
          <span class="event-source-pill">{{ eventSourceLabel }}</span>
        </div>
        <div
          class="badge event-kind-badge"
          :class="[
            `badge--${displayedEvent.tone}`,
            { 'event-kind-badge--settlement': isSettlement },
          ]"
        >
          {{ badgeLabel }}
        </div>
      </header>

      <div v-if="shouldShowVisual" class="event-visual">
        <img
          v-if="eventImageSrc"
          class="event-visual__image"
          :src="eventImageSrc"
          :alt="displayedEvent.title"
        />
        <div v-else class="event-visual__placeholder">
          <span>IMAGE PLACEHOLDER</span>
          <strong>{{ displayedEvent.imageLabel }}</strong>
        </div>
      </div>

      <div class="modal-window__body event-description-list">
        <p
          v-for="line in descriptionLines"
          :key="`${line.type}-${line.text}`"
          class="event-description-line"
          :class="`event-description-line--${line.type}`"
        >
          {{ line.text }}
        </p>
      </div>

      <div v-if="displayedEvent.options.length" class="event-options">
        <button
          v-for="(option, index) in displayedEvent.options"
          :key="option.id"
          class="event-option"
          :class="{ 'event-option--selected': selectedOptionId === option.id }"
          type="button"
          @click="selectOption(option.id)"
        >
          <span class="event-option__index">选项{{ index + 1 }}</span>
          <span class="event-option__copy">
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
          <span class="event-effect-list event-effect-list--inline">
            <span
              v-for="effect in option.effects"
              :key="effect.id"
              class="event-effect"
              :class="`event-effect--${effect.tone}`"
            >
              <b>{{ effect.label }}</b>
              <em>{{ effect.text }}</em>
            </span>
            <span v-if="!option.effects.length" class="event-effect event-effect--neutral">
              <b>属性</b>
              <em>无直接变动</em>
            </span>
          </span>
        </button>
      </div>

      <div v-else class="event-effect-list event-effect-list--standalone">
          <span
            v-for="effect in displayedEvent.effects"
            :key="effect.id"
            class="event-effect"
            :class="`event-effect--${effect.tone}`"
          >
            <b>{{ effect.label }}</b>
            <em>{{ effect.text }}</em>
          </span>
          <span v-if="!displayedEvent.effects.length" class="event-effect event-effect--neutral">
            <b>属性</b>
            <em>无直接变动</em>
          </span>
      </div>

      <button class="event-continue" :disabled="!canContinue" @click="continueEvent">
        {{ displayedEvent.options.length ? '按这个来，继续' : '继续' }}
      </button>
    </template>
  </GameDialog>
</template>
