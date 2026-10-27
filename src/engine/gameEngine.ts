import {
  ACTIONS,
  ENDINGS,
  EVENTS,
  ITEMS,
  STATUSES,
  getEndingById,
  getEventById,
  getItemById,
} from '../data/gameData';
import type {
  ActionConfig,
  ActionId,
  Delta,
  EndingId,
  EndingView,
  EventConfig,
  EffectPreview,
  EventView,
  GameState,
  ItemId,
  LogEntry,
  MainActionId,
  OutcomePayload,
  ResolutionContext,
  StatKey,
  StatusId,
  Tone,
} from '../types';

export const STORAGE_KEY = 'cyber-fame-chronicle-save';
const SAVE_VERSION = 1;
const MAX_LOG = 180;
const EVENT_REPEAT_COOLDOWN_ROUNDS = 2;

const BASE_STATS = {
  money: 0,
  traffic: 0,
  reputation: 0,
  sanity: 10,
};

const statLabelMap: Record<StatKey, string> = {
  money: '金钱',
  traffic: '流量',
  reputation: '声望',
  sanity: '理智',
};

const statKeys: StatKey[] = ['money', 'traffic', 'reputation', 'sanity'];

const actionCounterTemplate: Record<ActionId, number> = {
  surf: 0,
  work: 0,
  stream: 0,
  rest: 0,
};

const calmActionCopy: Record<MainActionId, string> = {
  surf: '本周没有新的瓜砸到你脸上，冲浪只留下了一点流量余温。',
  work: '本周没有突发事件，只有工位灯光照常把你烤熟。',
  stream: '这场直播没有炸出额外事故，弹幕散场后数据安静上涨。',
};

const hasStatus = (state: GameState, statusId: StatusId) =>
  state.statuses.includes(statusId);

const hasItem = (state: GameState, itemId: ItemId) =>
  (state.items[itemId] ?? 0) > 0;

const getItemCount = (state: GameState, itemId: ItemId) => state.items[itemId] ?? 0;

const unique = <T>(values: T[]) => [...new Set(values)];

const cloneState = (state: GameState): GameState =>
  JSON.parse(JSON.stringify(state)) as GameState;

const clampStat = (key: StatKey, value: number) => {
  if (key === 'reputation') {
    return value;
  }

  return Math.max(0, value);
};

const formatDelta = (delta: Delta) => {
  const entries = Object.entries(delta).filter(
    ([, value]) => typeof value === 'number' && value !== 0,
  ) as [StatKey, number][];

  if (!entries.length) {
    return '无数值变化';
  }

  return entries
    .map(([key, value]) => `${statLabelMap[key]} ${value > 0 ? '+' : ''}${value}`)
    .join(' / ');
};

const createStatsDelta = (before: GameState['stats'], after: GameState['stats']): Delta => {
  const delta: Delta = {};

  for (const key of statKeys) {
    const diff = after[key] - before[key];

    if (diff !== 0) {
      delta[key] = diff;
    }
  }

  return delta;
};

const getStatusName = (statusId: StatusId) =>
  STATUSES.find((status) => status.id === statusId)?.name ?? statusId;

const getItemName = (itemId: ItemId) =>
  ITEMS.find((item) => item.id === itemId)?.name ?? itemId;

const getActionName = (actionId: ActionId) =>
  actionId === 'rest'
    ? '睡一周'
    : ACTIONS.find((action) => action.id === actionId)?.name ?? actionId;

const createEffectPreview = (
  id: string,
  label: string,
  text: string,
  tone: Tone,
): EffectPreview => ({
  id,
  label,
  text,
  tone,
});

const outcomeToEffects = (outcome?: OutcomePayload): EffectPreview[] => {
  if (!outcome) {
    return [];
  }

  const effects: EffectPreview[] = [];

  if (outcome.delta) {
    for (const [key, value] of Object.entries(outcome.delta) as [StatKey, number][]) {
      if (!value) {
        continue;
      }

      effects.push(
        createEffectPreview(
          `delta-${key}`,
          statLabelMap[key],
          `${value > 0 ? '+' : ''}${value}`,
          value > 0 ? 'good' : 'bad',
        ),
      );
    }
  }

  for (const statusId of outcome.addStatuses ?? []) {
    effects.push(
      createEffectPreview(
        `add-status-${statusId}`,
        '获得状态',
        getStatusName(statusId),
        'special',
      ),
    );
  }

  for (const statusId of outcome.removeStatuses ?? []) {
    effects.push(
      createEffectPreview(
        `remove-status-${statusId}`,
        '移除状态',
        getStatusName(statusId),
        'neutral',
      ),
    );
  }

  for (const [itemId, count] of Object.entries(outcome.addItems ?? {}) as [ItemId, number][]) {
    effects.push(
      createEffectPreview(
        `add-item-${itemId}`,
        '获得物品',
        `${getItemName(itemId)} x${count}`,
        'special',
      ),
    );
  }

  for (const [itemId, count] of Object.entries(outcome.consumeItems ?? {}) as [ItemId, number][]) {
    effects.push(
      createEffectPreview(
        `consume-item-${itemId}`,
        '消耗物品',
        `${getItemName(itemId)} x${count}`,
        'bad',
      ),
    );
  }

  return effects;
};

const prefixEffects = (effects: EffectPreview[], prefix: string) =>
  effects.map((effect) => ({
    ...effect,
    id: `${prefix}-${effect.id}`,
  }));

const summarizeEffects = (effects: EffectPreview[]) =>
  effects.length
    ? effects.map((effect) => `${effect.label}${effect.text}`).join('，')
    : '无直接属性变动';

const summarizeOutcomeLine = (notes: string[], effects: EffectPreview[]) =>
  notes.length ? notes.join(' ') : summarizeEffects(effects);

const sentenceEndPattern = /[。！？.!?]$/;

const trimSentenceEnd = (text: string) => text.trim().replace(/[。！？.!?]+$/, '');

const ensureSentenceEnd = (text: string) => {
  const trimmed = text.trim();

  if (!trimmed) {
    return '';
  }

  return sentenceEndPattern.test(trimmed) ? trimmed : `${trimmed}。`;
};

const createOptionSettlementLine = (
  optionLabel: string,
  optionDescription: string,
) => {
  return ensureSentenceEnd(`你选择了「${optionLabel}」：${trimSentenceEnd(optionDescription)}`);
};

const pushLog = (state: GameState, title: string, detail: string, tone: Tone) => {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    round: state.round,
    title,
    detail,
    tone,
  };

  state.log = [entry, ...state.log].slice(0, MAX_LOG);
};

const markEventSeen = (state: GameState, eventId: string) => {
  state.flags = unique([...state.flags, `event:${eventId}`]);
};

const adjustNegativeValue = (
  state: GameState,
  key: StatKey,
  value: number,
  context: { actionId: ActionId; isNegative: boolean; protectable: boolean },
  rng: () => number,
  notes: string[],
) => {
  let nextValue = value;

  if (!context.protectable || nextValue >= 0) {
    return nextValue;
  }

  if (
    context.isNegative &&
    key === 'sanity' &&
    hasStatus(state, 'cyberMonk')
  ) {
    nextValue = Math.min(0, nextValue + 1);
    notes.push('赛博和尚发动，负面事件理智损失 -1。');
  }

  if (nextValue < 0 && hasStatus(state, 'softPersimmon') && rng() < 0.25) {
    notes.push(`软柿子发动，${key === 'money' ? '金钱' : key === 'traffic' ? '流量' : key === 'reputation' ? '声望' : '理智'}负面效果被抵消。`);
    return 0;
  }

  return nextValue;
};

const applyDelta = (
  state: GameState,
  delta: Delta | undefined,
  context: { actionId: ActionId; isNegative: boolean; protectable: boolean },
  rng: () => number,
  notes: string[],
) => {
  if (!delta) {
    return;
  }

  for (const [key, value] of Object.entries(delta) as [StatKey, number][]) {
    if (!value) {
      continue;
    }

    const adjusted = adjustNegativeValue(state, key, value, context, rng, notes);
    const next = clampStat(key, state.stats[key] + adjusted);
    state.stats[key] = next;
  }
};

const applyOutcome = (
  state: GameState,
  outcome: OutcomePayload,
  context: { actionId: ActionId; isNegative: boolean; protectable: boolean },
  rng: () => number,
  notes: string[],
) => {
  applyDelta(state, outcome.delta, context, rng, notes);

  if (outcome.addStatuses?.length) {
    state.statuses = unique([...state.statuses, ...outcome.addStatuses]);
  }

  if (outcome.removeStatuses?.length) {
    state.statuses = state.statuses.filter(
      (statusId) => !outcome.removeStatuses!.includes(statusId),
    );
  }

  if (outcome.addItems) {
    for (const [itemId, count] of Object.entries(outcome.addItems) as [
      ItemId,
      number,
    ][]) {
      state.items[itemId] = (state.items[itemId] ?? 0) + count;
    }
  }

  if (outcome.consumeItems) {
    for (const [itemId, count] of Object.entries(outcome.consumeItems) as [
      ItemId,
      number,
    ][]) {
      state.items[itemId] = Math.max(0, (state.items[itemId] ?? 0) - count);
    }
  }

  if (outcome.addFlags?.length) {
    state.flags = unique([...state.flags, ...outcome.addFlags]);
  }

  if (outcome.notes?.length) {
    notes.push(...outcome.notes);
  }
};

const applyStreamEventBonuses = (
  state: GameState,
  event: EventConfig,
  rng: () => number,
  notes: string[],
) => {
  if (event.action !== 'stream' && event.action !== 'all') {
    return;
  }

  const trafficBonus = hasStatus(state, 'fanCrystal') ? 1 : 0;

  if (trafficBonus > 0) {
    applyDelta(
      state,
      { traffic: trafficBonus },
      { actionId: 'stream', isNegative: false, protectable: false },
      rng,
      notes,
    );
    notes.push(`直播体质发动，事件额外 +${trafficBonus} 流量。`);
  }

  if (event.isNegative) {
    const reputationPenalty = hasStatus(state, 'fanCrystal') ? 1 : 0;

    if (reputationPenalty > 0) {
      applyDelta(
        state,
        { reputation: -reputationPenalty },
        { actionId: 'stream', isNegative: true, protectable: true },
        rng,
        notes,
      );
      notes.push(`负面直播反噬，额外 -${reputationPenalty} 声望。`);
    }

  }
};

const createEventView = (
  event: EventConfig,
  actionId: ActionId,
  state?: GameState,
  immediateOutcome?: OutcomePayload,
  baseEffects: EffectPreview[] = [],
  baseNotes: string[] = [],
): EventView => {
  const previewContext = state
    ? createResolutionContext(cloneState(state), actionId, () => 0.42)
    : null;
  const hasEventOptions = Boolean(event.options?.length);
  const immediateEffects = outcomeToEffects(
    immediateOutcome ??
      (!hasEventOptions && previewContext
        ? event.getImmediateOutcome?.(previewContext) ?? {}
        : undefined),
  );

  const immediateLine =
    !hasEventOptions && (immediateEffects.length > 0 || Boolean(immediateOutcome?.notes?.length))
      ? summarizeOutcomeLine(immediateOutcome?.notes ?? [], immediateEffects)
      : '';
  const baseLine =
    !hasEventOptions && (baseEffects.length > 0 || baseNotes.length > 0)
      ? `基础结算：${summarizeEffects(baseEffects)}${
          baseNotes.length ? `。${baseNotes.join(' ')}` : ''
        }`
      : '';

  return {
    id: event.id,
    title: event.title,
    description: [event.description, immediateLine, baseLine].filter(Boolean).join('\n'),
    imageLabel: event.imageLabel,
    tier: event.tier,
    tone: event.tone ?? (event.isNegative ? 'bad' : 'neutral'),
    isNegative: Boolean(event.isNegative),
    actionId,
    baseEffects,
    baseNotes,
    effects: hasEventOptions
      ? immediateEffects
      : [...prefixEffects(baseEffects, 'base'), ...prefixEffects(immediateEffects, 'event')],
    options:
      event.options?.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        effects: previewContext ? outcomeToEffects(option.getOutcome(previewContext)) : [],
      })) ?? [],
  };
};

const createCalmWeekView = (
  action: ActionConfig,
  round: number,
  notes: string[],
  delta: Delta,
): EventView => ({
  id: `calm-${round}-${action.id}`,
  title: `${action.name}：无事发生`,
  description:
    notes.length > 0
      ? `${calmActionCopy[action.id]} ${notes.join(' ')}`
      : calmActionCopy[action.id],
  imageLabel: 'NO EXTRA EVENT',
  tier: 'C',
  tone: 'neutral',
  isNegative: false,
  actionId: action.id,
  baseEffects: [],
  baseNotes: [],
  effects: outcomeToEffects({ delta }),
  options: [],
});

const createTurnSettlementView = (
  state: GameState,
  event: EventConfig,
  optionLabel: string,
  optionSettlementDescription: string,
  actionId: ActionId,
  baseEffects: EffectPreview[],
  baseNotes: string[],
  eventEffects: EffectPreview[],
  eventNotes: string[],
  tone: Tone,
): EventView => ({
  id: `settlement-${state.round}-${event.id}`,
  title: '本周结算',
  description: [
    event.description,
    createOptionSettlementLine(optionLabel, optionSettlementDescription),
    `基础结算：${summarizeEffects(baseEffects)}${
      baseNotes.length ? `。${baseNotes.join(' ')}` : ''
    }`,
  ].join('\n'),
  imageLabel: 'TURN SETTLEMENT',
  tier: event.tier,
  tone,
  isNegative: Boolean(event.isNegative),
  actionId,
  baseEffects: [],
  baseNotes: [],
  effects: [...prefixEffects(eventEffects, 'event'), ...prefixEffects(baseEffects, 'base')],
  options: [],
});

const shouldTriggerEvent = (state: GameState, event: EventConfig, actionId: ActionId) => {
  if (event.action !== 'all' && event.action !== actionId) {
    return false;
  }

  if (event.once && state.flags.includes(`event:${event.id}`)) {
    return false;
  }

  const lastRound = state.counters.eventLastRounds[event.id];

  if (
    typeof lastRound === 'number' &&
    state.round - lastRound <= EVENT_REPEAT_COOLDOWN_ROUNDS
  ) {
    return false;
  }

  return event.condition(state);
};

const resolveEventProbability = (state: GameState, event: EventConfig) => {
  return event.probability ?? 1;
};

const selectTierEvent = (
  state: GameState,
  tier: 'A' | 'B' | 'C',
  actionId: ActionId,
  rng: () => number,
) => {
  const candidates = EVENTS.filter(
    (event) => event.tier === tier && shouldTriggerEvent(state, event, actionId),
  );

  if (tier === 'A') {
    return candidates[0];
  }

  const roll = rng();
  let cumulative = 0;

  for (const event of candidates) {
    cumulative += resolveEventProbability(state, event);

    if (roll < cumulative) {
      return event;
    }
  }

  return undefined;
};

const createResolutionContext = (
  state: GameState,
  actionId: ActionId,
  rng: () => number,
): ResolutionContext => ({
  state,
  actionId,
  rng,
});

const resolveEnding = (state: GameState): EndingId => {
  const ending = [...ENDINGS]
    .sort((left, right) => right.priority - left.priority)
    .find((candidate) => candidate.condition(state));

  return ending?.id ?? 'grassStageSurvivor';
};

const finalizeTurn = (state: GameState, actionId: ActionId, notes: string[]) => {
  state.pendingEvent = null;

  if (state.stats.sanity <= 0) {
    state.stats.sanity = 0;
    state.ended = true;
    state.endingId = 'daoBreak';
    pushLog(state, '道心破碎', '理智归零，游戏提前结束。', 'bad');
    return state;
  }

  if (state.round >= state.maxRounds) {
    state.ended = true;
    state.endingId = resolveEnding(state);
    pushLog(state, '最终结局', `第 ${state.round} 周结算完成。`, 'special');
    return state;
  }

  const completedRound = state.round;
  pushLog(
    state,
    `第 ${completedRound} 周结束 · ${getActionName(actionId)}`,
    `本周行动：${getActionName(actionId)}。${
      notes.length ? notes.join(' ') : '没有额外记录。'
    }`,
    'neutral',
  );
  state.round += 1;

  return state;
};

const applyBaseAction = (
  state: GameState,
  action: ActionConfig,
  rng: () => number,
  notes: string[],
) => {
  let delta = { ...action.baseDelta };

  if (action.id === 'work') {
    if (hasStatus(state, 'professionalPal')) {
      delta.money = (delta.money ?? 0) + 1;
      delta.sanity = 0;
      notes.push('专业帕鲁发动，打工额外 +1 金钱且不掉理智。');
    } else if (hasStatus(state, 'screwImmortal')) {
      delta.sanity = 0;
      notes.push('打螺丝仙人发动，本周打工不掉理智。');
    } else if (hasStatus(state, 'shortTermEmperor')) {
      delta.sanity = 0;
      notes.push('短工皇帝发动，本周打工不掉理智。');
    } else if (hasStatus(state, 'oldHand')) {
      delta.sanity = 0;
      notes.push('老油条发动，本周打工不掉理智。');
    }
  }

  applyDelta(
    state,
    delta,
    { actionId: action.id, isNegative: false, protectable: true },
    rng,
    notes,
  );

  state.counters.actionCounts[action.id] += 1;

  if (action.id === 'work' && hasStatus(state, 'oldHand')) {
    state.counters.oldHandWorkCount += 1;
  }

  notes.push(`基础行动结算：${formatDelta(delta)}。`);
};

const applyRoundPassives = (
  state: GameState,
  actionId: ActionId,
  rng: () => number,
  notes: string[],
) => {
  if (hasItem(state, 'woodenFish') && state.round % 5 === 0) {
    applyDelta(
      state,
      { sanity: 1 },
      { actionId, isNegative: false, protectable: false },
      rng,
      notes,
    );
    notes.push('电子木鱼发动，理智 +1。');
  }

  if (hasItem(state, 'eCigarette') && state.round % 4 === 0) {
    applyDelta(
      state,
      { sanity: 1 },
      { actionId, isNegative: false, protectable: false },
      rng,
      notes,
    );
    notes.push('电子香烟发动，理智 +1。');
  }

  if (hasItem(state, 'huazi') && state.round % 3 === 0) {
    applyDelta(
      state,
      { sanity: 1 },
      { actionId, isNegative: false, protectable: false },
      rng,
      notes,
    );
    notes.push('华子发动，理智 +1。');
  }
};

const applyActionModifiers = (
  state: GameState,
  actionId: ActionId,
  rng: () => number,
  notes: string[],
) => {
  if (actionId === 'work') {
    if (hasStatus(state, 'overtimeManager') && rng() < 0.25) {
      applyDelta(
        state,
        { sanity: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('班味主理人发动，额外 +1 理智。');
    }

    if (hasStatus(state, 'screwImmortal') && rng() < 0.25) {
      applyDelta(
        state,
        { traffic: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('打螺丝仙人发动，额外 +1 流量。');
    }

    if (hasStatus(state, 'fragileWorker') && rng() < 0.2) {
      applyDelta(
        state,
        { money: 3 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('老板工伤赔偿触发，金钱 +3。');
    }

    if (hasItem(state, 'capitalBook') && rng() < 0.25) {
      applyDelta(
        state,
        { sanity: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('《资本论》精装版发动，额外 +1 理智。');
    }

    if (hasItem(state, 'kingVest') && rng() < 0.5) {
      applyDelta(
        state,
        { traffic: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('王的背心发动，额外 +1 流量。');
    }
  }

  if (actionId === 'surf' && hasItem(state, 'waterArmy')) {
    applyDelta(
      state,
      { sanity: 1 },
      { actionId, isNegative: false, protectable: false },
      rng,
      notes,
    );
    notes.push('水军机器人发动，网上冲浪额外 +1 理智。');
  }

  if (actionId === 'stream') {
    if (hasItem(state, 'studioUpgrade') && rng() < 0.25) {
      applyDelta(
        state,
        { traffic: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('场地升级发动，直播额外 +1 流量。');
    }

    if (hasItem(state, 'editingTeam') && rng() < 0.25) {
      applyDelta(
        state,
        { traffic: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('剪辑团队发动，直播额外 +1 流量。');
    }

    if (hasItem(state, 'kingVest') && rng() < 0.5) {
      applyDelta(
        state,
        { traffic: 1 },
        { actionId, isNegative: false, protectable: false },
        rng,
        notes,
      );
      notes.push('王的背心发动，额外 +1 流量。');
    }
  }
};

const applyEventResult = (
  state: GameState,
  event: EventConfig,
  outcome: OutcomePayload,
  actionId: ActionId,
  rng: () => number,
  notes: string[],
) => {
  applyOutcome(
    state,
    outcome,
    {
      actionId,
      isNegative: Boolean(event.isNegative),
      protectable: true,
    },
    rng,
    notes,
  );

  if (actionId === 'stream') {
    applyStreamEventBonuses(state, event, rng, notes);
  }

  state.counters.eventCounts[event.id] = (state.counters.eventCounts[event.id] ?? 0) + 1;
  state.counters.eventLastRounds[event.id] = state.round;

  if (event.id === 'debateLose') {
    state.counters.lineLossCount += 1;
  }
};

const resolveImmediateEvent = (
  state: GameState,
  event: EventConfig,
  actionId: ActionId,
  rng: () => number,
  notes: string[],
  immediateOutcome?: OutcomePayload,
) => {
  if (event.once) {
    markEventSeen(state, event.id);
  }

  const context = createResolutionContext(state, actionId, rng);
  const outcome = immediateOutcome ?? (event.getImmediateOutcome?.(context) ?? {});
  applyEventResult(state, event, outcome, actionId, rng, notes);
  state.lastEvent = createEventView(event, actionId, state, outcome);

  pushLog(
    state,
    event.title,
    outcome.notes?.join(' ') ?? event.description,
    outcome.tone ?? event.tone ?? (event.isNegative ? 'bad' : 'special'),
  );
};

const queueEvent = (
  state: GameState,
  event: EventConfig,
  actionId: ActionId,
  rng: () => number,
  baseDelta: Delta,
  baseNotes: string[],
) => {
  if (event.once) {
    markEventSeen(state, event.id);
  }

  const immediateOutcome = event.options?.length
    ? undefined
    : (event.getImmediateOutcome?.(createResolutionContext(cloneState(state), actionId, rng)) ?? {});

  state.pendingEvent = {
    eventId: event.id,
    actionId,
    openedAtRound: state.round,
    immediateOutcome,
    baseEffects: outcomeToEffects({ delta: baseDelta }),
    baseNotes,
  };
  state.lastEvent = createEventView(
    event,
    actionId,
    state,
    immediateOutcome,
    outcomeToEffects({ delta: baseDelta }),
    baseNotes,
  );
};

export const createInitialState = (): GameState => ({
  saveVersion: SAVE_VERSION,
  round: 1,
  maxRounds: 20,
  stats: { ...BASE_STATS },
  statuses: [],
  items: {},
  flags: [],
  counters: {
    actionCounts: { ...actionCounterTemplate },
    oldHandWorkCount: 0,
    lineLossCount: 0,
    skippedRounds: 0,
    eventCounts: {},
    eventLastRounds: {},
  },
  log: [],
  lastEvent: null,
  pendingEvent: null,
  ended: false,
  endingId: null,
});

export const hydrateState = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') {
    return createInitialState();
  }

  const state = raw as Partial<GameState>;
  const base = createInitialState();

  return {
    ...base,
    ...state,
    maxRounds: base.maxRounds,
    stats: { ...base.stats, ...(state.stats ?? {}) },
    statuses: Array.isArray(state.statuses) ? state.statuses : [],
    items: { ...base.items, ...(state.items ?? {}) },
    flags: Array.isArray(state.flags) ? state.flags : [],
    counters: {
      ...base.counters,
      ...(state.counters ?? {}),
      actionCounts: {
        ...base.counters.actionCounts,
        ...(state.counters?.actionCounts ?? {}),
      },
      eventCounts: { ...(state.counters?.eventCounts ?? {}) },
      eventLastRounds: { ...(state.counters?.eventLastRounds ?? {}) },
    },
    log: Array.isArray(state.log) ? state.log.slice(0, MAX_LOG) : [],
    lastEvent: state.lastEvent ?? null,
    pendingEvent: state.pendingEvent ?? null,
    ended: Boolean(state.ended),
    endingId: state.endingId ?? null,
  } satisfies GameState;
};

export const getActionCards = (state: GameState) =>
  ACTIONS.map((action) => ({
    ...action,
    availability: action.enabled(state),
  }));

export const getStatuses = (state: GameState) =>
  STATUSES.filter((status) => state.statuses.includes(status.id));

export const getInventory = (state: GameState) =>
  ITEMS.filter((item) => (state.items[item.id] ?? 0) > 0).map((item) => ({
    ...item,
    count: state.items[item.id] ?? 0,
  }));

export const getShopItems = (state: GameState) =>
  ITEMS.map((item, index) => {
    const rule = item.purchasable(state);
    const owned = state.items[item.id] ?? 0;

    return {
      ...item,
      sortIndex: index,
      owned,
      available:
        rule.available && state.stats.money >= item.price && (!item.unique || owned === 0),
      reason:
        !rule.available
          ? rule.reason
          : state.stats.money < item.price
            ? '金钱不够。'
            : item.unique && owned > 0
              ? '已经拥有。'
              : undefined,
    };
  })
    .sort(
      (left, right) =>
        Number(left.owned > 0) - Number(right.owned > 0) || left.sortIndex - right.sortIndex,
    )
    .map(({ sortIndex: _sortIndex, ...item }) => item);

export const buyItem = (
  inputState: GameState,
  itemId: ItemId,
  rng: () => number = Math.random,
) => {
  const state = cloneState(inputState);
  const item = getItemById(itemId);

  if (!item || state.ended || state.pendingEvent) {
    return state;
  }

  const rule = item.purchasable(state);
  const isInstantUse = itemId === 'boostPack';

  if (!rule.available || state.stats.money < item.price || (item.unique && hasItem(state, itemId))) {
    return state;
  }

  state.stats.money = clampStat('money', state.stats.money - item.price);

  if (!isInstantUse) {
    state.items[itemId] = (state.items[itemId] ?? 0) + 1;
  }

  const notes: string[] = [`购入 ${item.name}，花费 ${item.price} 金钱。`];

  if (item.onPurchase) {
    const context = createResolutionContext(state, 'rest', rng);
    const outcome = item.onPurchase(context);
    applyOutcome(
      state,
      outcome,
      { actionId: 'rest', isNegative: false, protectable: false },
      rng,
      notes,
    );
  }

  pushLog(state, `商店购入：${item.name}`, notes.join(' '), 'special');
  state.lastEvent = {
    id: `shop-${item.id}`,
    title: `商店 · ${item.name}`,
    description: notes.join(' '),
    imageLabel: 'SHOP DELIVERY',
    tier: 'C',
    tone: 'special',
    isNegative: false,
    actionId: 'rest',
    baseEffects: [],
    baseNotes: [],
    effects: outcomeToEffects({ delta: { money: -item.price } }),
    options: [],
  };

  return state;
};

export const useMelatonin = (
  inputState: GameState,
  rng: () => number = Math.random,
) => {
  const state = cloneState(inputState);

  if (state.ended || state.pendingEvent || getItemCount(state, 'melatonin') <= 0) {
    return state;
  }

  const notes: string[] = ['你吞下一颗褪黑素软糖，决定先睡一周再说。'];

  applyOutcome(
    state,
    {
      delta: { sanity: 2 },
      consumeItems: { melatonin: 1 },
      notes: ['这一觉睡得很沉，赛博噪音终于远了点。'],
    },
    { actionId: 'rest', isNegative: false, protectable: false },
    rng,
    notes,
  );

  state.counters.actionCounts.rest += 1;
  state.counters.skippedRounds += 1;
  state.lastEvent = {
    id: `rest-${state.round}`,
    title: '睡一觉',
    description: '你主动跳过了这个回合，用睡眠给脑子做了一次小修复。',
    imageLabel: 'SLEEP MODE',
    tier: 'C',
    tone: 'good',
    isNegative: false,
    actionId: 'rest',
    baseEffects: [],
    baseNotes: [],
    effects: outcomeToEffects({ delta: { sanity: 2 }, consumeItems: { melatonin: 1 } }),
    options: [],
  };

  return finalizeTurn(state, 'rest', notes);
};

export const executeAction = (
  inputState: GameState,
  actionId: MainActionId,
  rng: () => number = Math.random,
) => {
  const state = cloneState(inputState);
  const action = ACTIONS.find((entry) => entry.id === actionId);

  if (!action || state.ended || state.pendingEvent) {
    return state;
  }

  const availability = action.enabled(state);

  if (!availability.available) {
    return state;
  }

  const notes: string[] = [];
  const beforeActionStats = { ...state.stats };
  applyBaseAction(state, action, rng, notes);
  applyRoundPassives(state, actionId, rng, notes);
  applyActionModifiers(state, actionId, rng, notes);
  const actionDelta = createStatsDelta(beforeActionStats, state.stats);

  const pickedEvent =
    selectTierEvent(state, 'A', actionId, rng) ??
    selectTierEvent(state, 'C', actionId, rng) ??
    selectTierEvent(state, 'B', actionId, rng);

  if (!pickedEvent) {
    const summaryView = createCalmWeekView(action, state.round, notes, actionDelta);
    state.lastEvent = summaryView;
    state.pendingEvent = {
      eventId: summaryView.id,
      actionId,
      openedAtRound: state.round,
      summaryView,
      summaryNotes: [...notes],
    };
    return state;
  }

  queueEvent(state, pickedEvent, actionId, rng, actionDelta, [...notes]);
  return state;
};

export const resolvePendingEvent = (
  inputState: GameState,
  optionId: string,
  rng: () => number = Math.random,
) => {
  const state = cloneState(inputState);
  const pending = state.pendingEvent;

  if (!pending) {
    return state;
  }

  if (pending.summaryView) {
    state.lastEvent = pending.summaryView;
    return finalizeTurn(state, pending.actionId, pending.summaryNotes ?? pending.baseNotes ?? []);
  }

  const event = getEventById(pending.eventId);

  if (!event) {
    state.pendingEvent = null;
    return state;
  }

  if (!event.options?.length) {
    const notes: string[] = [...(pending.baseNotes ?? [])];
    const context = createResolutionContext(state, pending.actionId, rng);
    const outcome = pending.immediateOutcome ?? (event.getImmediateOutcome?.(context) ?? {});

    applyEventResult(state, event, outcome, pending.actionId, rng, notes);
    const baseNoteCount = pending.baseNotes?.length ?? 0;
    const eventNotes = notes.slice(baseNoteCount);
    state.lastEvent = createEventView(
      event,
      pending.actionId,
      state,
      outcome,
      pending.baseEffects ?? [],
      pending.baseNotes ?? [],
    );

    pushLog(
      state,
      event.title,
      eventNotes.join(' ') || event.description,
      outcome.tone ?? event.tone ?? (event.isNegative ? 'bad' : 'special'),
    );

    return finalizeTurn(state, pending.actionId, pending.baseNotes ?? []);
  }

  const option = event.options.find((entry) => entry.id === optionId);

  if (!option) {
    return state;
  }

  const notes: string[] = [...(pending.baseNotes ?? [])];
  const context = createResolutionContext(state, pending.actionId, rng);
  const outcome = option.getOutcome(context);
  const beforeEventStats = { ...state.stats };
  applyEventResult(state, event, outcome, pending.actionId, rng, notes);
  const baseNoteCount = pending.baseNotes?.length ?? 0;
  const eventNotes = notes.slice(baseNoteCount);
  const eventDelta = createStatsDelta(beforeEventStats, state.stats);
  const eventEffects = outcomeToEffects({ ...outcome, delta: eventDelta });
  const summaryView = createTurnSettlementView(
    state,
    event,
    option.label,
    option.settlementDescription ?? option.description,
    pending.actionId,
    pending.baseEffects ?? [],
    pending.baseNotes ?? [],
    eventEffects,
    eventNotes,
    outcome.tone ?? event.tone ?? (event.isNegative ? 'bad' : 'special'),
  );
  state.lastEvent = summaryView;
  state.pendingEvent = {
    eventId: summaryView.id,
    actionId: pending.actionId,
    openedAtRound: pending.openedAtRound,
    summaryView,
    summaryNotes: [...(pending.baseNotes ?? [])],
  };

  pushLog(
    state,
    `${event.title} · ${option.label}`,
    outcome.notes?.join(' ') ?? event.description,
    outcome.tone ?? event.tone ?? (event.isNegative ? 'bad' : 'special'),
  );

  return state;
};

export const getPendingEvent = (state: GameState) => {
  if (!state.pendingEvent) {
    return null;
  }

  if (state.pendingEvent.summaryView) {
    return state.pendingEvent.summaryView;
  }

  const event = getEventById(state.pendingEvent.eventId);

  if (!event) {
    return null;
  }

  return createEventView(
    event,
    state.pendingEvent.actionId,
    state,
    state.pendingEvent.immediateOutcome,
    state.pendingEvent.baseEffects ?? [],
    state.pendingEvent.baseNotes ?? [],
  );
};

export const getEndingView = (endingId: EndingId | null): EndingView | null => {
  if (!endingId) {
    return null;
  }

  const ending = getEndingById(endingId);

  if (!ending) {
    return null;
  }

  return {
    id: ending.id,
    name: ending.name,
    title: ending.title,
    description: ending.description,
    accent: ending.accent,
  };
};

export const serializeState = (state: GameState) =>
  JSON.stringify({
    ...state,
    saveVersion: SAVE_VERSION,
  });
