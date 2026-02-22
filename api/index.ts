import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://icunltrxwvbmjjyynibc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_X8ohUDEuZ_Eun7pWoijqyQ_GEV_kLNh';
const supabase = createClient(supabaseUrl, supabaseKey);

async function parseJsonBody(req: any) {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => data += chunk);
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

async function syncProfile(userId: string) {
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
  const updatedLastEnergy = (profile.last_energy_update || 0) + (recoveredEnergy * 5 * 1000);

  await supabase
    .from('profiles')
    .update({
      gold: (profile.gold || 0) + earnedGold,
      energy: newEnergy,
      last_income_claim: now,
      last_energy_update: recoveredEnergy > 0 ? updatedLastEnergy : (profile.last_energy_update || 0)
    })
    .eq('id', userId);

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return updatedProfile;
}

function sendJson(res: any, status: number, body: any) { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); }

export default async function handler(req: any, res: any) {
  try {
    // Parse pathname from request
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    
    // Vercel strips /api/ prefix in some cases, so handle both
    if (!pathname.startsWith('/api')) {
      pathname = `/api${pathname}`;
    }

    // GET /api/debug/db-status
    if (pathname === '/api/debug/db-status' && req.method === 'GET') {
      const { count: pCount, error: pError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: gCount, error: gError } = await supabase.from('player_ghosts').select('*', { count: 'exact', head: true });
      const { count: iCount, error: iError } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
      return sendJson(res, 200, {
        profiles: pError ? pError.message : `OK (${pCount})`,
        ghosts: gError ? gError.message : `OK (${gCount})`,
        inventory: iError ? iError.message : `OK (${iCount})`,
        env: { url: !!process.env.SUPABASE_URL, key: !!process.env.SUPABASE_ANON_KEY }
      });
    }

    // POST /api/login
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const username = body.username;
      if (!username || username.length < 3) return sendJson(res, 400, { error: 'Username must be at least 3 characters' });

      let { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!profile) {
        const userId = Math.random().toString(36).substring(7);
        const now = Date.now();
        try {
          const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, username, last_energy_update: now, last_income_claim: now }]).select().single();
          const starterTypes = ['Krasue','Krahang','Pret','Phi Pop','Nang Tani','Phi Tai Hong','Kuman Thong','Nang Nak','Phi Am','Hun Phayon'];
          const randomType = starterTypes[Math.floor(Math.random()*starterTypes.length)];
          const ghostId = Math.random().toString(36).substring(7);
          await supabase.from('player_ghosts').insert([{ id: ghostId, owner_id: userId, ghost_type: randomType, str: 10, agi: 10, int: 10, vit: 10 }]);
          const items = [
            { name: 'Sacred Amulet', slot: 'HEAD', bonus: { int:5, agi:2, acc:5 }},
            { name: 'Spirit Vest', slot: 'ARMOR', bonus: { vit:8, str:2, eva:2 }},
            { name: 'Ghost Sandals', slot: 'FEET', bonus: { agi:10, eva:8 }}
          ];
          for (const item of items) {
            const itemId = Math.random().toString(36).substring(7);
            await supabase.from('inventory').insert([{ id: itemId, owner_id: userId, item_name: item.name, item_type: 'EQUIPMENT', slot: item.slot, stat_bonus: JSON.stringify(item.bonus) }]);
          }
          profile = newProfile;
        } catch (err: any) {
          console.error(err);
          return sendJson(res, 500, { error: 'Failed to create profile' });
        }
      }
      return sendJson(res, 200, profile);
    }

    // GET /api/profile/:id
    if (pathname.startsWith('/api/profile/') && req.method === 'GET') {
      const userId = pathname.split('/').pop();
      const profile = await syncProfile(userId);
      if (!profile) {
        const now = Date.now();
        const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, username: `Player_${String(userId).slice(0,4)}`, last_energy_update: now, last_income_claim: now }]).select().single();
        const starterTypes = ['Krasue','Krahang','Pret','Phi Pop','Nang Tani','Phi Tai Hong','Kuman Thong','Nang Nak','Phi Am','Hun Phayon'];
        const randomType = starterTypes[Math.floor(Math.random()*starterTypes.length)];
        const ghostId = Math.random().toString(36).substring(7);
        await supabase.from('player_ghosts').insert([{ id: ghostId, owner_id: userId, ghost_type: randomType, str: 10, agi: 10, int: 10, vit: 10 }]);
        const items = [ { name: 'Sacred Amulet', slot: 'HEAD', bonus: { int:5, agi:2, acc:5 }}, { name: 'Spirit Vest', slot: 'ARMOR', bonus: { vit:8, str:2, eva:2 }}, { name: 'Ghost Sandals', slot: 'FEET', bonus: { agi:10, eva:8 }} ];
        for (const item of items) {
          const itemId = Math.random().toString(36).substring(7);
          await supabase.from('inventory').insert([{ id: itemId, owner_id: userId, item_name: item.name, item_type: 'EQUIPMENT', slot: item.slot, stat_bonus: JSON.stringify(item.bonus) }]);
        }
        return sendJson(res, 200, newProfile);
      }
      return sendJson(res, 200, profile);
    }

    // GET /api/ghosts/:userId
    if (pathname.startsWith('/api/ghosts/') && req.method === 'GET') {
      const userId = pathname.split('/').pop();
      const { data: ghosts } = await supabase.from('player_ghosts').select('*').eq('owner_id', userId);
      return sendJson(res, 200, ghosts || []);
    }

    // GET /api/inventory/:userId
    if (pathname.startsWith('/api/inventory/') && req.method === 'GET') {
      const userId = pathname.split('/').pop();
      const { data: items } = await supabase.from('inventory').select('*').eq('owner_id', userId);
      return sendJson(res, 200, items || []);
    }

    // GET /api/targets
    if (pathname === '/api/targets' && req.method === 'GET') {
      const { data: targets } = await supabase.from('profiles').select('id, username, gold, income_per_sec, defense_layer').limit(10);
      return sendJson(res, 200, targets || []);
    }

    // POST /api/save-battle-log
    if (pathname === '/api/save-battle-log' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { battleId, events } = body;
      if (!battleId || !Array.isArray(events)) return sendJson(res, 400, { error: 'battleId and events required' });
      const rows = events.map((e: any) => ({ battle_id: battleId, turn: e.turn ?? 0, timestamp: e.timestamp ? new Date(e.timestamp) : new Date(), actor_id: e.actorId, action: e.action, target_id: e.targetId, detail: e.detail ? (typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)) : null, value: e.value ?? null, hp_before: e.hpBefore ?? null, hp_after: e.hpAfter ?? null }));
      await supabase.from('battle_logs').insert(rows as any);
      return sendJson(res, 200, { success: true, inserted: rows.length });
    }

    // Not found
    return sendJson(res, 404, { error: 'Not Found', path: pathname });
  } catch (err: any) {
    console.error('api handler error', err);
    return sendJson(res, 500, { error: err.message || 'internal' });
  }
}
