<script setup lang="ts">
import konohaCyberIcon from '../assets/icons/start-konoha-silver.svg';

defineProps<{
  hasSave: boolean;
}>();

defineEmits<{
  (event: 'start'): void;
  (event: 'continue'): void;
}>();

interface TitleChar {
  char: string;
  rotate: string;
  offsetX: string;
  offsetY: string;
  scaleX: number;
  scaleY: number;
}

const title: TitleChar[] = [
  { char: '赛', rotate: '-3deg', offsetX: '0px', offsetY: '2px', scaleX: 1.04, scaleY: 1.08 },
  { char: '博', rotate: '1deg', offsetX: '0px', offsetY: '-1px', scaleX: 1, scaleY: 1.03 },
  { char: '名', rotate: '-2deg', offsetX: '0px', offsetY: '1px', scaleX: 1.02, scaleY: 1.06 },
  { char: '人', rotate: '2deg', offsetX: '0px', offsetY: '-2px', scaleX: 0.98, scaleY: 1.04 },
  { char: '传', rotate: '-1deg', offsetX: '0px', offsetY: '1px', scaleX: 1.04, scaleY: 1.08 },
];

</script>

<template>
  <section class="start-screen">
    <div class="start-screen__panel">
      <div class="start-screen__crest" aria-label="木叶纹章">
        <img class="start-screen__crest-icon" :src="konohaCyberIcon" alt="" />
      </div>
      <div class="start-screen__scroll">
        <span
          class="start-screen__scroll-knob start-screen__scroll-knob--left"
          aria-hidden="true"
        ></span>
        <span
          class="start-screen__scroll-knob start-screen__scroll-knob--right"
          aria-hidden="true"
        ></span>

        <div class="start-screen__roller">
          <h1 class="start-screen__title" aria-label="赛博名人传">
            <span
              v-for="(item, index) in title"
              :key="index"
              class="start-screen__title-char"
              :style="{
                '--title-rotate': item.rotate,
                '--title-offset-x': item.offsetX,
                '--title-offset-y': item.offsetY,
                '--title-scale-x': item.scaleX,
                '--title-scale-y': item.scaleY,
              }"
              aria-hidden="true"
            >
              <span class="start-screen__title-layer start-screen__title-layer--outer">
                {{ item.char }}
              </span>
              <span class="start-screen__title-layer start-screen__title-layer--border">
                {{ item.char }}
              </span>
              <span class="start-screen__title-layer start-screen__title-layer--face">
                {{ item.char }}
              </span>
            </span>
          </h1>
        </div>

        <div class="start-screen__mission-frame">
          <span
            class="start-screen__mission-mark start-screen__mission-mark--uzumaki"
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="52" fill="#d93b3b" stroke="#151515" stroke-width="8" />
              <path
                d="M 66 60 A 12 12 0 0 0 42 60 A 24 24 0 0 0 90 60 A 36 36 0 0 0 18 60 A 51 51 0 0 0 70 111"
                fill="none"
                stroke="#151515"
                stroke-width="8"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span
            class="start-screen__mission-mark start-screen__mission-mark--fan"
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="start-uchiha-fan-clip">
                  <circle cx="60" cy="60" r="52" />
                </clipPath>
              </defs>
              <path
                d="M 48 100 H 72 V 152 H 48 Z"
                fill="#fff6df"
                stroke="#151515"
                stroke-width="8"
                stroke-linejoin="round"
              />
              <circle cx="60" cy="60" r="52" fill="#f33b2f" />
              <g clip-path="url(#start-uchiha-fan-clip)">
                <ellipse cx="60" cy="126" rx="68" ry="68" fill="#151515" />
                <ellipse cx="60" cy="134" rx="68" ry="68" fill="#fff6df" />
              </g>
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#151515"
                stroke-width="8"
              />
            </svg>
          </span>
          <div class="start-screen__mission" role="note" aria-label="游戏简介">
            <p>
              <span>20 周冲浪、打工、直播，接事件。</span>
              <span>稳住四项属性，别让理智先下播！</span>
            </p>
          </div>
        </div>
      </div>

      <div class="start-screen__actions">
        <div
          v-if="hasSave"
          class="start-screen__action-frame start-screen__action-frame--primary"
        >
          <div class="start-screen__action-accent">
            <div class="start-screen__action-outline">
              <div class="start-screen__action-border">
                <button class="ui-button ui-button--primary" @click="$emit('continue')">
                  重返 <span class="start-screen__button-number">4G</span> 冲浪
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          class="start-screen__action-frame"
          :class="hasSave ? 'start-screen__action-frame--ghost' : 'start-screen__action-frame--primary'"
        >
          <div class="start-screen__action-accent">
            <div class="start-screen__action-outline">
              <div class="start-screen__action-border">
                <button
                  class="ui-button"
                  :class="hasSave ? 'ui-button--ghost' : 'ui-button--primary'"
                  @click="$emit('start')"
                >
                  重开
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
