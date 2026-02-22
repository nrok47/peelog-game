import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://icunltrxwvbmjjyynibc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_X8ohUDEuZ_Eun7pWoijqyQ_GEV_kLNh';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to sync profile
const syncProfile = async (userId: string) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const now = Date.now();
  const secondsPassed = (now - profile.last_income_claim) / 1000;
  const earnedGold = Math.floor(secondsPassed * profile.income_per_sec);
  
  const enSecondsPassed = (now - profile.last_energy_update) / 1000;
  const recoveredEnergy = Math.floor(enSecondsPassed / 5);
  const newEnergy = Math.min(profile.max_energy, profile.energy + recoveredEnergy);
  const updatedLastEnergy = profile.last_energy_update + (recoveredEnergy * 5 * 1000);

  await supabase
    .from('profiles')
    .update({
      gold: profile.gold + earnedGold,
      energy: newEnergy,
      last_income_claim: now,
      last_energy_update: recoveredEnergy > 0 ? updatedLastEnergy : profile.last_energy_update
    })
    .eq('id', userId);

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return updatedProfile;
};

app.get('/api/debug/db-status', async (req, res) => {
  try {
    const { count: pCount, error: pError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: gCount, error: gError } = await supabase.from('player_ghosts').select('*', { count: 'exact', head: true });
    const { count: iCount, error: iError } = await supabase.from('inventory').select('*', { count: 'exact', head: true });

    res.json({
      profiles: pError ? pError.message : `OK (${pCount})`,
      ghosts: gError ? gError.message : `OK (${gCount})`,
      inventory: iError ? iError.message : `OK (${iCount})`,
      env: {
        url: !!process.env.SUPABASE_URL,
        key: !!process.env.SUPABASE_ANON_KEY
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    const userId = Math.random().toString(36).substring(7);
    const now = Date.now();

    try {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{ id: userId, username, last_energy_update: now, last_income_claim: now }])
        .select()
        .single();

      const starterTypes = ['Krasue', 'Krahang', 'Pret', 'Phi Pop', 'Nang Tani', 'Phi Tai Hong', 'Kuman Thong', 'Nang Nak', 'Phi Am', 'Hun Phayon'];
      const randomType = starterTypes[Math.floor(Math.random() * starterTypes.length)];

      const ghostId = Math.random().toString(36).substring(7);
      await supabase
        .from('player_ghosts')
        .insert([{ id: ghostId, owner_id: userId, ghost_type: randomType, str: 10, agi: 10, int: 10, vit: 10 }]);

      const items = [
        { name: 'Sacred Amulet', slot: 'HEAD', bonus: { int: 5, agi: 2, acc: 5 } },
        { name: 'Spirit Vest', slot: 'ARMOR', bonus: { vit: 8, str: 2, eva: 2 } },
        { name: 'Ghost Sandals', slot: 'FEET', bonus: { agi: 10, eva: 8 } }
      ];

      for (const item of items) {
        const itemId = Math.random().toString(36).substring(7);
        await supabase
          .from('inventory')
          .insert([{
            id: itemId,
            owner_id: userId,
            item_name: item.name,
            item_type: 'EQUIPMENT',
            slot: item.slot,
            stat_bonus: JSON.stringify(item.bonus)
          }]);
      }

      profile = newProfile;
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create profile' });
    }
  }

  res.json(profile);
});

app.get('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;
  let profile = await syncProfile(userId);

  if (!profile) {
    const now = Date.now();
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert([{ id: userId, username: `Player_${userId.slice(0, 4)}`, last_energy_update: now, last_income_claim: now }])
      .select()
      .single();

    const starterTypes = ['Krasue', 'Krahang', 'Pret', 'Phi Pop', 'Nang Tani', 'Phi Tai Hong', 'Kuman Thong', 'Nang Nak', 'Phi Am', 'Hun Phayon'];
    const randomType = starterTypes[Math.floor(Math.random() * starterTypes.length)];

    const ghostId = Math.random().toString(36).substring(7);
    await supabase
      .from('player_ghosts')
      .insert([{ id: ghostId, owner_id: userId, ghost_type: randomType, str: 10, agi: 10, int: 10, vit: 10 }]);

    const items = [
      { name: 'Sacred Amulet', slot: 'HEAD', bonus: { int: 5, agi: 2, acc: 5 } },
      { name: 'Spirit Vest', slot: 'ARMOR', bonus: { vit: 8, str: 2, eva: 2 } },
      { name: 'Ghost Sandals', slot: 'FEET', bonus: { agi: 10, eva: 8 } }
    ];

    for (const item of items) {
      const itemId = Math.random().toString(36).substring(7);
      await supabase
        .from('inventory')
        .insert([{
          id: itemId,
          owner_id: userId,
          item_name: item.name,
          item_type: 'EQUIPMENT',
          slot: item.slot,
          stat_bonus: JSON.stringify(item.bonus)
        }]);
    }

    profile = newProfile;
  }
  res.json(profile);
});

app.get('/api/ghosts/:userId', async (req, res) => {
  const { data: ghosts } = await supabase
    .from('player_ghosts')
    .select('*')
    .eq('owner_id', req.params.userId);

  res.json(ghosts || []);
});

app.get('/api/inventory/:userId', async (req, res) => {
  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('owner_id', req.params.userId);
  res.json(items || []);
});

app.get('/api/targets', async (req, res) => {
  const { data: targets } = await supabase
    .from('profiles')
    .select('id, username, gold, income_per_sec, defense_layer')
    .limit(10);
  res.json(targets || []);
});

app.post('/api/save-battle-log', async (req, res) => {
  try {
    const { battleId, events } = req.body;
    if (!battleId || !Array.isArray(events)) {
      return res.status(400).json({ error: 'battleId and events required' });
    }

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

    await supabase.from('battle_logs').insert(rows as any);
    res.json({ success: true, inserted: rows.length });
  } catch (err: any) {
    console.error('save-battle-log error', err.message || err);
    res.status(500).json({ error: err.message || 'failed' });
  }
});

export default app;
