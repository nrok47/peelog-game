import { Ghost, Skill } from '../models';

export interface BattleLogEntry {
  turn: number;
  timestamp: number;
  actorId: string;
  action: 'attack' | 'skill' | 'evade' | 'damage' | 'heal' | 'death' | 'start' | 'end';
  targetId?: string;
  detail?: string; // skill name or misc
  value?: number; // damage/heal amount
  hpBefore?: number;
  hpAfter?: number;
}

function cloneGhost(g: Ghost): Ghost {
  return JSON.parse(JSON.stringify(g));
}

function calcHitChance(attacker: Ghost, defender: Ghost) {
  const base = 0.8;
  const spdDiff = attacker.stats.spd - defender.stats.spd;
  const luckFactor = (attacker.stats.luk - defender.stats.luk) * 0.002;
  return Math.max(0.1, Math.min(0.99, base + spdDiff * 0.01 + luckFactor));
}

function calcDamage(attacker: Ghost, defender: Ghost, skillPower = 0) {
  const atk = attacker.stats.atk + skillPower;
  const def = defender.stats.def;
  const raw = Math.max(1, atk - Math.floor(def * 0.5));
  const variance = 0.9 + Math.random() * 0.2;
  return Math.floor(raw * variance);
}

function tryUseSkill(actor: Ghost, skill: Skill) {
  return Math.random() < skill.chance;
}

// single actor action against target (mutates target ghost)
export function simulateTurn(turn: number, actor: Ghost, target: Ghost, skillMap: Record<string, Skill | undefined>): BattleLogEntry[] {
  const log: BattleLogEntry[] = [];
  const ts = Date.now();

  const equipped = actor.skillSlots.map(id => (id ? skillMap[id] : null)).filter(Boolean) as Skill[];

  let usedSkill: Skill | null = null;
  for (const sk of equipped) {
    if (tryUseSkill(actor, sk)) {
      usedSkill = sk;
      break;
    }
  }

  const hpBefore = target.currentHp;

  if (Math.random() > calcHitChance(actor, target)) {
    log.push({ turn, timestamp: ts, actorId: actor.id, action: 'evade', targetId: target.id, detail: 'missed' });
    return log;
  }

  if (usedSkill) {
    const dmg = calcDamage(actor, target, usedSkill.power);
    target.currentHp = Math.max(0, target.currentHp - dmg);
    log.push({ turn, timestamp: ts, actorId: actor.id, action: 'skill', targetId: target.id, detail: usedSkill.name, value: dmg, hpBefore, hpAfter: target.currentHp });
    if (target.currentHp === 0) log.push({ turn, timestamp: ts, actorId: target.id, action: 'death', hpBefore: 0, hpAfter: 0 });
  } else {
    const dmg = calcDamage(actor, target, 0);
    target.currentHp = Math.max(0, target.currentHp - dmg);
    log.push({ turn, timestamp: ts, actorId: actor.id, action: 'attack', targetId: target.id, value: dmg, hpBefore, hpAfter: target.currentHp });
    if (target.currentHp === 0) log.push({ turn, timestamp: ts, actorId: target.id, action: 'death', hpBefore: 0, hpAfter: 0 });
  }

  return log;
}

// simulate battle between two teams (A vs B), turn order by SPD descending each round
export function simulateBattle(
  teamA: Ghost[],
  teamB: Ghost[],
  skillMap: Record<string, Skill | undefined>,
  maxRounds = 60
) {
  const a = teamA.map(cloneGhost);
  const b = teamB.map(cloneGhost);
  const logs: BattleLogEntry[] = [];

  logs.push({ turn: 0, timestamp: Date.now(), actorId: 'system', action: 'start', detail: `Battle start: A(${a.length}) vs B(${b.length})` });

  for (let round = 1; round <= maxRounds; round++) {
    // gather alive actors
    const aliveA = a.filter(g => g.currentHp > 0);
    const aliveB = b.filter(g => g.currentHp > 0);
    if (aliveA.length === 0 || aliveB.length === 0) break;

    // combined order by spd desc
    const order = [...aliveA, ...aliveB].sort((x, y) => y.stats.spd - x.stats.spd);

    for (const actor of order) {
      if (actor.currentHp <= 0) continue;
      const enemies = a.includes(actor) ? b : a;
      const target = enemies.find(e => e.currentHp > 0);
      if (!target) continue;

      const turnLogs = simulateTurn(round, actor, target, skillMap);
      logs.push(...turnLogs);

      // early end
      const aliveA2 = a.some(g => g.currentHp > 0);
      const aliveB2 = b.some(g => g.currentHp > 0);
      if (!aliveA2 || !aliveB2) break;
    }

    const aliveAafter = a.some(g => g.currentHp > 0);
    const aliveBafter = b.some(g => g.currentHp > 0);
    if (!aliveAafter || !aliveBafter) break;
  }

  const aAlive = a.some(g => g.currentHp > 0);
  const bAlive = b.some(g => g.currentHp > 0);
  logs.push({ turn: -1, timestamp: Date.now(), actorId: 'system', action: 'end', detail: aAlive && !bAlive ? 'A wins' : !aAlive && bAlive ? 'B wins' : 'draw' });

  return { logs, finalA: a, finalB: b };
}
