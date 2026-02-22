import type { SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function initSupabase(createClient: (url: string, key: string) => SupabaseClient) {
  const url = (process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) {
    console.warn('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    supabase = null;
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

export function getSupabase() {
  return supabase;
}

// ============= Profile =============
export async function loginOrCreateProfile(username: string) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  
  if (existing) return existing;
  
  const userId = Math.random().toString(36).substring(7);
  const now = Date.now();
  
  const { data: newProfile } = await supabase
    .from('profiles')
    .insert([{ id: userId, username, last_energy_update: now, last_income_claim: now }])
    .select()
    .single();
  
  // Create starter ghost
  const starterTypes = ['Krasue','Krahang','Pret','Phi Pop','Nang Tani','Phi Tai Hong','Kuman Thong','Nang Nak','Phi Am','Hun Phayon'];
  const ghostType = starterTypes[Math.floor(Math.random()*starterTypes.length)];
  const ghostId = Math.random().toString(36).substring(7);
  
  await supabase.from('player_ghosts').insert([
    { id: ghostId, owner_id: userId, ghost_type: ghostType, str: 10, agi: 10, int: 10, vit: 10 }
  ]);
  
  // Create starter equipment
  const items = [
    { name: 'Sacred Amulet', slot: 'HEAD', bonus: { int:5, agi:2, acc:5 }},
    { name: 'Spirit Vest', slot: 'ARMOR', bonus: { vit:8, str:2, eva:2 }},
    { name: 'Ghost Sandals', slot: 'FEET', bonus: { agi:10, eva:8 }}
  ];
  
  for (const item of items) {
    const itemId = Math.random().toString(36).substring(7);
    await supabase.from('inventory').insert([
      { id: itemId, owner_id: userId, item_name: item.name, item_type: 'EQUIPMENT', slot: item.slot, stat_bonus: JSON.stringify(item.bonus) }
    ]);
  }
  
  return newProfile;
}

export async function syncProfile(userId: string) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (!profile) return null;
  
  const now = Date.now();
  const secondsPassed = (now - (profile.last_income_claim || 0)) / 1000;
  const earnedGold = Math.floor((profile.income_per_sec || 0) * secondsPassed);
  
  const enSecondsPassed = (now - (profile.last_energy_update || 0)) / 1000;
  const recoveredEnergy = Math.floor(enSecondsPassed / 5);
  const newEnergy = Math.min(profile.max_energy || 100, (profile.energy || 0) + recoveredEnergy);
  
  await supabase.from('profiles').update({
    gold: (profile.gold || 0) + earnedGold,
    energy: newEnergy,
    last_income_claim: now,
    last_energy_update: recoveredEnergy > 0 ? (profile.last_energy_update || 0) + (recoveredEnergy * 5 * 1000) : (profile.last_energy_update || 0)
  }).eq('id', userId);
  
  const { data: updated } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return updated;
}

// ============= Ghosts =============
export async function fetchGhosts(userId: string) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data } = await supabase
    .from('player_ghosts')
    .select('*')
    .eq('owner_id', userId);
  
  return data || [];
}

// ============= Inventory =============
export async function fetchInventory(userId: string) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data } = await supabase
    .from('inventory')
    .select('*')
    .eq('owner_id', userId);
  
  return data || [];
}

// ============= Targets =============
export async function fetchTargets() {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data } = await supabase
    .from('profiles')
    .select('id, username, gold, income_per_sec, defense_layer')
    .limit(10);
  
  return data || [];
}

// ============= Battle Logs =============
export async function saveBattleLog(battleId: string, events: any[]) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const rows = events.map((e: any) => ({
    battle_id: battleId,
    turn: e.turn ?? 0,
    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    actor_id: e.actorId,
    action: e.action,
    target_id: e.targetId,
    detail: e.detail ? (typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)) : null,
    value: e.value ?? null,
    hp_before: e.hpBefore ?? null,
    hp_after: e.hpAfter ?? null
  }));
  
  return await supabase.from('battle_logs').insert(rows as any);
}
