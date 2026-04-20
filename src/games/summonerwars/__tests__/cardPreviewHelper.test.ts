/**
 * 召唤师战争 - 卡牌预览映射测试
 */

import { describe, expect, it } from 'vitest';
import { getSummonerWarsCardPreviewMeta, getSummonerWarsCardPreviewRef } from '../ui/cardPreviewHelper';
import { SPRITE_INDEX as NECRO_SPRITE_INDEX } from '../config/factions/necromancer';
import { resolveMagicPhaseClickRoute } from '../ui/HandArea';

describe('SummonerWars cardPreviewHelper', () => {
  it('支持带后缀的卡牌 ID 解析预览', () => {
    const meta = getSummonerWarsCardPreviewMeta('necro-funeral-pyre-0-1');
    expect(meta?.name).toBe('殉葬火堆');
    expect(meta?.previewRef).toMatchObject({
      type: 'atlas',
      atlasId: 'sw:necromancer:cards',
      index: NECRO_SPRITE_INDEX.EVENT_FUNERAL_PYRE,
    });
  });

  it('portal 建筑使用独立图集', () => {
    const previewRef = getSummonerWarsCardPreviewRef('necro-starting-gate-0');
    expect(previewRef).toMatchObject({
      type: 'atlas',
      atlasId: 'sw:portal',
      index: 0,
    });
  });
});

describe('SummonerWars HandArea 魔力阶段点击路由', () => {
  it('魔力阶段可把攻击阶段事件卡直接路由到弃牌/事件选择入口', () => {
    const route = resolveMagicPhaseClickRoute({
      phase: 'magic',
      isMyTurn: true,
      cardType: 'event',
      interactionBusy: false,
      bloodSummonSelectingCard: false,
      abilitySelectingCards: false,
    });

    expect(route).toBe('delegate-to-onCardClick');
  });

  it('已有系统交互时，事件卡点击应被阻断', () => {
    const route = resolveMagicPhaseClickRoute({
      phase: 'magic',
      isMyTurn: true,
      cardType: 'event',
      interactionBusy: true,
      bloodSummonSelectingCard: false,
      abilitySelectingCards: false,
    });

    expect(route).toBe('blocked-by-interaction');
  });

  it('技能选卡流程中不应被魔力阶段分支抢占', () => {
    const route = resolveMagicPhaseClickRoute({
      phase: 'magic',
      isMyTurn: true,
      cardType: 'event',
      interactionBusy: false,
      bloodSummonSelectingCard: false,
      abilitySelectingCards: true,
    });

    expect(route).toBeNull();
  });
});
