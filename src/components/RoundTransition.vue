<script setup lang="ts">
defineProps<{
  visible: boolean;
  round: number;
}>();
</script>

<template>
  <transition name="round-flash">
    <div v-if="visible" class="round-transition">
      <div class="round-transition__grid"></div>
      <div class="round-transition__content">
        <h2>第 {{ round }} 周</h2>
      </div>
    </div>
  </transition>
</template>
