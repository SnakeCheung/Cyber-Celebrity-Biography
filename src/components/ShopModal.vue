<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import GameDialog from './ui/GameDialog.vue';
import shopItemPlaceholderIcon from '../assets/icons/shop-item-placeholder.svg';
import moneyIconSrc from '../assets/icons/stat-money-coin.svg';
import sanityIconSrc from '../assets/icons/stat-sanity-brain.svg';
import trafficIconSrc from '../assets/icons/stat-traffic-fav.svg';
import type { ItemConfig } from '../types';

interface ShopItemCard extends ItemConfig {
  owned: number;
  available: boolean;
  reason?: string;
}

const props = defineProps<{
  open: boolean;
  money: number;
  sanity: number;
  traffic: number;
  items: ShopItemCard[];
}>();

defineEmits<{
  (event: 'close'): void;
  (event: 'buy', itemId: ShopItemCard['id']): void;
}>();

const displayedMoney = ref(props.money);
const walletBumping = ref(false);
let moneyValueTimer: number | undefined;
let walletBumpTimer: number | undefined;

watch(
  () => props.money,
  (nextMoney) => {
    if (displayedMoney.value === nextMoney) {
      return;
    }

    walletBumping.value = true;

    if (moneyValueTimer) {
      window.clearTimeout(moneyValueTimer);
    }

    if (walletBumpTimer) {
      window.clearTimeout(walletBumpTimer);
    }

    moneyValueTimer = window.setTimeout(() => {
      displayedMoney.value = nextMoney;
    }, 160);

    walletBumpTimer = window.setTimeout(() => {
      walletBumping.value = false;
    }, 420);
  },
);

onBeforeUnmount(() => {
  if (moneyValueTimer) {
    window.clearTimeout(moneyValueTimer);
  }

  if (walletBumpTimer) {
    window.clearTimeout(walletBumpTimer);
  }
});
</script>

<template>
  <GameDialog :open="open" title="金币商店" variant="shop" dismissible @close="$emit('close')">
    <header class="modal-window__header">
      <div>
        <h2 class="shop-title">金币商店</h2>
      </div>
      <div class="shop-wallet">
        <div class="shop-wallet__stat shop-wallet__stat--money" :class="{ 'shop-wallet__stat--bump': walletBumping }">
          <span class="shop-wallet__icon">
            <img :src="moneyIconSrc" alt="金钱" />
          </span>
          <strong>{{ displayedMoney }}</strong>
        </div>
        <div class="shop-wallet__stat shop-wallet__stat--traffic">
          <span class="shop-wallet__icon">
            <img :src="trafficIconSrc" alt="流量" />
          </span>
          <strong>{{ traffic }}</strong>
        </div>
        <div class="shop-wallet__stat shop-wallet__stat--sanity" :class="{ 'shop-wallet__stat--danger': sanity < 6 }">
          <span class="shop-wallet__icon">
            <img :src="sanityIconSrc" alt="理智" />
          </span>
          <strong>{{ sanity }}</strong>
        </div>
      </div>
      <button
        class="ui-button ui-button--ghost ui-button--small shop-close-button"
        @click="$emit('close')"
      >
        关闭
      </button>
    </header>

    <div class="shop-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="shop-card"
        :class="{ 'shop-card--owned': item.owned > 0 }"
      >
        <div class="shop-card__top">
          <div class="shop-card__visual" aria-hidden="true">
            <img :src="shopItemPlaceholderIcon" alt="" />
            <span>ITEM</span>
          </div>
          <div class="shop-card__copy">
            <h3>{{ item.name }}</h3>
            <p>{{ item.summary }}</p>
          </div>
          <span class="shop-card__price">
            <b>{{ item.price }}</b>
            <em>金钱</em>
          </span>
        </div>

        <dl class="shop-card__meta">
          <div class="shop-card__meta-row shop-card__meta-row--unlock">
            <dt>解锁</dt>
            <dd>{{ item.unlockText }}</dd>
          </div>
          <div class="shop-card__meta-row shop-card__meta-row--effect">
            <dt>效果</dt>
            <dd>{{ item.effectText }}</dd>
          </div>
        </dl>

        <p class="shop-card__desc">{{ item.description }}</p>

        <div class="shop-card__bottom">
          <span v-if="item.owned > 0" class="shop-card__owned">
            已拥有 {{ item.owned }}
          </span>
          <span v-else class="shop-card__owned">未拥有</span>

          <button
            class="ui-button"
            :class="item.available ? 'ui-button--primary' : 'ui-button--disabled'"
            :disabled="!item.available"
            @click="$emit('buy', item.id)"
          >
            {{ item.available ? '购买' : item.reason ?? '不可购买' }}
          </button>
        </div>
      </article>
    </div>
  </GameDialog>
</template>
