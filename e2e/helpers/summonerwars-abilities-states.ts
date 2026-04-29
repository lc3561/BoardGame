/**
 * SummonerWars 技能 E2E 测试 - 状态构建工具
 *
 * 包含所有技能测试所需的状态注入辅助函数和状态准备函数。
 * 从主测试文件拆分以遵守单文件 1000 行限制。
 */

import { createDeckByFactionId } from '../../src/games/summonerwars/config/factions';
import { BOARD_COLS, BOARD_ROWS, HAND_SIZE } from '../../src/games/summonerwars/domain/helpers';
import { generateInstanceId, resetInstanceCounter } from '../../src/games/summonerwars/domain/utils';
import { cloneState } from './summonerwars';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 动态 JSON 状态结构
type CoreState = any;

// ============================================================================
// 状态初始化
// ============================================================================

/** 根据阵营 ID 初始化完整的 SW 核心状态（棋盘 + 玩家） */
export const initializeSummonerWarsCore = (coreState: CoreState, factions: Record<string, string>) => {
  resetInstanceCounter();
  const next = cloneState(coreState);
  const board = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({})),
  ) as CoreState[][];
  const players = { ...next.players };

  (['0', '1'] as const).forEach((pid) => {
    const factionId = factions[pid];
    if (!factionId) return;

    const deckData = createDeckByFactionId(factionId as Parameters<typeof createDeckByFactionId>[0]);
    const player = { ...players[pid] };
    const isBottom = pid === '0';
    const toArrayCoord = (pos: { row: number; col: number }) =>
      isBottom
        ? { row: BOARD_ROWS - 1 - pos.row, col: pos.col }
        : { row: pos.row, col: BOARD_COLS - 1 - pos.col };

    const summonerCard = { ...deckData.summoner, id: `${deckData.summoner.id}-${pid}` };
    player.summonerId = summonerCard.id;
    const summonerPos = toArrayCoord(deckData.summonerPosition);
    board[summonerPos.row][summonerPos.col].unit = {
      instanceId: generateInstanceId(summonerCard.id),
      cardId: summonerCard.id,
      card: summonerCard,
      owner: pid,
      position: summonerPos,
      damage: 0,
      boosts: 0,
      hasMoved: false,
      hasAttacked: false,
    };

    const gateCard = { ...deckData.startingGate, id: `${deckData.startingGate.id}-${pid}` };
    const gatePos = toArrayCoord(deckData.startingGatePosition);
    board[gatePos.row][gatePos.col].structure = {
      cardId: gateCard.id,
      card: gateCard,
      owner: pid,
      position: gatePos,
      damage: 0,
    };

    for (const startUnit of deckData.startingUnits) {
      const unitCard = { ...startUnit.unit, id: `${startUnit.unit.id}-${pid}` };
      const unitPos = toArrayCoord(startUnit.position);
      board[unitPos.row][unitPos.col].unit = {
        instanceId: generateInstanceId(unitCard.id),
        cardId: unitCard.id,
        card: unitCard,
        owner: pid,
        position: unitPos,
        damage: 0,
        boosts: 0,
        hasMoved: false,
        hasAttacked: false,
      };
    }

    const deckWithIds = deckData.deck.map((card, index) => ({
      ...card,
      id: `${card.id}-${pid}-${index}`,
    }));
    player.hand = deckWithIds.slice(0, HAND_SIZE);
    player.deck = deckWithIds.slice(HAND_SIZE);
    player.discard = [];
    player.activeEvents = [];
    player.moveCount = 0;
    player.attackCount = 0;
    player.hasAttackedEnemy = false;

    players[pid] = player;
  });

  next.board = board;
  next.players = players;
  return next;
};

/** 构建基础核心状态（necromancer vs paladin） */
export const buildBaseCoreState = (coreState: CoreState) => {
  const next = cloneState(coreState);
  next.hostStarted = true;
  next.selectedFactions = { '0': 'necromancer', '1': 'paladin' };
  next.readyPlayers = { '0': true, '1': true };
  return initializeSummonerWarsCore(next, next.selectedFactions);
};

// ============================================================================
// 状态注入辅助函数
// ============================================================================

/** 清空指定区域的单位和建筑 */
const clearArea = (board: CoreState[][], positions: { row: number; col: number }[]) => {
  for (const pos of positions) {
    if (board[pos.row]?.[pos.col]) {
      board[pos.row][pos.col] = { ...board[pos.row][pos.col], unit: undefined, structure: undefined };
    }
  }
};

/** 在指定位置放置单位 */
const placeUnit = (board: CoreState[][], pos: { row: number; col: number }, unit: CoreState) => {
  board[pos.row][pos.col] = {
    ...board[pos.row][pos.col],
    unit: { ...unit, position: { ...pos } },
  };
};

/** 创建单位数据 */
const makeUnit = (overrides: Record<string, CoreState>) => {
  const resolvedCardId = overrides.cardId ?? `test-${Date.now()}`;
  return {
    instanceId: overrides.instanceId ?? generateInstanceId(resolvedCardId),
    cardId: resolvedCardId,
    card: {
      id: resolvedCardId,
      name: overrides.name ?? '测试单位',
      cardType: 'unit',
      faction: overrides.faction ?? '堕落王国',
      cost: overrides.cost ?? 1,
      life: overrides.life ?? 2,
      strength: overrides.strength ?? 1,
      attackType: overrides.attackType ?? 'melee',
      unitClass: overrides.unitClass ?? 'common',
      abilities: overrides.abilities ?? [],
      spriteIndex: overrides.spriteIndex ?? 0,
      spriteAtlas: overrides.spriteAtlas ?? 'cards',
    },
    owner: overrides.owner ?? '0',
    position: overrides.position ?? { row: 0, col: 0 },
    damage: overrides.damage ?? 0,
    boosts: overrides.boosts ?? 0,
    charges: overrides.charges ?? 0,
    hasMoved: overrides.hasMoved ?? false,
    hasAttacked: overrides.hasAttacked ?? false,
  };
};

/** 创建手牌单位卡 */
const makeHandUnitCard = (id: string, name: string, overrides?: Record<string, CoreState>) => ({
  id,
  name,
  cardType: 'unit',
  faction: overrides?.faction ?? '先锋军团',
  cost: overrides?.cost ?? 1,
  life: overrides?.life ?? 3,
  strength: overrides?.strength ?? 1,
  attackType: overrides?.attackType ?? 'melee',
  unitClass: overrides?.unitClass ?? 'common',
  abilities: overrides?.abilities ?? [],
  spriteIndex: overrides?.spriteIndex ?? 0,
  spriteAtlas: overrides?.spriteAtlas ?? 'cards',
});

// ============================================================================
// 状态准备函数
// ============================================================================

/** 准备吸取生命 beforeAttack 测试状态 */
export const prepareLifeDrainBeforeAttackState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
  }

  const board = next.board;
  const attackerPos = { row: 5, col: 2 };
  const victimPos = { row: 4, col: 2 };
  const targetPos = { row: 5, col: 3 };
  clearArea(board, [attackerPos, victimPos, targetPos]);

  placeUnit(board, attackerPos, makeUnit({
    cardId: 'test-life-drainer', name: '吸取者', faction: '堕落王国',
    strength: 2, life: 8, attackType: 'melee', abilities: ['life_drain'], owner: '0',
  }));
  placeUnit(board, victimPos, makeUnit({
    cardId: 'test-life-victim', name: '牺牲目标',
    strength: 1, life: 1, attackType: 'melee', owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-life-enemy', name: '敌方目标',
    strength: 1, life: 3, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备圣光箭 beforeAttack 测试状态 */
export const prepareHolyArrowBeforeAttackState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
    player.hand = [
      makeHandUnitCard('holy-discard-1', '城塞骑士'),
      makeHandUnitCard('holy-discard-2', '城塞战士'),
      ...player.hand,
    ];
  }

  const board = next.board;
  const attackerPos = { row: 5, col: 2 };
  const targetPos = { row: 5, col: 3 };
  clearArea(board, [attackerPos, targetPos]);

  placeUnit(board, attackerPos, makeUnit({
    cardId: 'test-holy-archer', name: '雅各布', faction: '先锋军团',
    strength: 2, life: 7, attackType: 'ranged', abilities: ['holy_arrow'], owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-holy-enemy', name: '敌方目标',
    strength: 1, life: 4, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备治疗 beforeAttack 测试状态 */
export const prepareHealingBeforeAttackState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
    player.hand = [makeHandUnitCard('healing-discard', '治疗弃牌'), ...player.hand];
  }

  const board = next.board;
  const attackerPos = { row: 5, col: 2 };
  const allyPos = { row: 5, col: 3 };
  clearArea(board, [attackerPos, allyPos]);

  placeUnit(board, attackerPos, makeUnit({
    cardId: 'test-healing-priest', name: '圣殿牧师', faction: '先锋军团',
    strength: 2, life: 2, attackType: 'melee', abilities: ['healing'], owner: '0',
  }));
  placeUnit(board, allyPos, makeUnit({
    cardId: 'test-healing-ally', name: '受伤友军', faction: '先锋军团',
    strength: 1, life: 5, damage: 2, attackType: 'melee', owner: '0',
  }));

  return next;
};

/** 准备灵魂转移测试状态 */
export const prepareSoulTransferState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
  }

  const board = next.board;
  const archerPos = { row: 5, col: 2 };
  const targetPos = { row: 3, col: 2 };
  clearArea(board, [archerPos, targetPos]);

  placeUnit(board, archerPos, makeUnit({
    cardId: 'test-soul-archer', name: '亡灵弓箭手', faction: '堕落王国',
    strength: 6, life: 3, attackType: 'ranged', abilities: ['soul_transfer'], owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-enemy-weak', name: '弱小敌兵',
    strength: 1, life: 1, damage: 0, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备心灵操控事件测试状态 */
export const prepareMindControlEventState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'summon';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.magic = 10;
    player.summonerId = 'test-trickster-summoner';
    player.hand = [
      {
        id: 'trickster-mind-control', cardType: 'event', name: '心灵操控',
        eventType: 'legendary', cost: 1, playPhase: 'summon',
        effect: '选择召唤师2格内的敌方单位获得控制权。',
        isActive: false, deckSymbols: [],
      },
      ...player.hand,
    ];
  }

  const board = next.board;
  const summonerPos = { row: 6, col: 2 };
  const enemyPos1 = { row: 5, col: 2 };
  const enemyPos2 = { row: 4, col: 2 };
  clearArea(board, [summonerPos, enemyPos1, enemyPos2]);

  const tricksterSummoner = makeUnit({
    cardId: 'test-trickster-summoner', name: '泰珂露', faction: '欺心巫族',
    strength: 3, life: 12, attackType: 'ranged', unitClass: 'summoner',
    abilities: ['mind_capture'], owner: '0',
  });
  placeUnit(board, summonerPos, tricksterSummoner);
  placeUnit(board, enemyPos1, makeUnit({
    cardId: 'test-mind-control-target-1', name: '敌方目标一',
    strength: 1, life: 3, attackType: 'melee', owner: '1',
  }));
  placeUnit(board, enemyPos2, makeUnit({
    cardId: 'test-mind-control-target-2', name: '敌方目标二',
    strength: 1, life: 3, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备震慑事件测试状态 */
export const prepareStunEventState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'move';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.magic = 10;
    player.summonerId = 'test-trickster-summoner';
    player.hand = [
      {
        id: 'trickster-stun', cardType: 'event', name: '震慑',
        eventType: 'common', cost: 1, playPhase: 'move',
        effect: '推拉敌方单位并造成伤害。',
        isActive: false, deckSymbols: [],
      },
      ...player.hand,
    ];
  }

  const board = next.board;
  const summonerPos = { row: 6, col: 2 };
  const enemyPos = { row: 3, col: 2 };
  clearArea(board, [summonerPos, enemyPos]);

  placeUnit(board, summonerPos, makeUnit({
    cardId: 'test-trickster-summoner', name: '泰珂露', faction: '欺心巫族',
    strength: 3, life: 12, attackType: 'ranged', unitClass: 'summoner',
    abilities: ['mind_capture'], owner: '0',
  }));
  placeUnit(board, enemyPos, makeUnit({
    cardId: 'test-stun-target', name: '震慑目标',
    strength: 1, life: 4, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备催眠引诱事件测试状态 */
export const prepareHypnoticLureEventState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'summon';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.magic = 10;
    player.summonerId = 'test-trickster-summoner';
    player.hand = [
      {
        id: 'trickster-hypnotic-lure', cardType: 'event', name: '催眠引诱',
        eventType: 'common', cost: 0, playPhase: 'summon',
        effect: '选择一个敌方单位向召唤师靠近。',
        isActive: true, deckSymbols: [],
      },
      ...player.hand,
    ];
  }

  const board = next.board;
  const summonerPos = { row: 6, col: 2 };
  const enemyPos = { row: 4, col: 2 };
  clearArea(board, [summonerPos, enemyPos]);

  placeUnit(board, summonerPos, makeUnit({
    cardId: 'test-trickster-summoner', name: '泰珂露', faction: '欺心巫族',
    strength: 3, life: 12, attackType: 'ranged', unitClass: 'summoner',
    abilities: ['mind_capture'], owner: '0',
  }));
  placeUnit(board, enemyPos, makeUnit({
    cardId: 'test-hypnotic-target', name: '催眠目标',
    strength: 1, life: 4, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备殉葬火堆测试状态 */
export const prepareFuneralPyreState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'move';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.activeEvents = [
      {
        id: 'necro-funeral-pyre-test', cardType: 'event', name: '殉葬火堆',
        eventType: 'legendary', cost: 0, playPhase: 'magic',
        effect: '充能后治疗受伤单位。',
        isActive: true, charges: 2, deckSymbols: [],
      },
      ...player.activeEvents,
    ];
  }

  const board = next.board;
  const allyPos = { row: 5, col: 2 };
  clearArea(board, [allyPos]);

  placeUnit(board, allyPos, makeUnit({
    cardId: 'test-funeral-ally', name: '受伤友军', faction: '堕落王国',
    strength: 2, life: 5, damage: 2, attackType: 'melee', owner: '0',
  }));

  return next;
};

/** 准备心灵捕获测试状态 */
export const prepareMindCaptureState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
  }

  const board = next.board;
  const summonerPos = { row: 6, col: 3 };
  const targetPos = { row: 5, col: 3 };
  clearArea(board, [summonerPos, targetPos]);

  placeUnit(board, summonerPos, makeUnit({
    cardId: 'test-trickster-summoner', name: '泰珂露', faction: '欺心巫族',
    strength: 5, life: 7, attackType: 'melee', unitClass: 'summoner',
    abilities: ['mind_capture'], owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-enemy-capturable', name: '可控敌兵',
    strength: 1, life: 1, damage: 0, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备念力推拉测试状态 */
export const prepareTelekinesisState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
  }

  const board = next.board;
  const magePos = { row: 5, col: 2 };
  const targetPos = { row: 5, col: 3 };
  const pushLandingPos = { row: 5, col: 4 };
  clearArea(board, [magePos, targetPos, pushLandingPos]);

  placeUnit(board, magePos, makeUnit({
    cardId: 'test-telekinesis-mage', name: '清风法师', faction: '欺心巫族',
    strength: 2, life: 2, attackType: 'ranged', abilities: ['telekinesis'], owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-enemy-pushable', name: '可推敌兵',
    strength: 1, life: 5, damage: 0, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备读心传念测试状态 */
export const prepareMindTransmissionState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
  }

  const board = next.board;
  const championPos = { row: 5, col: 2 };
  const targetPos = { row: 5, col: 3 };
  const allyPos = { row: 6, col: 2 };
  clearArea(board, [championPos, targetPos, allyPos]);

  placeUnit(board, championPos, makeUnit({
    cardId: 'test-mind-transmission', name: '古尔壮', faction: '欺心巫族',
    strength: 3, life: 6, attackType: 'melee', unitClass: 'champion',
    abilities: ['mind_transmission'], owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-enemy-target', name: '敌方目标',
    strength: 1, life: 8, damage: 0, attackType: 'melee', owner: '1',
  }));
  placeUnit(board, allyPos, makeUnit({
    cardId: 'test-ally-soldier', name: '友方士兵',
    strength: 2, life: 2, attackType: 'melee', unitClass: 'common', owner: '0',
  }));

  return next;
};

/** 准备感染测试状态 */
export const prepareInfectionState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'attack';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;
  next.attackTargetMode = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.attackCount = 0;
    player.hasAttackedEnemy = false;
    player.discard = [
      {
        id: 'plague-zombie-discard-1', name: '亡灵疫病体', cardType: 'unit',
        faction: '堕落王国', cost: 0, life: 1, strength: 1, attackType: 'melee',
        unitClass: 'common', abilities: ['soulless', 'infection'],
        spriteIndex: 4, spriteAtlas: 'cards',
      },
      ...player.discard,
    ];
  }

  const board = next.board;
  const zombiePos = { row: 5, col: 2 };
  const targetPos = { row: 5, col: 3 };
  clearArea(board, [zombiePos, targetPos]);

  placeUnit(board, zombiePos, makeUnit({
    cardId: 'test-plague-zombie', name: '亡灵疫病体', faction: '堕落王国',
    strength: 4, life: 1, attackType: 'melee', abilities: ['soulless', 'infection'], owner: '0',
  }));
  placeUnit(board, targetPos, makeUnit({
    cardId: 'test-enemy-infectable', name: '可感染敌兵',
    strength: 1, life: 1, damage: 0, attackType: 'melee', owner: '1',
  }));

  return next;
};

/** 准备抓附跟随测试状态 */
export const prepareGrabFollowState = (coreState: CoreState) => {
  const next = buildBaseCoreState(coreState);
  next.phase = 'move';
  next.currentPlayer = '0';
  next.selectedUnit = undefined;

  const player = next.players?.['0'];
  if (player) {
    player.moveCount = 0;
  }

  const board = next.board;
  const grabberPos = { row: 5, col: 2 };
  const allyPos = { row: 5, col: 3 };
  const moveTarget = { row: 5, col: 4 };
  const followTarget = { row: 5, col: 5 };
  clearArea(board, [grabberPos, allyPos, moveTarget, followTarget]);

  placeUnit(board, grabberPos, makeUnit({
    cardId: 'test-grabber', name: '部落抓附手', faction: '洞穴地精',
    strength: 1, life: 2, attackType: 'melee', abilities: ['immobile', 'grab'], owner: '0',
  }));
  placeUnit(board, allyPos, makeUnit({
    cardId: 'test-ally-mover', name: '友方移动者',
    strength: 1, life: 2, attackType: 'melee', owner: '0',
  }));

  return next;
};
