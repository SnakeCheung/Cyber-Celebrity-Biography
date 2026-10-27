<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElPopover } from 'element-plus/es/components/popover/index';
import GameDialog from './components/ui/GameDialog.vue';
import EndingModal from './components/EndingModal.vue';
import EventModal from './components/EventModal.vue';
import RoundTransition from './components/RoundTransition.vue';
import ShopModal from './components/ShopModal.vue';
import StartScreen from './components/StartScreen.vue';
import moneyIconSrc from './assets/icons/stat-money-coin.svg';
import reputationIconSrc from './assets/icons/stat-reputation-like.svg';
import sanityIconSrc from './assets/icons/stat-sanity-brain.svg';
import trafficIconSrc from './assets/icons/stat-traffic-fav.svg';
import {
  STORAGE_KEY,
  buyItem,
  createInitialState,
  executeAction,
  getActionCards,
  getEndingView,
  getInventory,
  getPendingEvent,
  getShopItems,
  getStatuses,
  hydrateState,
  resolvePendingEvent,
  serializeState,
  useMelatonin,
} from './engine/gameEngine';
import type { GameState, MainActionId, StatKey } from './types';

const state = ref<GameState>(createInitialState());
const started = ref(false);
const hasSave = ref(false);
const showShop = ref(false);
const showLog = ref(false);
const activeInfoChipId = ref<string | null>(null);
const transitionVisible = ref(false);
const transitionRound = ref(1);
const persistReady = ref(false);
let transitionTimer: number | undefined;

const statCards: Array<{
  key: StatKey;
  label: string;
  accent: string;
  iconSrc: string;
}> = [
  { key: 'money', label: '金钱', accent: 'amber', iconSrc: moneyIconSrc },
  { key: 'reputation', label: '声望', accent: 'pink', iconSrc: reputationIconSrc },
  { key: 'traffic', label: '流量', accent: 'traffic', iconSrc: trafficIconSrc },
  { key: 'sanity', label: '理智', accent: 'mint', iconSrc: sanityIconSrc },
];

const displayedStats = ref<GameState['stats']>({ ...state.value.stats });
const animatingStats = ref<StatKey[]>([]);
const statValueTimers = new Map<StatKey, number>();
const statAnimationTimers = new Map<StatKey, number>();
let deferNextStatSync = false;
let deferredStats: GameState['stats'] | null = null;

const actionCards = computed(() => getActionCards(state.value));
const statusCards = computed(() => getStatuses(state.value));
const inventoryCards = computed(() => getInventory(state.value));
const shopItems = computed(() => getShopItems(state.value));
const pendingEvent = computed(() => getPendingEvent(state.value));
const endingView = computed(() => getEndingView(state.value.endingId));
const melatoninCount = computed(() => state.value.items.melatonin ?? 0);
const logGroups = computed(() => {
  const groups = new Map<number, GameState['log']>();

  for (const entry of state.value.log) {
    const entries = groups.get(entry.round) ?? [];
    entries.push(entry);
    groups.set(entry.round, entries);
  }

  return Array.from(groups.entries())
    .sort(([leftRound], [rightRound]) => rightRound - leftRound)
    .map(([round, entries]) => {
      const turnEndIndex = entries.findIndex((entry) => entry.title.startsWith(`第 ${round} 周结束`));

      if (turnEndIndex > 0) {
        const [turnEndEntry] = entries.splice(turnEndIndex, 1);
        entries.unshift(turnEndEntry);
      }

      return {
        round,
        entries,
      };
    });
});
const infoChips = computed(() => [
  ...statusCards.value.map((status) => ({
    id: `status-${status.id}`,
    type: '状态',
    name: status.name,
    summary: status.summary,
    count: undefined as number | undefined,
  })),
  ...inventoryCards.value.map((item) => ({
    id: `item-${item.id}`,
    type: '物品',
    name: item.name,
    summary: item.effectText || item.summary || item.description,
    count: item.count,
  })),
]);

const headline = computed(() => {
  if (state.value.stats.sanity <= 3) {
    return '脑内缓冲条已经闪红。';
  }

  if (state.value.stats.traffic >= 18) {
    return '你已经闻到顶流缓存的味道了。';
  }

  if (state.value.stats.money >= 12 && state.value.stats.traffic < 8) {
    return '至少钱包比评论区更爱你。';
  }

  return '现实与赛博空间都在抢你的注意力。';
});

const actionIcon = (actionId: MainActionId) => {
  const icons: Record<MainActionId, string> = {
    surf: '🏄',
    work: '💼',
    stream: '🎙',
  };

  return icons[actionId];
};

const canUseMelatonin = computed(
  () =>
    melatoninCount.value > 0 &&
    !state.value.pendingEvent &&
    !state.value.ended &&
    !transitionVisible.value,
);

const clearStatTimer = (key: StatKey) => {
  const valueTimer = statValueTimers.get(key);
  const animationTimer = statAnimationTimers.get(key);

  if (valueTimer) {
    window.clearTimeout(valueTimer);
  }

  if (animationTimer) {
    window.clearTimeout(animationTimer);
  }
};

const animateDisplayedStats = (nextStats: GameState['stats']) => {
  if (!started.value) {
    displayedStats.value = { ...nextStats };
    animatingStats.value = [];
    return;
  }

  const changedKeys = statCards
    .map((stat) => stat.key)
    .filter((key) => displayedStats.value[key] !== nextStats[key]);

  if (!changedKeys.length) {
    return;
  }

  animatingStats.value = Array.from(new Set([...animatingStats.value, ...changedKeys]));

  for (const key of changedKeys) {
    clearStatTimer(key);

    statValueTimers.set(
      key,
      window.setTimeout(() => {
        displayedStats.value = {
          ...displayedStats.value,
          [key]: nextStats[key],
        };
      }, 180),
    );

    statAnimationTimers.set(
      key,
      window.setTimeout(() => {
        animatingStats.value = animatingStats.value.filter((statKey) => statKey !== key);
      }, 420),
    );
  }
};

watch(
  () => ({ ...state.value.stats }),
  (nextStats) => {
    if (deferNextStatSync) {
      deferredStats = { ...nextStats };
      deferNextStatSync = false;
      return;
    }

    animateDisplayedStats(nextStats);
  },
);

const triggerRoundTransition = (round: number) => {
  transitionRound.value = round;
  transitionVisible.value = true;

  if (transitionTimer) {
    window.clearTimeout(transitionTimer);
  }

  transitionTimer = window.setTimeout(() => {
    transitionVisible.value = false;
    deferNextStatSync = false;

    animateDisplayedStats(deferredStats ?? { ...state.value.stats });
    deferredStats = null;
  }, 1150);
};

const persistState = () => {
  if (!persistReady.value) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, serializeState(state.value));
  hasSave.value = true;
};

const startNewGame = () => {
  state.value = createInitialState();
  displayedStats.value = { ...state.value.stats };
  animatingStats.value = [];
  deferredStats = null;
  deferNextStatSync = false;
  started.value = true;
  showShop.value = false;
  showLog.value = false;
  persistReady.value = true;
  persistState();
  triggerRoundTransition(state.value.round);
};

const continueGame = () => {
  started.value = true;
  showShop.value = false;
  showLog.value = false;
  persistReady.value = true;
  triggerRoundTransition(state.value.round);
};

const restartGame = () => {
  startNewGame();
};

const handleAction = (actionId: MainActionId) => {
  const previousRound = state.value.round;
  const nextState = executeAction(state.value, actionId);
  const shouldTransition =
    !nextState.pendingEvent && !nextState.ended && nextState.round !== previousRound;
  const shouldDeferUntilPendingEventEnds = Boolean(nextState.pendingEvent);

  if (shouldTransition || shouldDeferUntilPendingEventEnds) {
    deferNextStatSync = true;
  }

  state.value = nextState;

  if (shouldTransition) {
    triggerRoundTransition(state.value.round);
  }
};

const handleChoice = (optionId: string) => {
  const previousRound = state.value.round;
  const nextState = resolvePendingEvent(state.value, optionId);
  const shouldTransition = !nextState.ended && nextState.round !== previousRound;
  const shouldDeferUntilSettlementEnds = Boolean(nextState.pendingEvent?.summaryView);

  if (shouldTransition || shouldDeferUntilSettlementEnds) {
    deferNextStatSync = true;
  }

  state.value = nextState;

  if (shouldTransition) {
    triggerRoundTransition(state.value.round);
  }
};

const handleEventContinue = (selectedOptionId?: string) => {
  const optionId = selectedOptionId ?? pendingEvent.value?.options[0]?.id ?? 'continue';
  handleChoice(optionId);
};

const setInfoChipVisible = (chipId: string, visible: boolean) => {
  if (visible) {
    activeInfoChipId.value = chipId;
  } else if (activeInfoChipId.value === chipId) {
    activeInfoChipId.value = null;
  }
};

const closeInfoChip = () => {
  activeInfoChipId.value = null;
};

watch([showShop, showLog, pendingEvent, endingView, transitionVisible, started], closeInfoChip);

const handleBuyItem = (itemId: Parameters<typeof buyItem>[1]) => {
  state.value = buyItem(state.value, itemId);
};

const handleUseMelatonin = () => {
  const previousRound = state.value.round;
  const nextState = useMelatonin(state.value);
  const shouldTransition = !nextState.ended && nextState.round !== previousRound;

  if (shouldTransition) {
    deferNextStatSync = true;
  }

  state.value = nextState;

  if (shouldTransition) {
    triggerRoundTransition(state.value.round);
  }
};

onMounted(() => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw) {
    try {
      state.value = hydrateState(JSON.parse(raw));
      hasSave.value = true;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      state.value = createInitialState();
      hasSave.value = false;
    }
  }

  persistReady.value = true;
});

onBeforeUnmount(() => {
  if (transitionTimer) {
    window.clearTimeout(transitionTimer);
  }

  for (const timer of statValueTimers.values()) {
    window.clearTimeout(timer);
  }

  for (const timer of statAnimationTimers.values()) {
    window.clearTimeout(timer);
  }
});

watch(
  state,
  () => {
    persistState();
  },
  { deep: true },
);
</script>

<template>
  <div class="app-shell" @click="closeInfoChip">
    <div class="poster-number">404</div>
    <div class="poster-tape poster-tape--top">
      <span data-text="赛博精神病确诊　　V我50看看实力　　急了急了急了　　这波泼天富贵　　你币有了　　流量来咯　　理智已下线　　关注了但没完全关注　　硬蹭热搜启动　　电子榨菜上桌　　这号养成了">赛博精神病确诊　　V我50看看实力　　急了急了急了　　这波泼天富贵　　你币有了　　流量来咯　　理智已下线　　关注了但没完全关注　　硬蹭热搜启动　　电子榨菜上桌　　这号养成了</span>
    </div>
    <div class="poster-tape poster-tape--bottom">
      <span data-text="赢麻了家人们　　退网倒计时　　打工是不可能打工的　　黑红也是红　　榜一大哥糊涂啊　　热搜蹭一下　　投币保平安　　点赞救理智　　弹幕护体　　今天也要当赛博名人">赢麻了家人们　　退网倒计时　　打工是不可能打工的　　黑红也是红　　榜一大哥糊涂啊　　热搜蹭一下　　投币保平安　　点赞救理智　　弹幕护体　　今天也要当赛博名人</span>
    </div>
    <div class="poster-sticker poster-sticker--left">蚌埠住了!!</div>
    <div class="poster-sticker poster-sticker--right">太典了!!</div>

    <section class="phone-stage">
      <div class="phone-shadow"></div>
      <div class="phone-device">
        <div class="phone-notch"></div>
        <span class="phone-side-key phone-side-key--left-top" aria-hidden="true"></span>
        <span class="phone-side-key phone-side-key--left-bottom" aria-hidden="true"></span>
        <span class="phone-side-key phone-side-key--right" aria-hidden="true"></span>
        <div class="phone-screen">
          <StartScreen
            v-if="!started"
            :has-save="hasSave"
            @start="startNewGame"
            @continue="continueGame"
          />

          <main v-else class="game-layout">
            <header class="topbar">
              <div class="topbar__round">
                <span>WEEK</span>
                <strong>{{ state.round }}</strong>
                <em>/{{ state.maxRounds }}</em>
              </div>
              <div class="topbar__battery" aria-label="电量 91%">
                <span>91%</span>
                <span class="battery-meter">
                  <span class="battery-meter__fill"></span>
                </span>
              </div>
            </header>

            <section class="stats-panel">
              <article
                v-for="stat in statCards"
                :key="stat.key"
                class="stat-card"
                :class="[
                  `stat-card--${stat.accent}`,
                  {
                    'stat-card--danger': stat.key === 'sanity' && state.stats.sanity < 6,
                    'stat-card--bump': animatingStats.includes(stat.key),
                  },
                ]"
              >
                <span class="stat-card__icon" :data-stat="stat.key">
                  <img class="stat-card__svg" :src="stat.iconSrc" :alt="`${stat.label}图标`" />
                </span>
                <strong>{{ displayedStats[stat.key] }}</strong>
                <span>{{ stat.label }}</span>
              </article>
            </section>

            <section class="game-scroll">
              <div class="status-row">
                <span class="section-label section-label--buffs">状态物品</span>
                <div class="chip-list">
                  <ElPopover
                    v-for="chip in infoChips"
                    :key="chip.id"
                    :visible="activeInfoChipId === chip.id"
                    trigger="click"
                    placement="bottom-start"
                    popper-class="chip-popover"
                    :width="220"
                    :offset="12"
                    :hide-after="0"
                    :z-index="40"
                    :persistent="false"
                    @update:visible="(visible: boolean) => setInfoChipVisible(chip.id, visible)"
                  >
                    <template #reference>
                      <button
                        class="chip-card"
                        :class="[
                          chip.type === '物品' ? 'chip-card--item' : 'chip-card--status',
                          { 'chip-card--active': activeInfoChipId === chip.id },
                        ]"
                        type="button"
                        :aria-expanded="activeInfoChipId === chip.id"
                        @click.stop
                        @keydown.esc.stop="closeInfoChip"
                      >
                        <span>{{ chip.name }}</span>
                        <b v-if="chip.count && chip.count > 1">x{{ chip.count }}</b>
                      </button>
                    </template>
                    <strong>{{ chip.type }} / {{ chip.name }}</strong>
                    <small>{{ chip.summary }}</small>
                  </ElPopover>
                  <span v-if="!infoChips.length" class="chip-card chip-card--empty">
                    暂无状态物品
                  </span>
                </div>
              </div>

              <section class="actions-panel">
                <div class="actions-panel__header">
                  <span class="section-label section-label--actions">本周动作</span>
                </div>

                <div class="action-grid">
                  <button
                    v-for="action in actionCards"
                    :key="action.id"
                    class="action-card"
                    :class="[
                      `action-card--${action.accent}`,
                      { 'action-card--disabled': !action.availability.available || transitionVisible || state.pendingEvent || state.ended },
                    ]"
                    :disabled="!action.availability.available || transitionVisible || Boolean(state.pendingEvent) || state.ended"
                    @click="handleAction(action.id)"
                  >
                    <span class="action-card__body">
                      <span class="action-card__icon">{{ actionIcon(action.id) }}</span>
                      <span class="action-card__copy">
                        <strong>{{ action.name }}</strong>
                        <small>
                          {{
                            action.availability.available
                              ? action.description
                              : action.availability.reason
                          }}
                        </small>
                      </span>
                    </span>
                  </button>
                </div>

                <button
                  v-if="melatoninCount > 0"
                  class="rest-button"
                  :disabled="!canUseMelatonin"
                  @click="handleUseMelatonin"
                >
                  褪黑素软糖 x{{ melatoninCount }}，睡一周
                </button>
              </section>

            </section>

            <footer class="bottom-nav">
              <button class="bottom-nav__button bottom-nav__button--log" @click="showLog = true">
                日志
                <span>LOG</span>
              </button>
              <button class="bottom-nav__button bottom-nav__button--shop" @click="showShop = true">
                赛博商店
                <span>SHOP</span>
              </button>
            </footer>
          </main>
        </div>
        <button
          class="phone-home"
          aria-label="返回开始界面"
          @click="started = false; showShop = false; showLog = false"
        ></button>
      </div>
    </section>

    <ShopModal
      :open="showShop"
      :money="state.stats.money"
      :sanity="state.stats.sanity"
      :traffic="state.stats.traffic"
      :items="shopItems"
      @close="showShop = false"
      @buy="handleBuyItem"
    />

    <GameDialog :open="showLog" title="日志" variant="log" dismissible @close="showLog = false">
      <header class="modal-window__header">
        <div>
          <h2>日志</h2>
        </div>
        <button class="ui-button ui-button--ghost ui-button--small" @click="showLog = false">
          关闭
        </button>
      </header>

      <div class="panel__header">
        <h2>{{ headline }}</h2>
      </div>

      <div class="log-list">
        <article v-for="group in logGroups" :key="group.round" class="log-week">
          <div class="log-week__meta">
            <strong>WEEK {{ group.round }}</strong>
            <span>{{ group.entries.length }} 条记录</span>
          </div>

          <div
            v-for="entry in group.entries"
            :key="entry.id"
            class="log-entry"
            :class="`log-entry--${entry.tone}`"
          >
            <div class="log-entry__meta">
              <strong>{{ entry.title }}</strong>
            </div>
            <p>{{ entry.detail }}</p>
          </div>
        </article>
        <p v-if="!state.log.length" class="empty-copy">系统日志等待第一条离谱记录。</p>
      </div>
    </GameDialog>

    <EventModal :event="pendingEvent" @continue="handleEventContinue" />
    <EndingModal :ending="endingView" @restart="restartGame" />
    <RoundTransition :visible="transitionVisible" :round="transitionRound" />
  </div>
</template>
