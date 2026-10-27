import type {
  ActionConfig,
  EndingConfig,
  EventConfig,
  GameState,
  ItemConfig,
  ItemId,
  MainActionId,
  OutcomePayload,
  ResolutionContext,
  StatKey,
  StatusConfig,
  StatusId,
  Tone,
} from '../types';

const hasStatus = (state: GameState, statusId: StatusId) =>
  state.statuses.includes(statusId);

const hasItem = (state: GameState, itemId: ItemId) =>
  (state.items[itemId] ?? 0) > 0;

const uniqueList = <T>(items: T[]) => Array.from(new Set(items));

const STAT_NAME_TO_KEY: Record<string, StatKey> = {
  金钱: 'money',
  流量: 'traffic',
  声望: 'reputation',
  理智: 'sanity',
};

const STATUS_NAME_TO_ID: Record<string, StatusId> = {
  老油条: 'oldHand',
  得力助手: 'professionalPal',
  专业帕鲁: 'professionalPal',
  短工皇帝: 'shortTermEmperor',
  打螺丝仙人: 'screwImmortal',
  赛博和尚: 'cyberMonk',
  班味主理人: 'overtimeManager',
  脆皮打工人: 'fragileWorker',
  软柿子: 'softPersimmon',
  饭圈结晶体: 'fanCrystal',
};

const EVENT_ID_BY_NAME: Record<string, string> = {
  老板开源节流: 'bossCutting',
  升职加薪: 'promotion',
  评论区团建: 'commentRaid',
  黑料考古: 'blackHistory',
  网络沙包: 'cyberMonkAwaken',
  尸班淡了: 'overtimeSmell',
  雪糕刺客: 'iceCreamAssassin',
  积劳成疾: 'overworked',
  老板奖金: 'bossBonus',
  遇见贵人: 'meetPatron',
  奇怪的知识增加: 'weirdKnowledge',
  发表逆天言论: 'insaneHotTake',
  发表热评: 'hotComment',
  小丑表演: 'clownShow',
  舌战群儒: 'debateWin',
  对线惜败: 'debateLose',
  竹篮打水: 'emptyStream',
  电子榨菜: 'snackContent',
  口误热搜: 'slipTrend',
  热点硬蹭: 'trendChase',
  感谢老板的火箭: 'bossRocket',
  神人连麦: 'wildCollab',
  人间蒸发: 'vanishFromWork',
  拼好饭股东大会: 'groupMealShareholder',
  带薪如厕挑战: 'paidToiletChallenge',
  '00后革命失败': 'genZRevolutionFail',
  草台班子临时CEO: 'temporaryCeo',
  赛博包工头: 'cyberForeman',
  牛马倒模: 'workerMold',
  牛马赋能: 'workerEmpowerment',
  黄袍加身: 'yellowRobe',
  灵活就业Vlog: 'gigVlog',
  螺丝界科目三: 'screwDance',
  流水线剪辑: 'assemblyLineClip',
  碳基之光: 'carbonGlory',
  开宗立派: 'foundSchool',
  仙人指路: 'sageGuidance',
  '4K高清处刑': 'fourKExecution',
  升降桌叛乱: 'standingDeskRevolt',
  物种危机: 'speciesCrisis',
  王座沉没事件: 'sinkingThrone',
  镰刀成精: 'sentientSickle',
  '9块9赛博神油上车': 'cyberOilSale',
  哪里贵了: 'whyExpensive',
  超话禁卫军出征: 'fanGuardCrusade',
  老哥私信点拨: 'wiseDm',
  楚门的朋友圈: 'trumanMoments',
  赛博斗蛐蛐: 'botCricketFight',
  粉圈雇佣兵: 'fandomMercenary',
  维新事变: 'reformMovement',
  保守派革命: 'oldSchoolTalk',
};

const OPTION_ID_BY_LABEL: Record<string, string> = {
  另请高明: 'leave',
  狗屁膏药: 'linger',
  下场互动: 'join',
  点赞走人: 'pose',
  主动自嘲: 'selfMock',
  律师函警告: 'lawyer',
  咬牙买单: 'pay',
  'RNM退钱': 'refund',
  拉人拼团: 'shareMeal',
  假装不饿: 'pretendFull',
  接管会议: 'takeMeeting',
  当场拆台: 'callOut',
  赛博投毒: 'poisonData',
  以身饲机: 'feedMachine',
  传授糊弄学: 'teachSlacking',
  倾囊相授: 'teachAll',
  拍成系列: 'filmSeries',
  只拿现钱: 'cashOnly',
  见好就收: 'stopWhileAhead',
  精益求精: 'perfectDance',
  单杀机械臂: 'soloRobotArm',
  惜败犹荣: 'honorableLoss',
  收徒割韭菜: 'sellLessons',
  唯手熟尔: 'craftOnly',
  物理自证: 'physicalProof',
  伪人教学: 'uncannyLesson',
  顺势土遁: 'diveDown',
  战术马步: 'horseStance',
  灵魂拷问: 'soulQuestion',
  共情牛马: 'empathizeWorkers',
  光速切割: 'cut',
  提纯粉丝: 'purify',
  听劝: 'listen',
  继续冲: 'keepScrolling',
  沉浸虚荣: 'sinkIntoVanity',
  认清现实: 'faceReality',
  卖票观战: 'sellTickets',
  燃烧显卡: 'burnGpu',
  接单搞钱: 'takeJob',
  两头通吃: 'doubleDip',
};

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  遇见贵人: '某位神秘网友在你最狼狈的时候看到了你，顺手把你推上了流量扶梯。',
};

const splitTableCell = (value: string) =>
  value
    .split('/')
    .map((entry) => entry.trim())
    .filter((entry) => entry && entry !== '无');

const normalizeAction = (action: string): MainActionId | 'all' => {
  if (action === '所有') {
    return 'all';
  }

  if (action === '加班打工') {
    return 'work';
  }

  if (action === '网上冲浪') {
    return 'surf';
  }

  return 'stream';
};

const imageLabelFor = (name: string) =>
  (EVENT_ID_BY_NAME[name] ?? name).replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

const parseProbability = (value: number | string) => {
  if (typeof value === 'number') {
    return value > 1 ? value / 100 : value;
  }

  const parsed = Number.parseFloat(value.replace('%', ''));
  return value.includes('%') || parsed > 1 ? parsed / 100 : parsed;
};

const mergeOutcome = (target: OutcomePayload, source: OutcomePayload) => {
  if (source.delta) {
    target.delta ??= {};

    for (const [key, value] of Object.entries(source.delta) as [StatKey, number][]) {
      target.delta[key] = (target.delta[key] ?? 0) + value;
    }
  }

  if (source.addStatuses?.length) {
    target.addStatuses = uniqueList([...(target.addStatuses ?? []), ...source.addStatuses]);
  }

  if (source.removeStatuses?.length) {
    target.removeStatuses = uniqueList([
      ...(target.removeStatuses ?? []),
      ...source.removeStatuses,
    ]);
  }

  if (source.notes?.length) {
    target.notes = [...(target.notes ?? []), ...source.notes];
  }

  if (source.tone) {
    target.tone = source.tone;
  }
};

const parseSettlementSegment = (segment: string): OutcomePayload => {
  const outcome: OutcomePayload = {};
  let text = segment.trim().replace(/[；;]+$/, '');

  text = text.replace(/^\d+(?:\.\d+)?%\s*/, '').trim();

  const colonIndex = text.search(/[：:]/);

  if (colonIndex >= 0) {
    text = text.slice(colonIndex + 1).trim();
  }

  for (const rawToken of text.split(/[，,、\n]/)) {
    const token = rawToken.trim().replace(/\s+/g, '');

    if (!token || token === '无') {
      continue;
    }

    const statMatch = token.match(/^(金钱|流量|声望|理智)([+-])(\d+)$/);

    if (statMatch) {
      const [, statName, sign, amountText] = statMatch;
      const statKey = STAT_NAME_TO_KEY[statName];
      const amount = Number(amountText) * (sign === '-' ? -1 : 1);
      outcome.delta ??= {};
      outcome.delta[statKey] = (outcome.delta[statKey] ?? 0) + amount;
      continue;
    }

    const removeStatusMatch = token.match(/^失去(.+)$/);

    if (removeStatusMatch) {
      const statusId = STATUS_NAME_TO_ID[removeStatusMatch[1]];

      if (statusId) {
        outcome.removeStatuses = uniqueList([...(outcome.removeStatuses ?? []), statusId]);
      }

      continue;
    }

    const addStatusMatch = token.match(/^(?:获得)?(.+)$/);
    const statusId = STATUS_NAME_TO_ID[addStatusMatch?.[1] ?? ''];

    if (statusId) {
      outcome.addStatuses = uniqueList([...(outcome.addStatuses ?? []), statusId]);
    }
  }

  return outcome;
};

const createOutcomeFromSettlement = (
  settlement: string,
  context: ResolutionContext,
): OutcomePayload => {
  const trimmed = settlement.trim();

  if (!trimmed || trimmed === '无') {
    return {};
  }

  const segments = trimmed
    .split(/[；;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const percentSegments = segments.map((entry) => entry.match(/^(\d+(?:\.\d+)?)%/));
  const allSegmentsAreAlternatives =
    segments.length > 1 && percentSegments.every((match) => Boolean(match));
  const outcome: OutcomePayload = {};

  if (allSegmentsAreAlternatives) {
    const roll = context.rng();
    let cumulative = 0;

    for (let index = 0; index < segments.length; index += 1) {
      cumulative += Number(percentSegments[index]?.[1] ?? 0) / 100;

      if (roll < cumulative) {
        mergeOutcome(outcome, parseSettlementSegment(segments[index]));
        break;
      }
    }

    return { ...outcome, tone: inferToneFromSettlement(settlement) };
  }

  for (const segment of segments.length ? segments : [trimmed]) {
    const probabilityMatch = segment.match(/^(\d+(?:\.\d+)?)%/);

    if (probabilityMatch) {
      const probability = Number(probabilityMatch[1]) / 100;

      if (context.rng() < probability) {
        mergeOutcome(outcome, parseSettlementSegment(segment));
      }

      continue;
    }

    mergeOutcome(outcome, parseSettlementSegment(segment));
  }

  return { ...outcome, tone: inferToneFromSettlement(settlement) };
};

const hasNegativeSettlement = (settlement: string) => /[金钱流量声望理智]\s*-\s*\d/.test(settlement);

const inferToneFromSettlement = (settlement: string): Tone => {
  const hasNegative = hasNegativeSettlement(settlement);
  const hasPositive = /[金钱流量声望理智]\s*\+\s*\d/.test(settlement);
  const hasStatusChange = Object.keys(STATUS_NAME_TO_ID).some((name) => settlement.includes(name));

  if (hasStatusChange) {
    return 'special';
  }

  if (hasNegative && !hasPositive) {
    return 'bad';
  }

  if (hasPositive && !hasNegative) {
    return 'good';
  }

  return hasNegative ? 'special' : 'neutral';
};

type RawEventRow = {
  name: string;
  action: string;
  tier: 'A' | 'B' | 'C';
  probability?: number | string;
  condition?: (state: GameState) => boolean;
  once?: boolean;
  options?: string;
  settlement: string;
  description: string;
  optionDescription?: string;
};

const makeEventOptions = (
  optionText: string | undefined,
  settlementText: string,
  optionDescriptionText: string | undefined,
) => {
  const labels = splitTableCell(optionText ?? '');

  if (!labels.length) {
    return undefined;
  }

  const settlements = splitTableCell(settlementText);
  const descriptions = splitTableCell(optionDescriptionText ?? '');

  return labels.map((label, index) => {
    const settlement = settlements[index] ?? '无';
    const optionDescription = descriptions[index] ?? label;

    return {
      id: OPTION_ID_BY_LABEL[label] ?? `option${index + 1}`,
      label,
      description: optionDescription,
      settlementDescription: optionDescription,
      getOutcome: (context: ResolutionContext) =>
        createOutcomeFromSettlement(settlement, context),
    };
  });
};

const makeEvent = (row: RawEventRow): EventConfig => {
  const options = makeEventOptions(row.options, row.settlement, row.optionDescription);
  const baseEvent = {
    id: EVENT_ID_BY_NAME[row.name] ?? row.name,
    title: row.name,
    description: row.description || FALLBACK_DESCRIPTIONS[row.name] || row.name,
    imageLabel: imageLabelFor(row.name),
    tier: row.tier,
    action: normalizeAction(row.action),
    probability: row.probability === undefined ? undefined : parseProbability(row.probability),
    once: row.once,
    isNegative: hasNegativeSettlement(row.settlement) || row.name === '竹篮打水',
    tone: inferToneFromSettlement(row.settlement),
    condition: row.condition ?? (() => true),
  } satisfies Omit<EventConfig, 'options' | 'getImmediateOutcome'>;

  if (options) {
    return {
      ...baseEvent,
      options,
    };
  }

  return {
    ...baseEvent,
    getImmediateOutcome: (context) => createOutcomeFromSettlement(row.settlement, context),
  };
};

export const ACTIONS: ActionConfig[] = [
  {
    id: 'surf',
    name: '网上冲浪',
    description: '去赛博海面漂一圈，搏一搏热评和奇怪知识。',
    baseDelta: { traffic: 1 },
    accent: 'mint',
    enabled: () => ({ available: true }),
  },
  {
    id: 'work',
    name: '加班打工',
    description: '老老实实赚米，但理智条会跟着抖两下。',
    baseDelta: { money: 2, sanity: -1 },
    accent: 'amber',
    enabled: (state) => {
      if (hasStatus(state, 'oldHand') && state.round % 2 === 0) {
        return {
          available: false,
          reason: '老油条只在单数周打卡摸鱼，偶数周不接这个活。',
        };
      }

      return { available: true };
    },
  },
  {
    id: 'stream',
    name: '直播整活',
    description: '打开镜头搏流量，可能出圈，也可能出事。',
    baseDelta: { traffic: 1, reputation: 1 },
    accent: 'pink',
    enabled: (state) =>
      hasItem(state, 'phoneStand')
        ? { available: true }
        : {
            available: false,
            reason: '先去商店买个手机支架，直播业务才能开张。',
          },
  },
];

export const STATUSES: StatusConfig[] = [
  {
    id: 'oldHand',
    name: '老油条',
    summary: '只在单数周打工，且打工不掉理智。',
  },
  {
    id: 'professionalPal',
    name: '专业帕鲁',
    summary: '打工额外 +1 金钱，且不掉理智。',
  },
  {
    id: 'shortTermEmperor',
    name: '短工皇帝',
    summary: '加班打工不掉理智。',
  },
  {
    id: 'cyberMonk',
    name: '赛博和尚',
    summary: '冲浪负面事件少掉 1 点理智。',
  },
  {
    id: 'overtimeManager',
    name: '班味主理人',
    summary: '打工时有 25% 概率额外 +1 理智。',
  },
  {
    id: 'screwImmortal',
    name: '打螺丝仙人',
    summary: '加班打工不掉理智，并有 25% 概率额外 +1 流量。',
  },
  {
    id: 'fragileWorker',
    name: '脆皮打工人',
    summary: '打工时有 20% 概率触发老板工伤赔偿，金钱 +3。',
  },
  {
    id: 'softPersimmon',
    name: '软柿子',
    summary: '所有负面数值有 25% 概率被抵消。',
  },
  {
    id: 'fanCrystal',
    name: '饭圈结晶体',
    summary: '直播事件额外 +1 流量，负面直播额外 -1 声望。',
  },
];

export const ITEMS: ItemConfig[] = [
  {
    id: 'phoneStand',
    name: '手机支架',
    price: 1,
    unique: true,
    summary: '解锁直播的基础选项。',
    unlockText: '无前置',
    effectText: '购买后可使用“直播整活”。',
    description:
      '赛博乞讨的第一步，梦想起航的支点，买下它，你半只脚就踏入了网红圈。',
    purchasable: (state) =>
      hasItem(state, 'phoneStand')
        ? { available: false, reason: '已经有支架了，不用再叠一个。' }
        : { available: true },
  },
  {
    id: 'studioUpgrade',
    name: '场地升级',
    price: 2,
    unique: true,
    summary: '直播时有 25% 概率额外 +1 流量。',
    unlockText: '需要手机支架',
    effectText: '直播时有 25% 概率额外 +1 流量。',
    description:
      '告别城中村8平米漏水出租屋背景，贴上RGB灯带，给观众一点小小的视觉震撼。',
    purchasable: (state) => {
      if (!hasItem(state, 'phoneStand')) {
        return { available: false, reason: '先把直播设备搭起来。' };
      }

      if (hasItem(state, 'studioUpgrade')) {
        return { available: false, reason: '场地已经升级过了。' };
      }

      return { available: true };
    },
  },
  {
    id: 'editingTeam',
    name: '剪辑团队',
    price: 4,
    unique: true,
    summary: '直播时有 25% 概率额外 +1 流量。',
    unlockText: '需要场地升级',
    effectText: '直播时有 25% 概率额外 +1 流量。',
    description:
      '专业的事交给专业的帕鲁去做！你只负责在镜头前发疯，他们负责把你剪成神明。',
    purchasable: (state) => {
      if (!hasItem(state, 'studioUpgrade')) {
        return { available: false, reason: '先把直播间收拾得能见人。' };
      }

      if (hasItem(state, 'editingTeam')) {
        return { available: false, reason: '团队已经在岗了。' };
      }

      return { available: true };
    },
  },
  {
    id: 'boostPack',
    name: '推流流量包',
    price: 2,
    unique: false,
    summary: '买下就立即 +1 流量。',
    unlockText: '需要手机支架',
    effectText: '买下后立即 +1 流量。',
    description: '资本的力量！不装了，我摊牌了，我的数据都是花钱刷出来的！',
    purchasable: (state) =>
      hasItem(state, 'phoneStand')
        ? { available: true }
        : { available: false, reason: '先把直播入口解锁，再考虑投流。' },
    onPurchase: () => ({
      delta: { traffic: 1 },
      notes: ['买量成功，首页推荐页对你眨了眨眼。'],
    }),
  },
  {
    id: 'woodenFish',
    name: '电子木鱼',
    price: 1,
    unique: true,
    summary: '每逢 5 的倍数周，额外 +1 理智。',
    unlockText: '无前置',
    effectText: '每逢 5 的倍数周额外 +1 理智。',
    description:
      '敲一下功德+1，赛博时代的赎罪券。佛祖不知道听没听到，反正你的血压是降下来了。',
    purchasable: (state) =>
      hasItem(state, 'woodenFish')
        ? { available: false, reason: '功德已经在后台挂着了。' }
        : { available: true },
  },
  {
    id: 'eCigarette',
    name: '电子香烟',
    price: 2,
    unique: true,
    summary: '每逢 4 的倍数周，额外 +1 理智。',
    unlockText: '无前置',
    effectText: '每逢 4 的倍数周额外 +1 理智。',
    description:
      '纯真男孩的赛博吐息，一眼鉴定为锐刻五代。吸进的是科技狠活，吐出的是雪山与动物朋友，抽完眼神瞬间清澈愚蠢。',
    purchasable: (state) =>
      hasItem(state, 'eCigarette')
        ? { available: false, reason: '再抽就要电子肺了。' }
        : { available: true },
  },
  {
    id: 'huazi',
    name: '华子',
    price: 3,
    unique: true,
    summary: '每逢 3 的倍数周，额外 +1 理智。',
    unlockText: '无前置',
    effectText: '每逢 3 的倍数周额外 +1 理智。',
    description:
      '养成系男团顶流同款。点燃它，享受成年人的放纵。温馨提示：千万别在室内餐厅抽，否则分分钟喜提热搜第一和全网鞠躬道歉。',
    purchasable: (state) =>
      hasItem(state, 'huazi')
        ? { available: false, reason: '再抽库存就清空了。' }
        : { available: true },
  },
  {
    id: 'melatonin',
    name: '褪黑素软糖',
    price: 1,
    unique: false,
    summary: '可在行动区使用，跳过一回合并 +2 理智。',
    unlockText: '无前置',
    effectText: '行动区使用后跳过 1 回合并 +2 理智。',
    description:
      '只要睡得够沉，赛博空间的喧嚣就追不上你。代价是你的账号可能长草，完美错过一个亿的流量热点。',
    purchasable: () => ({ available: true }),
  },
  {
    id: 'capitalBook',
    name: '《资本论》精装版',
    price: 1,
    unique: true,
    summary: '打工时有 25% 概率额外 +1 理智。',
    unlockText: '无前置',
    effectText: '打工时有 25% 概率额外 +1 理智。',
    description:
      '把它高高供在工位上。每当老板试图给你洗脑或者画饼时，你就翻开它看两眼。物理防御资本家PUA的究极圣物。',
    purchasable: (state) =>
      hasItem(state, 'capitalBook')
        ? { available: false, reason: '书已经摆在工位上镇宅了。' }
        : { available: true },
  },
  {
    id: 'kingVest',
    name: '王的背心',
    price: 2,
    unique: true,
    summary: '直播和打工时有 50% 概率额外 +1 流量。',
    unlockText: '无前置',
    effectText: '直播和打工时有 50% 概率额外 +1 流量。',
    description:
      '传说中XO第13位隐藏成员“King”的专属战袍。穿上它，你将化身互联网集体幻觉里的幽灵顶流，全网都有你的传说。',
    purchasable: (state) =>
      hasItem(state, 'kingVest')
        ? { available: false, reason: '王的背心已经穿在身上了。' }
        : { available: true },
  },
  {
    id: 'waterArmy',
    name: '水军机器人',
    price: 3,
    unique: true,
    summary: '网上冲浪时额外 +1 理智。',
    unlockText: '无前置',
    effectText: '网上冲浪时额外 +1 理智。',
    description:
      '你的赛博虎符，一键召唤十万阴兵控评带节奏。在这个草台班子互联网，谁掌握了算力，谁就掌握了话语权。',
    purchasable: (state) =>
      hasItem(state, 'waterArmy')
        ? { available: false, reason: '水军机器人已经接管评论区了。' }
        : { available: true },
  },
];

const guaranteedEventRows: RawEventRow[] = [
  {
    name: '老板开源节流',
    action: '加班打工',
    tier: 'A',
    once: true,
    condition: (state) => state.counters.actionCounts.work >= 3,
    options: '另请高明\n/狗屁膏药',
    settlement: '金钱+1，理智+1\n/老油条',
    description: '降本增效的大刀挥向了你。是拿N+1潇洒跑路，还是死皮赖脸当老油条苟着？',
    optionDescription:
      '拿上N+1赔偿金，走出公司大门的那一刻，感觉天是蓝的，风是甜的，连路边的共享单车都在为你鸣笛。\n/只要你不尴尬，尴尬的就是HR。哪怕降薪你也要赖在这里，老板的皮鞋就是你的磨牙棒，主打一个死缠烂打。',
  },
  {
    name: '升职加薪',
    action: '加班打工',
    tier: 'A',
    once: true,
    condition: (state) =>
      hasStatus(state, 'oldHand') && state.stats.sanity >= 10 && state.counters.actionCounts.work >= 5,
    settlement: '得力助手\n失去老油条',
    description: '恭喜你从初级牛马进化为高级帕鲁！你的薪水涨了，但你的头发更少了。',
  },
  {
    name: '评论区团建',
    action: '网上冲浪',
    tier: 'A',
    once: true,
    condition: (state) => state.stats.traffic === 6 && state.stats.reputation === 3,
    options: '下场互动\n/点赞走人',
    settlement: '流量+2，声望+1，理智-1\n/声望+1',
    description: '你的评论区成了乐子人的聚集地。是亲自下场一起发癫，还是高冷地点个赞装深沉？',
    optionDescription:
      '亲自披挂上阵，与乐子人们打成一片。你发的每一个表情包都精准踩在网友的笑点上，评论区充满了快活的气息。\n/保持高冷人设，深藏功与名。你那矜持的一点，仿佛在说：朕已阅，尔等退下吧。',
  },
  {
    name: '黑料考古',
    action: '直播',
    tier: 'A',
    once: true,
    condition: (state) => state.stats.traffic === 10,
    options: '主动自嘲\n/律师函警告',
    settlement: '声望+1，声望+1， 理智-1\n/流量+2，声望-1， 理智-1',
    description: '互联网是有记忆的！你三年前非主流时期发在QQ空间里的“葬爱”语录被扒出来了！',
    optionDescription:
      '抢在黑粉前面把自己黑得体无完肤。只要你先说自己是小丑，别人就没办法再嘲笑你。\n/掏出那张带有红头公章的电子PDF，义正辞严地维护尊严。虽然大家都在笑，但你看起来确实很努力。',
  },
  {
    name: '网络沙包',
    action: '网上冲浪',
    tier: 'A',
    once: true,
    condition: (state) => state.counters.lineLossCount >= 2,
    settlement: '赛博和尚',
    description: '挨的骂多了，你的心肠变得和你在大润发杀了十年的鱼一样冷，免疫一切阴阳怪气。',
  },
  {
    name: '尸班淡了',
    action: '加班打工',
    tier: 'A',
    once: true,
    condition: (state) => state.counters.actionCounts.work >= 5 && state.stats.sanity <= 4,
    settlement: '班味主理人',
    description: '老板夸你最近眼里有光了，其实是你身上的班味已经腌入味，产生了化学反应。你闻了闻自己的袖口，叹了口气。',
  },
  {
    name: '雪糕刺客',
    action: '所有',
    tier: 'A',
    once: true,
    condition: (state) => state.stats.money >= 6,
    options: '咬牙买单\n/RNM退钱',
    settlement: '金钱-1，理智-1，软柿子\n/声望+1，流量+1',
    description: '在楼下便利店随手拿了一个其貌不扬的雪糕，扫码时直接被价格背刺。这就是传说中的赛博刺客吗？！年轻人被结结实实上了一课。',
    optionDescription:
      '即使内心在滴血，脸上也要保持礼貌的微笑。你颤抖着扫码，这一刻你买的不是雪糕，是年轻人最后的体面。\n/丢掉素质，拥抱自由！你大喊一声把雪糕放回冰柜，在店员惊愕的目光中，你感觉自己完成了一次赛博维权。',
  },
  {
    name: '积劳成疾',
    action: '加班打工',
    tier: 'A',
    once: true,
    condition: (state) => state.counters.actionCounts.work >= 8,
    settlement: '脆皮打工人',
    description: '你的身体素质已经退化到了随便伸个懒腰都能扭到脖子的地步。拿命换钱，主打一个富贵险中求。',
  },
];

const probabilityEventRows: RawEventRow[] = [
  {
    name: '老板奖金',
    action: '加班打工',
    tier: 'C',
    probability: 0.1,
    settlement: '金钱+1',
    description: '只要我滑得够快，资本的镰刀就永远割不到我，你已经掌握了带薪拉屎的最高境界。',
  },
  {
    name: '遇见贵人',
    action: '加班打工',
    tier: 'C',
    probability: 0.05,
    settlement: '流量+5',
    description: '',
  },
  {
    name: '奇怪的知识增加',
    action: '网上冲浪',
    tier: 'C',
    probability: 0.2,
    settlement: '理智+1',
    description: '刷到了《猪的交配时间长达30分钟》，虽然毫无卵用，但你的心情莫名其妙变好了。',
  },
  {
    name: '发表逆天言论',
    action: '网上冲浪',
    tier: 'C',
    probability: 0.2,
    settlement: '流量+1，声望-1',
    description: '你锐评“不给老板加班的员工是不完整的”，恭喜你，喜提全网网暴体验卡一张。',
  },
  {
    name: '发表热评',
    action: '网上冲浪',
    tier: 'C',
    probability: 0.2,
    settlement: '流量+1，声望+1',
    description: '一句“好活当赏”拿下了10万点赞，你那为数不多的幽默感终于被网友get到了一次。',
  },
  {
    name: '小丑表演',
    action: '网上冲浪',
    tier: 'C',
    probability: 0.2,
    settlement: '流量+2，理智-1',
    description: '强行整活最为致命，视频里你摔了个狗吃屎。网友笑裂了，你破防了。',
  },
  {
    name: '舌战群儒',
    action: '网上冲浪',
    tier: 'C',
    probability: 0.1,
    settlement: '理智+2',
    description: '键盘冒烟，战神附体！你以一己之力干碎了评论区三个极品黑子，通体舒泰！',
  },
  {
    name: '对线惜败',
    action: '网上冲浪',
    tier: 'C',
    probability: 0.1,
    settlement: '理智-1',
    description: '对方反手甩出一张你无法反驳的绿帽表情包，你气得浑身发抖，大半夜在床上打出一套军体拳。',
  },
  {
    name: '竹篮打水',
    action: '直播',
    tier: 'C',
    probability: 0.1,
    settlement: '无',
    description: '激情单口相声播了三小时，弹幕只有一条：“主播别播了，找个电子厂上班吧”。',
  },
  {
    name: '电子榨菜',
    action: '直播',
    tier: 'C',
    probability: 0.2,
    settlement: '流量+1，声望+1',
    description: '你的直播意外成为了打工人吃外卖时的最佳背景音，大家就喜欢看你这副半死不活的样子。',
  },
  {
    name: '口误热搜',
    action: '直播',
    tier: 'C',
    probability: 0.2,
    settlement: '流量+2，声望-1',
    description: '把“耗子尾汁”说成了“耗子果汁”，惨遭全网嘲笑+鬼畜连招，但黑红也是红啊！',
  },
  {
    name: '热点硬蹭',
    action: '直播',
    tier: 'C',
    probability: 0.2,
    settlement: '流量+1',
    description: '某顶流塌房，你连夜开播辣评，甚至还做了一个PPT，成功吃上了一口热乎的流量。',
  },
  {
    name: '感谢老板的火箭',
    action: '直播',
    tier: 'C',
    probability: 0.1,
    settlement: '金钱+2',
    description: '看到屏幕上闪过的特效，你一句“感谢榜一大哥”喊破了音，尊严在金钱面前不值一提。',
  },
  {
    name: '神人连麦',
    action: '直播',
    tier: 'C',
    probability: 0.1,
    settlement: '流量+2，声望+1',
    description: '连麦连到了一个比你还抽象的赛博精神病，你们俩跨服聊天，直接把直播间效果拉满。',
  },
];

const conditionalEventRows: RawEventRow[] = [
  {
    name: '人间蒸发',
    action: '加班打工',
    tier: 'B',
    probability: '30%',
    condition: (state) => state.stats.sanity <= 6,
    settlement: '75%翘班失败：金钱-1，理智-1；\n25%翘班成功：理智+1',
    description: '班味太重了！你决定发动“人间蒸发”忍术。被老板抓包就喜提批斗扣钱，遁术成功就白嫖带薪假期，玩的就是心跳。',
  },
  {
    name: '拼好饭股东大会',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => state.stats.money < 5,
    options: '拉人拼团\n/假装不饿',
    settlement: '金钱+1，声望-1\n/金钱+1，理智-1',
    description: '余额见底，群里惊现“拼好饭差一人成团”。这不再是顿午饭，这是底层牛马抱团取暖的A轮融资。',
    optionDescription:
      '成功拉满拼团，吃着宛如预制菜边角料的盖饭，大家直呼牛马好兄弟。\n/嘴硬“我在轻断食”，狂炫茶水间免费饼干。肚子饱了，但尊严饿瘦了。',
  },
  {
    name: '带薪如厕挑战',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'oldHand'),
    settlement: '50%理智+2；\n50%理智-1；',
    description: '只要坑蹲得够久，你就能把老板的钱赚回来！你带着充电宝和纸巾步入厕所，准备开启一场带薪拉屎的极限拉扯。',
  },
  {
    name: '00后革命失败',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'oldHand'),
    settlement: '声望+1',
    description: '新来的00后准点下班，老板气得脸都绿了。你深知这帮职场雏鸟缺的不是业务培训，而是正宗的牛马洗礼。',
  },
  {
    name: '草台班子临时CEO',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'oldHand') && state.stats.reputation >= 3,
    options: '接管会议\n/当场拆台',
    settlement: '声望+1\n/声望+2，金钱-1',
    description: '开会半小时，目标没定、排期没有、没人领锅。空气突然安静，草台班子的隐形王冠正在向你这只老油条缓缓降临。',
    optionDescription:
      '你用一堆“赋能、抓手、闭环”的高级黑话强行控场，全屋人听得直点头。\n/你两手一摊：“这破项目就是薛定谔的KPI”，老板破大防，同事暗暗给你点赞。',
  },
  {
    name: '赛博包工头',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'professionalPal'),
    settlement: '75%理智+2；\n25%理智-1，金钱-1；',
    description: '你决定引入AI流水线代写日报和周报。看着屏幕上自动生成的“底层逻辑”和“颗粒度”，你感觉自己成了赛博包工头。',
  },
  {
    name: '牛马倒模',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'professionalPal'),
    options: '赛博投毒\n/以身饲机',
    settlement: '理智+2，声望-1\n/声望+2，理智-2',
    description: '老板命你将经验写成文档“沉淀方法论”。你一眼看穿这是要抽干你的灵魂去训练AI，好在下个月把你物理裁员。',
    optionDescription:
      '你在文档里狂塞抽象废话和错误代码，AI学完当场赛博脑瘫。\n/你把自己榨干，倾囊相授，亲手打造了即将干掉自己的完美机械降神。',
  },
  {
    name: '牛马赋能',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'professionalPal') && state.stats.reputation >= 5,
    options: '传授糊弄学\n/倾囊相授',
    settlement: '理智+1，声望+1\n/声望+2',
    description: '你一人单防三个项目组没猝死，被老板视为医学奇迹。钦点你给实习生开“赋能会”，要把帕鲁精神发扬光大。',
    optionDescription:
      '你表面讲奋斗背地教摸鱼，顺手把自己的活全甩给了这帮大学生。\n/你声泪俱下演讲《如何把公司当家》，新人们热血沸腾，你良心隐隐作痛。',
  },
  {
    name: '黄袍加身',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'shortTermEmperor'),
    settlement: '理智+1',
    description: '打短工的尽头是送外卖。你穿上那件明黄色的战袍，感觉不仅防风防雨，甚至随时能触发“兵王归来”的隐藏剧情。',
  },
  {
    name: '灵活就业Vlog',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'shortTermEmperor'),
    options: '拍成系列\n/只拿现钱',
    settlement: '声望+1\n/金钱+1',
    description: '上午发传单，下午当保安，你活成了一台随机职业模拟器。要不要支个手机开播，把苦难变现赚一波同情流量？',
    optionDescription:
      '爆肝剪辑出《牛马的一天》，流量恰饱，但被网友锐评“搁这体验生活呢”。\n/懒得整花里胡哨的，干完活拿钱走人。赛博网络太虚，手里红票子是真。',
  },
  {
    name: '螺丝界科目三',
    action: '加班打工',
    tier: 'B',
    probability: '30%',
    condition: (state) => hasStatus(state, 'shortTermEmperor') && !hasStatus(state, 'screwImmortal'),
    options: '见好就收\n/精益求精',
    settlement: '流量+1，声望+1\n/失去短工皇帝，获得打螺丝仙人',
    description: '连干十小时后，你在流水线旁抽搐般跳起诡异舞蹈被拍上网。网友辣评：“别人跳叫科目三，你这是牛马渡劫。”',
    optionDescription:
      '见好就收赶紧下播，深藏功与名，你的背影成为了厂区深夜的抽象传说。\n/舞蹈与流水线完美融合，你打通任督二脉，原地飞升成为传说中的“打螺丝仙人”。',
  },
  {
    name: '流水线剪辑',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'screwImmortal'),
    settlement: '流量+1，声望+1',
    description: '工友偷偷录下你残影般的手速，配上动感BGM做成鬼畜发到破站。你在完全不知情的情况下成了赛博音游男主。',
  },
  {
    name: '碳基之光',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'screwImmortal'),
    options: '单杀机械臂\n/惜败犹荣',
    settlement: '声望+2\n/声望+1，流量+1',
    description: '车间运来一台工业机械臂，线长狂笑宣布牛马们要下岗了。身为打螺丝仙人，你决定为全体碳基生物争一口气。',
    optionDescription:
      '双手化作火星残影，硬生生把机械臂干到CPU过热死机！手快废了，尊严保住了。\n/你疯狂输出到手抽筋最终惜败。虽输了产能，但赢得了全厂牛马的瑞思拜。',
  },
  {
    name: '开宗立派',
    action: '加班打工',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasStatus(state, 'screwImmortal') && state.stats.traffic >= 8,
    options: '收徒割韭菜\n/唯手熟尔',
    settlement: '金钱+1，声望+1\n/理智+1，声望+1',
    description: '你的手速惊动了整个开发区，一群厂弟跪求你传授这套“闪电五连鞭螺丝法”。是借机搞知识付费，还是保持仙人逼格？',
    optionDescription:
      '反手建群收99元进群费，成功在流水线搞起知识付费，老板看了直呼内行。\n/你吐出一个烟圈，留下一句“无他，唯手熟尔”潇洒离去，深藏功与名。',
  },
  {
    name: '仙人指路',
    action: '直播',
    tier: 'B',
    probability: '5%',
    once: true,
    condition: (state) => !hasItem(state, 'studioUpgrade') && !hasItem(state, 'editingTeam'),
    settlement: '流量+2',
    description: '评论区惊现神秘大佬指点迷津：“按我说的整，明天你必火”。你半信半疑照猫画虎，结果真的一脚踩中了流量密码。',
  },
  {
    name: '4K高清处刑',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'studioUpgrade'),
    settlement: '流量-1，理智+2',
    description: '砸锅卖铁升级了4K超清镜头，一开播却忘开十级美颜。你那长期熬夜的黑眼圈和月球表面般的毛孔，给榜一大哥造成了成吨伤害。',
  },
  {
    name: '升降桌叛乱',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'studioUpgrade'),
    settlement: '流量+1',
    description: '全款拿下人体工学升降桌，直播高潮时系统死机，桌面自动降到脚踝。你从霸气主播一秒变成只露天灵盖的赛博土拨鼠。',
  },
  {
    name: '物种危机',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'studioUpgrade'),
    options: '物理自证\n/伪人教学',
    settlement: '流量+1，理智+1\n/流量+2，理智-1',
    description: '背景太高大上，弹幕狂刷“这是绿幕抠像吧”“主播绝壁是AI数字人”。你作为一个大活人的碳基身份遭到了史诗级质疑。',
    optionDescription:
      '你一怒之下重拳锤墙，劣质墙皮掉了一地，大家终于信你是真人，但你也破防了。\n/你干脆不装了，双眼失焦嘴角咧到耳根，表演了一段诡异的“伪人广播体操”。弹幕吓得狂刷护体，直呼遇到真东西了。',
  },
  {
    name: '王座沉没事件',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'studioUpgrade') && state.stats.traffic >= 8,
    options: '顺势土遁\n/战术马步',
    settlement: '流量+2\n/流量+1，理智+2',
    description: '九块九包邮的RGB电竞椅气压杆突然漏气。在数万水友注视下，伴随悠长的“哧——”声，你在镜头前缓缓下沉，犹如单头地鼠。',
    optionDescription:
      '你干脆只留个后脑勺解说，弹幕狂欢“主播被打入地牢”，流量逆势上扬。\n/你死要面子，半蹲扎马步强撑原高度。直播一小时，下播双腿抖得像缝纫机。',
  },
  {
    name: '镰刀成精',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'editingTeam'),
    settlement: '金钱+2，声望+1',
    description: '团队把你平时吹牛的黑话包装成《认知觉醒与底层变现》网课，狠标1999元。寒光闪闪的赛博镰刀已就位，就等家人们闭眼入了。',
  },
  {
    name: '9块9赛博神油上车',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'editingTeam'),
    settlement: '金钱+3；25%流量-1，声望-1',
    description: '团队递来一瓶包装写满黑科技的“赛博神油”，成本比玩具还低。只要你抛弃良心大喊“家人们上车”，今天就能吃顿好的。',
  },
  {
    name: '哪里贵了',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) => hasItem(state, 'editingTeam'),
    options: '灵魂拷问\n/共情牛马',
    settlement: '金钱+3，声望-2\n/声望+2，金钱-1',
    description: '卖79元一根的智商税眉笔，弹幕抱怨太贵。看着高达80%的佣金，你内心深处竟对这群底层的“穷哥们”升起一丝嫌弃。',
    optionDescription:
      '你翻白眼狂喷：“找找自己原因，工资涨没涨？”瞬间引爆全网，喜提史诗级网暴。\n/你叹了口气：“嫌贵就不买，打工人都不容易。”品牌方暴怒扣钱，但穷哥们夸你良心。',
  },
  {
    name: '超话禁卫军出征',
    action: '直播',
    tier: 'B',
    probability: '10%',
    condition: (state) =>
      hasItem(state, 'editingTeam') && state.stats.traffic >= 10 && !hasStatus(state, 'fanCrystal'),
    options: '光速切割\n/提纯粉丝',
    settlement: '流量-3，声望+2，理智+2\n/饭圈结晶体；流量+3，声望-2，理智-1',
    description: '你的“魔怔粉”开始四处巡逻，谁敢批评你一句立刻迎战小作文和开盒警告。好好的乐子直播间，硬是搞成了饭圈修罗场。',
    optionDescription:
      '你果断发小作文切割饭圈：“别搁这搞粉圈那套！”吓跑了魔怔粉，换来了难得的清净。\n/你果断提纯，煽动粉丝出征护主。虽然路人缘烂透了，但手握疯粉结晶，赛博江山稳固。',
  },
  {
    name: '老哥私信点拨',
    action: '网上冲浪',
    tier: 'B',
    probability: '40%',
    condition: (state) => state.stats.sanity <= 6,
    options: '听劝\n/继续冲',
    settlement: '理智+2\n/流量+2，理智-1',
    description: '对线正酣，一位头像是风景照的“AAA建材王总”私信你：“小老弟，网上都是虚的，人情世故才是真，早点睡吧。”',
    optionDescription:
      '看着王总的私信，你恍然大悟。关掉对线窗口，点起一根赛博香烟，向成熟中年人迈进了一大步。\n/“少搁这装理中客！”你反手拉黑王总，化身祖安钢琴家继续高强度对喷，打字快出火星子。',
  },
  {
    name: '楚门的朋友圈',
    action: '网上冲浪',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasItem(state, 'waterArmy'),
    options: '沉浸虚荣\n/认清现实',
    settlement: '流量+3，理智-1\n/理智+3，流量-1',
    description: '半夜发矫情动态，用脚本给自己刷了三千个赞和“宝你好美”。看着这泼天的赛博拥戴，你隐约觉得自己真是个万人迷。',
    optionDescription:
      '你彻底迷失在僵尸粉的吹捧中，连夜网购大墨镜装顶流，脑干彻底萎缩。\n/你啪啪给自己两耳光：清醒点！全是假粉！关掉手机，面对空荡荡的房间，又是一条可怜的牛马。',
  },
  {
    name: '赛博斗蛐蛐',
    action: '网上冲浪',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasItem(state, 'waterArmy'),
    options: '卖票观战\n/燃烧显卡',
    settlement: '金钱+1，流量+1\n/金钱-1，理智+2，流量+1',
    description: '派水军去死对头那里控评，惊觉对面也是机器人护体。两拨AI开始互相复读机，满屏乱码互喷了足足三万层楼。',
    optionDescription:
      '乐子人附体！你直接开播解说“AI对骂锦标赛”，节目效果出奇好，狠狠爆了一波金币。\n/头脑一热，怒充五百块网费包下服务器加大算力！机器人是赢了，看着干瘪的钱包陷入沉思。',
  },
  {
    name: '粉圈雇佣兵',
    action: '网上冲浪',
    tier: 'B',
    probability: '20%',
    condition: (state) => hasItem(state, 'waterArmy'),
    options: '接单搞钱\n/两头通吃',
    settlement: '金钱+1，声望+1\n/金钱+2',
    description: '你手里的机器人大军被当红流量粉头盯上，出重金雇你去把对家超话扬了。你瞬间接单，化身互联网赛博雇佣军。',
    optionDescription:
      '看在金主的份上，你按动核按钮，机器大军寸草不生，钱赚爽了，良心却没了。\n/你反手把雇佣计划截图发给对家索要封口费。吃了原告吃被告，你就是赛博华尔街之狼！',
  },
  {
    name: '维新事变',
    action: '所有',
    tier: 'B',
    probability: '10%',
    condition: (state) => state.stats.traffic > 6 && hasItem(state, 'eCigarette'),
    settlement: '流量+1，声望-1',
    description: '叼着锐刻5代，吐出雪山薄荷味的叹息。你眼神清澈愚蠢，呼唤着动物朋友，这波“一眼纯真”的做派气坏了传统网民。',
  },
  {
    name: '保守派革命',
    action: '所有',
    tier: 'B',
    probability: '10%',
    condition: (state) => state.stats.traffic > 6 && hasItem(state, 'huazi'),
    settlement: '流量+1，声望-1',
    description: '在室内点燃一根华子，深吸出顶流男团的沧桑。你无视禁烟规定的保守派作风引爆热搜，全网都在等你鞠躬道歉。',
  },
];

export const EVENTS: EventConfig[] = [
  ...guaranteedEventRows,
  ...probabilityEventRows,
  ...conditionalEventRows,
].map(makeEvent);

export const ENDINGS: EndingConfig[] = [
  {
    id: 'daoBreak',
    name: '道心破碎',
    title: 'Game Over',
    accent: '#ff6b87',
    priority: 999,
    description:
      '你本来只是想在赛博空间整点乐子，最后却被互联网先整了。医生说你的症状很罕见，建议保守治疗。',
    condition: (state) => state.stats.sanity <= 0,
  },
  {
    id: 'topIdol',
    name: '顶流圣体',
    title: '完美结局',
    accent: '#ffe36c',
    priority: 100,
    description:
      '名利双收，口碑爆棚。你已经是互联网的王，连你的狗都顺手接了两个代言。',
    condition: (state) =>
      state.stats.traffic >= 20 &&
      state.stats.money >= 12 &&
      state.stats.reputation >= 10,
  },
  {
    id: 'darkCommerce',
    name: '黑红带货机',
    title: '魔道结局',
    accent: '#ff7b6b',
    priority: 95,
    description:
      '每天被几万人骂着买你的 9.9 包邮工业垃圾。你擦干眼泪，看着 GMV 忍不住嘴角上扬。',
    condition: (state) =>
      state.stats.traffic >= 20 &&
      state.stats.money >= 20 &&
      state.stats.reputation <= -6,
  },
  {
    id: 'hiddenSage',
    name: '人间清醒',
    title: '隐士结局',
    accent: '#98f4d3',
    priority: 90,
    description:
      '赚够了米，保住了脑子，也留下了好名声。你关掉直播间，去鹤岗买房，只留下传说。',
    condition: (state) =>
      state.stats.sanity >= 12 &&
      state.stats.money >= 12 &&
      state.stats.reputation >= 6 &&
      state.stats.traffic < 6,
  },
  {
    id: 'cyberCelebrity',
    name: '赛博名人',
    title: '主流爆红',
    accent: '#79d0ff',
    priority: 80,
    description:
      '你终于从那个天天发抽象段子的人，变成了大家都知道的 KOL。',
    condition: (state) =>
      state.stats.traffic >= 20 && state.stats.reputation >= 10,
  },
  {
    id: 'blackRedFame',
    name: '黑红也是红',
    title: '争议出圈',
    accent: '#ff8db1',
    priority: 75,
    description:
      '全网都在骂你，但全网都在看你。你不一定被喜欢，但一定被看见了。',
    condition: (state) =>
      state.stats.traffic >= 20 && state.stats.reputation <= -6,
  },
  {
    id: 'salesKing',
    name: '带货王',
    title: '变现成功',
    accent: '#ffc86b',
    priority: 70,
    description:
      '你可能没那么体面，但银行卡里的数字很体面。直播间里那句“三二一上车”你已经喊得滚瓜烂熟。',
    condition: (state) =>
      state.stats.money >= 20 && state.stats.traffic >= 10,
  },
  {
    id: 'dignifiedLogout',
    name: '体面退网',
    title: '退出江湖',
    accent: '#a7ffd4',
    priority: 65,
    description:
      '流量狂欢只是过眼云烟。你注销账号回归现实生活，反而成了最像赢家的那个人。',
    condition: (state) =>
      state.stats.sanity >= 12 &&
      state.stats.reputation >= 6 &&
      state.stats.traffic < 6,
  },
  {
    id: 'steadyLanding',
    name: '电子上岸人',
    title: '稳稳落地',
    accent: '#9ee7ff',
    priority: 60,
    description:
      '你没有成为明星，但手里有粮，心里不慌。在这个疯狂时代，活下来而且没疯就已经赢很多人。',
    condition: (state) =>
      state.stats.money >= 12 &&
      state.stats.sanity >= 6 &&
      state.stats.traffic < 10,
  },
  {
    id: 'quietJoy',
    name: '无人在意的幸福',
    title: '平静日常',
    accent: '#d1ff8f',
    priority: 55,
    description:
      '没钱没流量没出圈，但每个周末都能睡到自然醒。没有资本剥削，也没有网友网暴，这样也挺好。',
    condition: (state) =>
      state.stats.sanity >= 10 &&
      state.stats.money < 6 &&
      state.stats.traffic < 6,
  },
  {
    id: 'grassStageSurvivor',
    name: '草台幸存者',
    title: '普通结局',
    accent: '#c9d4ff',
    priority: 1,
    description:
      '你没有大红大紫，也没有彻底坠毁，只是在草台班子的互联网里留下了一串还算顽强的脚印。',
    condition: () => true,
  },
];

export const getEventById = (eventId: string) =>
  EVENTS.find((event) => event.id === eventId);

export const getItemById = (itemId: ItemId) =>
  ITEMS.find((item) => item.id === itemId);

export const getEndingById = (endingId: string) =>
  ENDINGS.find((ending) => ending.id === endingId);
