export type StatName = 'hp' | 'atk' | 'def' | 'spd' | 'int' | 'luk';

export interface Ghost {
  id: string;
  speciesId?: string;
  name: string;
  level: number;
  xp: number;
  stats: Record<StatName, number>;
  currentHp: number;
  skillSlots: (string | null)[]; // skill ids
  passiveEffects?: string[]; // passive skill ids
}

export interface Egg {
  id: string;
  speciesPool: string[]; // possible species ids
  hatchTime: number; // unix timestamp (seconds)
  progress: number; // 0..1
  ownerId?: string;
}

export type SkillType = 'damage' | 'buff' | 'debuff' | 'heal' | 'status';
export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  power: number; // base power
  chance: number; // 0..1 probability to trigger (for passive procs)
  cooldown?: number; // seconds or turns
  target: 'enemy' | 'ally' | 'self';
  description?: string;
}

export interface SpeciesTemplate {
  id: string;
  name: string;
  baseStats: Record<StatName, number>;
  startingSkills?: string[];
}

// Example species templates (placeholder icons used in UI)
export const speciesTemplates: Record<string, SpeciesTemplate> = {
  shadow_imp: {
    id: 'shadow_imp',
    name: 'Shadow Imp',
    baseStats: { hp: 40, atk: 12, def: 6, spd: 14, int: 8, luk: 6 },
    startingSkills: [],
  },
  ember_wisp: {
    id: 'ember_wisp',
    name: 'Ember Wisp',
    baseStats: { hp: 48, atk: 10, def: 8, spd: 10, int: 14, luk: 8 },
    startingSkills: [],
  },
};

export const sampleSkills: Record<string, Skill> = {
  shadow_slash: { id: 'shadow_slash', name: 'Shadow Slash', type: 'damage', power: 8, chance: 0.25, cooldown: 2, target: 'enemy', description: 'A swift shadow strike.' },
  ember_burst: { id: 'ember_burst', name: 'Ember Burst', type: 'damage', power: 10, chance: 0.2, cooldown: 3, target: 'enemy', description: 'Explosive ember magic.' },
  minor_heal: { id: 'minor_heal', name: 'Minor Heal', type: 'heal', power: 8, chance: 0.15, cooldown: 3, target: 'ally', description: 'Small heal to an ally.' },
};

export function createGhostFromSpecies(speciesId: string, opts?: { name?: string; level?: number }): Ghost {
  const tpl = speciesTemplates[speciesId];
  const level = opts?.level ?? 1;
  const id = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const stats: Record<StatName, number> = { ...tpl.baseStats };
  // simple level scaling
  for (let k of Object.keys(stats) as StatName[]) {
    stats[k] = Math.max(1, Math.floor(stats[k] + (level - 1) * (stats[k] * 0.12)));
  }
  return {
    id,
    speciesId,
    name: opts?.name ?? tpl.name,
    level,
    xp: 0,
    stats,
    currentHp: stats.hp,
    skillSlots: Array(3).fill(null),
    passiveEffects: [],
  };
}

// simple hatch helper: choose species randomly from pool
export function tryHatch(egg: Egg, nowSec: number): string | null {
  if (nowSec < egg.hatchTime) return null;
  const species = egg.speciesPool[Math.floor(Math.random() * egg.speciesPool.length)];
  return species;
}
