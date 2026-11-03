import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUnlocked, checkSkillUnlocks, passTrial, createSkill } from '../../src/game/skills';
import { createTask, completeTask, MainQuestLimitError } from '../../src/game/actions';
import { createIdea, takeIdea } from '../../src/game/ideas';
import { applyChanges, type GameState, type Outcome } from '../../src/game/state';
import { STARTER_SKILLS } from '../../src/game/defaults';
import { makeCtx, makeState, withTotals } from './fixtures';

const run = (s: GameState, o: Outcome) => applyChanges(s, o.changes);
const hs = STARTER_SKILLS.find((k) => k.id === 'sk-handstand')!;
const withSkill = (pts: number) => ({ ...withTotals(makeState(), 0, { STR: pts }), skills: { [hs.id]: { ...hs } } });

test('handstand locked at STR lvl 4, unlocks at lvl 5 with one notification', () => {
  const ctx = makeCtx();
  let s = withSkill(13);
  assert.equal(isUnlocked(s, s.skills[hs.id]), false);
  assert.deepEqual(checkSkillUnlocks(s).events, []);
  s = withSkill(14);
  const o = checkSkillUnlocks(s);
  assert.deepEqual(o.events, [{ type: 'NEW_SKILL_AVAILABLE', skillId: hs.id }]);
  s = run(s, o);
  assert.deepEqual(checkSkillUnlocks(s).events, []);
  void ctx;
});

test('trial bonus is 5 × new level; MAX refuses', () => {
  const ctx = makeCtx();
  let s = withSkill(14);
  let o = passTrial(s, ctx, hs.id); s = run(s, o);
  assert.equal(s.skills[hs.id].currentLevel, 1);
  assert.equal(s.profile.totals.stats.STR, 19);
  assert.ok(o.events.some((e) => e.type === 'SKILL_LEVEL_UP' && e.level === 1));
  o = passTrial(s, ctx, hs.id); s = run(s, o);
  assert.equal(s.profile.totals.stats.STR, 29);
  s = { ...s, skills: { [hs.id]: { ...s.skills[hs.id], currentLevel: 5 } } };
  assert.throws(() => passTrial(s, ctx, hs.id));
});

test('trial on a locked skill is refused', () => {
  assert.throws(() => passTrial(withSkill(0), makeCtx(), hs.id));
});

test('custom skill creation', () => {
  const ctx = makeCtx();
  const s = run(makeState(), createSkill(makeState(), ctx, { name: 'Жонглирование', stat: 'MST', unlockLevel: 1, levels: ['3 мяча', '4 мяча', '5 мячей'] }));
  const k = Object.values(s.skills)[0];
  assert.equal(k.levels.length, 3); assert.equal(k.currentLevel, 0);
});

test('taking an idea creates a side quest; completing it marks the idea done', () => {
  const ctx = makeCtx();
  let s = makeState();
  s = run(s, createIdea(s, ctx, { title: 'Погулять в парке', tags: ['природа'] }));
  const ideaId = Object.keys(s.ideas)[0];
  s = run(s, takeIdea(s, ctx, ideaId, 'VIT', 'D'));
  const q = Object.values(s.tasks)[0];
  assert.equal(q.kind, 'quest'); assert.equal(q.questType, 'side'); assert.equal(q.ideaId, ideaId);
  assert.equal(s.ideas[ideaId].status, 'taken');
  s = run(s, completeTask(s, ctx, q.id));
  assert.equal(s.ideas[ideaId].status, 'done');
});

test('a 4th open main quest is refused', () => {
  const ctx = makeCtx();
  let s = makeState();
  for (let i = 0; i < 3; i++) s = run(s, createTask(s, ctx, { kind: 'quest', questType: 'main', title: `Цель ${i}`, stat: 'INT', rank: 'A' }));
  assert.throws(() => createTask(s, ctx, { kind: 'quest', questType: 'main', title: 'Цель 4', stat: 'INT', rank: 'A' }), MainQuestLimitError);
});
