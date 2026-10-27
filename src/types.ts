export type StatKey = 'money' | 'traffic' | 'reputation' | 'sanity';
export type ActionId = 'surf' | 'work' | 'stream' | 'rest';
export type MainActionId = Exclude<ActionId, 'rest'>;
export type EventTier = 'A' | 'B' | 'C';
export type Tone = 'good' | 'bad' | 'neutral' | 'special';

export type StatusId =
  | 'oldHand'
  | 'professionalPal'
  | 'shortTermEmperor'
  | 'rightHand'
  | 'selfMade'
  | 'blackRed'
  | 'cyberMonk'
  | 'overtimeManager'
  | 'screwImmortal'
  | 'fragileWorker'
  | 'softPersimmon'
  | 'fanCrystal'
  | 'abstractEmperor';

export type ItemId =
  | 'phoneStand'
  | 'studioUpgrade'
  | 'editingTeam'
  | 'boostPack'
  | 'titaniumKeyboard'
  | 'woodenFish'
  | 'eCigarette'
  | 'huazi'
  | 'melatonin'
  | 'capitalBook'
  | 'kingVest'
  | 'waterArmy';

export type EndingId =
  | 'topIdol'
  | 'darkCommerce'
  | 'hiddenSage'
  | 'cyberCelebrity'
  | 'blackRedFame'
  | 'salesKing'
  | 'dignifiedLogout'
  | 'steadyLanding'
  | 'quietJoy'
  | 'daoBreak'
  | 'grassStageSurvivor';

export interface Stats {
  money: number;
  traffic: number;
  reputation: number;
  sanity: number;
}

export type Delta = Partial<Record<StatKey, number>>;

export interface LogEntry {
  id: string;
  round: number;
  title: string;
  detail: string;
  tone: Tone;
}

export interface PendingEventState {
  eventId: string;
  actionId: ActionId;
  openedAtRound: number;
  immediateOutcome?: OutcomePayload;
  baseEffects?: EffectPreview[];
  baseNotes?: string[];
  summaryView?: EventView;
  summaryNotes?: string[];
}

export interface EffectPreview {
  id: string;
  label: string;
  text: string;
  tone: Tone;
}

export interface ChoiceView {
  id: string;
  label: string;
  description: string;
  effects: EffectPreview[];
}

export interface EventView {
  id: string;
  title: string;
  description: string;
  imageLabel: string;
  tier: EventTier;
  tone: Tone;
  isNegative: boolean;
  actionId: ActionId;
  baseEffects: EffectPreview[];
  baseNotes: string[];
  effects: EffectPreview[];
  options: ChoiceView[];
}

export interface EndingView {
  id: EndingId;
  name: string;
  title: string;
  description: string;
  accent: string;
}

export interface GameState {
  saveVersion: number;
  round: number;
  maxRounds: number;
  stats: Stats;
  statuses: StatusId[];
  items: Partial<Record<ItemId, number>>;
  flags: string[];
  counters: {
    actionCounts: Record<ActionId, number>;
    oldHandWorkCount: number;
    lineLossCount: number;
    skippedRounds: number;
    eventCounts: Record<string, number>;
    eventLastRounds: Record<string, number>;
  };
  log: LogEntry[];
  lastEvent: EventView | null;
  pendingEvent: PendingEventState | null;
  ended: boolean;
  endingId: EndingId | null;
}

export interface ActionConfig {
  id: MainActionId;
  name: string;
  description: string;
  baseDelta: Delta;
  accent: string;
  enabled: (state: GameState) => { available: boolean; reason?: string };
}

export interface StatusConfig {
  id: StatusId;
  name: string;
  summary: string;
}

export interface ItemConfig {
  id: ItemId;
  name: string;
  price: number;
  unique: boolean;
  summary: string;
  description: string;
  unlockText: string;
  effectText: string;
  purchasable: (state: GameState) => { available: boolean; reason?: string };
  onPurchase?: (context: ResolutionContext) => OutcomePayload;
}

export interface OutcomePayload {
  delta?: Delta;
  addStatuses?: StatusId[];
  removeStatuses?: StatusId[];
  addItems?: Partial<Record<ItemId, number>>;
  consumeItems?: Partial<Record<ItemId, number>>;
  addFlags?: string[];
  notes?: string[];
  tone?: Tone;
}

export interface EventOptionConfig {
  id: string;
  label: string;
  description: string;
  settlementDescription?: string;
  getOutcome: (context: ResolutionContext) => OutcomePayload;
}

export interface EventConfig {
  id: string;
  title: string;
  description: string;
  imageLabel: string;
  tier: EventTier;
  action: MainActionId | 'all';
  probability?: number;
  once?: boolean;
  isNegative?: boolean;
  tone?: Tone;
  condition: (state: GameState) => boolean;
  options?: EventOptionConfig[];
  getImmediateOutcome?: (context: ResolutionContext) => OutcomePayload;
}

export interface EndingConfig {
  id: EndingId;
  name: string;
  title: string;
  description: string;
  accent: string;
  priority: number;
  condition: (state: GameState) => boolean;
}

export interface ResolutionContext {
  state: GameState;
  actionId: ActionId;
  rng: () => number;
}
