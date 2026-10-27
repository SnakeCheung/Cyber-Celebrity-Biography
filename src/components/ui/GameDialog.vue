<script setup lang="ts">
import { ElDialog } from 'element-plus/es/components/dialog/index';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDialogScrollLock } from '../../composables/useDialogScrollLock';

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  variant: 'shop' | 'log' | 'event' | 'ending';
  dismissible?: boolean;
}>(), {
  dismissible: false,
});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { lock, unlock } = useDialogScrollLock();
const dialog = ref<InstanceType<typeof ElDialog>>();

// A backdrop click must not move keyboard focus to the page behind the dialog.
const preserveBackdropFocus = (event: MouseEvent) => {
  const overlay = dialog.value?.dialogContentRef?.$el?.parentElement;
  if (props.open && event.target === overlay) event.preventDefault();
};
onMounted(() => document.addEventListener('mousedown', preserveBackdropFocus, true));
onBeforeUnmount(() => document.removeEventListener('mousedown', preserveBackdropFocus, true));

watch(() => props.open, (open) => {
  if (open) lock();
}, { immediate: true });
</script>

<template>
  <ElDialog
    ref="dialog"
    :model-value="open"
    :title="title"
    class="modal-window"
    :class="`modal-window--${variant}`"
    :modal-class="`game-dialog-overlay game-dialog-overlay--${variant}`"
    :show-close="false"
    :close-on-click-modal="dismissible"
    :close-on-press-escape="dismissible"
    :z-index="50"
    :lock-scroll="false"
    append-to-body
    destroy-on-close
    transition="modal-fade"
    @closed="unlock"
    @update:model-value="(value: boolean) => { if (!value) emit('close'); }"
  >
    <!-- Keep the existing illustrated headers; title supplies the accessible name. -->
    <template #header></template>
    <slot />
  </ElDialog>
</template>
