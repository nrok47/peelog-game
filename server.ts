import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || 'https://icunltrxwvbmjjyynibc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_X8ohUDEuZ_Eun7pWoijqyQ_GEV_kLNh';
const supabase = createClient(supabaseUrl, supabaseKey);

async function initBots() {
  console.log("Checking for bots in Supabase...");
  const { data: bots, error } = await supabase
    .from('profiles')
    .select('id')
    .like('id', 'bot_%');

  if (error) {
    console.error("Error checking bots:", error);
    return;
  }

  if (!bots || bots.length === 0) {
    console.log("Initializing 10 bots for Syndicate Raids...");
    const now = Date.now();
    const starterTypes = ['Krasue', 'Krahang', 'Pret', 'Phi Pop', 'Nang Tani', 'Phi Tai Hong', 'Kuman Thong', 'Nang Nak', 'Phi Am', 'Hun Phayon'];
    for (let i = 1; i <= 10; i++) {
      const botId = `bot_${i}`;
      const botName = `Syndicate_Bot_${i}`;
      const randomType = starterTypes[(i - 1) % starterTypes.length];
      
      // Create bot profile
      await supabase.from('profiles').upsert({
        id: botId,
        username: botName,
        gold: 5000 * i,
        income_per_sec: 5 * i,
        defense_layer: i * 5,
        last_energy_update: now,
        last_income_claim: now,
        energy: 100,
        max_energy: 100
      });

      // Create bot ghost
      const ghostId = `bot_ghost_${i}`;
      await supabase.from('player_ghosts').upsert({
        id: ghostId,
        owner_id: botId,
        ghost_type: randomType,
        level: 5 + i,
        str: 10 + i,
        agi: 10 + i,
        int: 10 + i,
        vit: 10 + i
      });
    }
    console.log("Bots initialized successfully.");
  } else {
    console.log(`${bots.length} bots already exist.`);
  }
}

async function startServer() {
  await initBots();
  console.log("Starting Spirit Master server with Supabase...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/debug/db-status", async (req, res) => {
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

  // Helper to sync profile (energy and income)
  const syncProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile || error) return null;

    const now = Date.now();
    const secondsPassed = (now - profile.last_income_claim) / 1000;
    const earnedGold = Math.floor(secondsPassed * profile.income_per_sec);

    // Energy recovery: 1 EN every 5 seconds (DEMO MODE)
    const enSecondsPassed = (now - profile.last_energy_update) / 1000;
    const recoveredEnergy = Math.floor(enSecondsPassed / 5);
    const newEnergy = Math.min(profile.max_energy, profile.energy + recoveredEnergy);
    
    // Update last update times if recovery happened
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

  // Helper to get ghost total stats including items and type bonuses
  const getGhostTotalStats = async (ghostId: string) => {
    const { data: ghost, error } = await supabase
      .from('player_ghosts')
      .select('*')
      .eq('id', ghostId)
      .single();

    if (!ghost || error) return null;

    const stats = {
      str: ghost.str,
      agi: ghost.agi,
      int: ghost.int,
      vit: ghost.vit,
      acc: 80, // Base accuracy
      eva: 10  // Base evasion
    };

    // Add item bonuses
    const itemIds = [ghost.head_item_id, ghost.armor_item_id, ghost.feet_item_id, ghost.skill_1_id, ghost.skill_2_id].filter(Boolean);
    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from('inventory')
        .select('*')
        .in('id', itemIds);

      if (items) {
        for (const item of items) {
          if (item.stat_bonus) {
            const bonus = JSON.parse(item.stat_bonus);
            if (bonus.str) stats.str += bonus.str;
            if (bonus.agi) stats.agi += bonus.agi;
            if (bonus.int) stats.int += bonus.int;
            if (bonus.vit) stats.vit += bonus.vit;
            if (bonus.acc) stats.acc += bonus.acc;
            if (bonus.eva) stats.eva += bonus.eva;
          }
        }
      }
    }

    // Ghost Type Passive Bonuses
    if (ghost.ghost_type.includes('Krasue')) {
      stats.eva += 20;
      stats.agi += 5;
    } else if (ghost.ghost_type.includes('Pret')) {
      stats.vit += 10;
      stats.int += 10;
      stats.acc -= 15;
    } else if (ghost.ghost_type.includes('Krahang')) {
      stats.str += 10;
      stats.vit += 5;
    } else if (ghost.ghost_type.includes('Phi Pop')) {
      stats.int += 10;
      stats.str += 5; // Life steal flavor: stronger attacks
    } else if (ghost.ghost_type.includes('Nang Tani')) {
      stats.int += 15;
      stats.agi += 5;
    } else if (ghost.ghost_type.includes('Phi Tai Hong')) {
      stats.str += 10;
      stats.agi += 10;
    } else if (ghost.ghost_type.includes('Kuman Thong')) {
      stats.agi += 15;
      stats.int += 5;
    } else if (ghost.ghost_type.includes('Nang Nak')) {
      stats.vit += 15;
      stats.str += 5;
    } else if (ghost.ghost_type.includes('Phi Am')) {
      stats.int += 10;
      stats.vit += 10;
    } else if (ghost.ghost_type.includes('Hun Phayon')) {
      stats.vit += 20;
      stats.str += 5;
    }

    return { ...ghost, totalStats: stats };
  };

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { username } = req.body;
    if (!username || username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    
    if (!profile) {
      // Register new user
      const userId = Math.random().toString(36).substring(7);
      const now = Date.now();
      
      try {
        const { data: newProfile, error: pError } = await supabase
          .from('profiles')
          .insert([{ id: userId, username, last_energy_update: now, last_income_claim: now }])
          .select()
          .single();

        if (pError) throw pError;

        // Add a random starter ghost from the 10 types
        const starterTypes = ['Krasue', 'Krahang', 'Pret', 'Phi Pop', 'Nang Tani', 'Phi Tai Hong', 'Kuman Thong', 'Nang Nak', 'Phi Am', 'Hun Phayon'];
        const randomType = starterTypes[Math.floor(Math.random() * starterTypes.length)];
        
        const ghostId = Math.random().toString(36).substring(7);
        await supabase
          .from('player_ghosts')
          .insert([{ id: ghostId, owner_id: userId, ghost_type: randomType, str: 10, agi: 10, int: 10, vit: 10 }]);

        // Add starter equipment
        const items = [
          { name: "Sacred Amulet", slot: "HEAD", bonus: { int: 5, agi: 2, acc: 5 } },
          { name: "Spirit Vest", slot: "ARMOR", bonus: { vit: 8, str: 2, eva: 2 } },
          { name: "Ghost Sandals", slot: "FEET", bonus: { agi: 10, eva: 8 } }
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
        return res.status(500).json({ error: "Failed to create profile" });
      }
    }

    res.json(profile);
  });

  app.get("/api/profile/:id", async (req, res) => {
    const userId = req.params.id;
    let profile = await syncProfile(userId);
    
    if (!profile) {
      // Create default profile for demo
      const now = Date.now();
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{ id: userId, username: `Player_${userId.slice(0, 4)}`, last_energy_update: now, last_income_claim: now }])
        .select()
        .single();
      
      // Add a random starter ghost
      const starterTypes = ['Krasue', 'Krahang', 'Pret', 'Phi Pop', 'Nang Tani', 'Phi Tai Hong', 'Kuman Thong', 'Nang Nak', 'Phi Am', 'Hun Phayon'];
      const randomType = starterTypes[Math.floor(Math.random() * starterTypes.length)];

      const ghostId = Math.random().toString(36).substring(7);
      await supabase
        .from('player_ghosts')
        .insert([{ id: ghostId, owner_id: userId, ghost_type: randomType, str: 10, agi: 10, int: 10, vit: 10 }]);

      // Add starter equipment
      const items = [
        { name: "Sacred Amulet", slot: "HEAD", bonus: { int: 5, agi: 2, acc: 5 } },
        { name: "Spirit Vest", slot: "ARMOR", bonus: { vit: 8, str: 2, eva: 2 } },
        { name: "Ghost Sandals", slot: "FEET", bonus: { agi: 10, eva: 8 } }
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

  app.get("/api/ghosts/:userId", async (req, res) => {
    const { data: ghosts } = await supabase
      .from('player_ghosts')
      .select('*')
      .eq('owner_id', req.params.userId);

    if (!ghosts) return res.json([]);
    
    const ghostsWithStats = await Promise.all(ghosts.map(g => getGhostTotalStats(g.id)));
    res.json(ghostsWithStats);
  });

  app.get("/api/inventory/:userId", async (req, res) => {
    const { data: items } = await supabase
      .from('inventory')
      .select('*')
      .eq('owner_id', req.params.userId);
    res.json(items || []);
  });

  app.get("/api/equipment/available/:userId", async (req, res) => {
    const { data: items } = await supabase
      .from('inventory')
      .select('*')
      .eq('owner_id', req.params.userId)
      .eq('item_type', 'EQUIPMENT')
      .eq('is_equipped', 0);
    res.json(items || []);
  });

  app.post("/api/evolve", async (req, res) => {
    const { ghostId } = req.body;
    const { data: ghost } = await supabase
      .from('player_ghosts')
      .select('*')
      .eq('id', ghostId)
      .single();
    
    if (!ghost) return res.status(404).json({ error: "Ghost not found" });
    if (ghost.level < 10) return res.status(400).json({ error: "Level 10 required for evolution" });

    const evolutionMap: Record<string, { next: string, bonus: any }> = {
      'Krasue': { next: 'Krasue Fire', bonus: { str: 5, agi: 15, int: 10, vit: 5 } },
      'Krahang': { next: 'Great Garuda', bonus: { str: 15, agi: 5, int: 5, vit: 15 } },
      'Pret': { next: 'Demon Preta', bonus: { str: 5, agi: 5, int: 15, vit: 20 } },
      'Phi Pop': { next: 'Ghoul Lord', bonus: { str: 10, agi: 10, int: 15, vit: 5 } },
      'Nang Tani': { next: 'Golden Tani', bonus: { str: 5, agi: 10, int: 20, vit: 5 } },
      'Phi Tai Hong': { next: 'Dual Soul', bonus: { str: 15, agi: 15, int: 5, vit: 5 } },
      'Kuman Thong': { next: 'Divine Kumara', bonus: { str: 5, agi: 20, int: 15, vit: 5 } },
      'Nang Nak': { next: 'Wraith Queen', bonus: { str: 10, agi: 5, int: 10, vit: 20 } },
      'Phi Am': { next: 'Nightmare King', bonus: { str: 5, agi: 5, int: 20, vit: 15 } },
      'Hun Phayon': { next: 'Iron Golem', bonus: { str: 10, agi: 5, int: 5, vit: 25 } },
    };

    const evo = evolutionMap[ghost.ghost_type];
    if (!evo) return res.status(400).json({ error: "This ghost cannot evolve further yet" });

    const { data: updatedGhost } = await supabase
      .from('player_ghosts')
      .update({
        ghost_type: evo.next,
        str: ghost.str + evo.bonus.str,
        agi: ghost.agi + evo.bonus.agi,
        int: ghost.int + evo.bonus.int,
        vit: ghost.vit + evo.bonus.vit
      })
      .eq('id', ghostId)
      .select()
      .single();

    res.json({ success: true, ghost: updatedGhost });
  });

  app.post("/api/equip", async (req, res) => {
    const { ghostId, itemId, slot } = req.body;
    
    const { data: item } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.slot !== slot) return res.status(400).json({ error: "Invalid slot for this item" });

    const { data: ghost } = await supabase
      .from('player_ghosts')
      .select('*')
      .eq('id', ghostId)
      .single();

    const oldItemId = ghost[`${slot.toLowerCase()}_item_id`];
    
    if (oldItemId) {
      await supabase.from('inventory').update({ is_equipped: 0 }).eq('id', oldItemId);
    }

    await supabase.from('player_ghosts').update({ [`${slot.toLowerCase()}_item_id`]: itemId }).eq('id', ghostId);
    await supabase.from('inventory').update({ is_equipped: 1 }).eq('id', itemId);

    res.json({ success: true });
  });

  app.post("/api/unequip", async (req, res) => {
    const { ghostId, slot } = req.body;
    const { data: ghost } = await supabase
      .from('player_ghosts')
      .select('*')
      .eq('id', ghostId)
      .single();

    if (!ghost) return res.status(404).json({ error: "Ghost not found" });

    const itemId = ghost[`${slot.toLowerCase()}_item_id`];
    if (itemId) {
      await supabase.from('player_ghosts').update({ [`${slot.toLowerCase()}_item_id`]: null }).eq('id', ghostId);
      await supabase.from('inventory').update({ is_equipped: 0 }).eq('id', itemId);
    }

    res.json({ success: true });
  });

  app.post("/api/train", async (req, res) => {
    const { userId, ghostId, statType } = req.body;
    const profile = await syncProfile(userId) as any;
    
    if (profile.energy < 10) {
      return res.status(400).json({ error: "Not enough energy" });
    }

    await supabase.from('profiles').update({ energy: profile.energy - 10 }).eq('id', userId);
    
    const increment = Math.floor(Math.random() * 3) + 1;
    const { data: ghost } = await supabase.from('player_ghosts').select(statType).eq('id', ghostId).single();
    
    const { data: updatedGhost } = await supabase
      .from('player_ghosts')
      .update({ [statType]: ghost[statType] + increment })
      .eq('id', ghostId)
      .select()
      .single();

    res.json({ ghost: updatedGhost, energy: profile.energy - 10 });
  });

  app.post("/api/craft", async (req, res) => {
    const { userId, itemName, cost, incomeBonus } = req.body;
    const profile = await syncProfile(userId) as any;

    if (profile.gold < cost) {
      return res.status(400).json({ error: "Not enough gold" });
    }

    await supabase
      .from('profiles')
      .update({ 
        gold: profile.gold - cost, 
        income_per_sec: profile.income_per_sec + incomeBonus 
      })
      .eq('id', userId);
    
    const itemId = Math.random().toString(36).substring(7);
    await supabase
      .from('inventory')
      .insert([{ 
        id: itemId, 
        owner_id: userId, 
        item_name: itemName, 
        item_type: 'BUSINESS', 
        income_bonus: incomeBonus 
      }]);

    res.json({ success: true, newGold: profile.gold - cost });
  });

  app.get("/api/targets", async (req, res) => {
    const { data: targets } = await supabase
      .from('profiles')
      .select('id, username, gold, income_per_sec, defense_layer')
      .limit(10);
    res.json(targets || []);
  });

  app.post("/api/hatch", async (req, res) => {
    const { userId } = req.body;
    const profile = await syncProfile(userId) as any;
    
    if (profile.gold < 1000) {
      return res.status(400).json({ error: "Not enough gold to hatch an egg (1,000 G required)" });
    }

    const starterTypes = ['Krasue', 'Krahang', 'Pret', 'Phi Pop', 'Nang Tani', 'Phi Tai Hong', 'Kuman Thong', 'Nang Nak', 'Phi Am', 'Hun Phayon'];
    const randomType = starterTypes[Math.floor(Math.random() * starterTypes.length)];
    
    const ghostId = Math.random().toString(36).substring(7);
    
    await supabase.from('profiles').update({ gold: profile.gold - 1000 }).eq('id', userId);
    
    const { data: newGhost } = await supabase
      .from('player_ghosts')
      .insert([{ 
        id: ghostId, 
        owner_id: userId, 
        ghost_type: randomType, 
        str: 10, 
        agi: 10, 
        int: 10, 
        vit: 10,
        level: 1,
        exp: 0
      }])
      .select()
      .single();

    res.json({ success: true, ghost: newGhost });
  });

  app.post("/api/raid", async (req, res) => {
    const { attackerId, defenderId } = req.body;
    const attacker = await syncProfile(attackerId) as any;
    const defender = await syncProfile(defenderId) as any;

    if (attacker.energy < 20) {
      return res.status(400).json({ error: "Not enough energy to raid" });
    }

    const { data: attackerGhosts } = await supabase.from('player_ghosts').select('id').eq('owner_id', attackerId).limit(1);
    const { data: defenderGhosts } = await supabase.from('player_ghosts').select('id').eq('owner_id', defenderId).limit(1);

    if (!attackerGhosts?.length || !defenderGhosts?.length) {
      return res.status(400).json({ error: "Both parties must have at least one ghost" });
    }

    const aGhost = await getGhostTotalStats(attackerGhosts[0].id);
    const dGhost = await getGhostTotalStats(defenderGhosts[0].id);

    if (!aGhost || !dGhost) return res.status(400).json({ error: "Ghost data missing" });

    const battleTurns: string[] = [];
    let win = false;
    let stolen = 0;

    // Accuracy vs Evasion
    const hitChance = Math.max(20, Math.min(95, aGhost.totalStats.acc - dGhost.totalStats.eva));
    const isHit = Math.random() * 100 <= hitChance;

    if (!isHit) {
      battleTurns.push(`${aGhost.ghost_type} attempted to strike, but ${dGhost.ghost_type} vanished into the shadows! (Miss)`);
      win = false;
    } else {
      // Skill Activation Chance (based on INT)
      const skillChance = Math.min(40, aGhost.totalStats.int / 2);
      const skillActivated = Math.random() * 100 <= skillChance;
      
      let attackerPower = aGhost.totalStats.str + (aGhost.totalStats.agi * 0.5);
      
      if (skillActivated) {
        attackerPower *= 1.8;
        battleTurns.push(`${aGhost.ghost_type} channeled occult energy and unleashed a powerful skill! (1.8x DMG)`);
      }

      const critChance = Math.min(25, aGhost.totalStats.int / 4);
      const isCritical = Math.random() * 100 <= critChance;
      if (isCritical) {
        attackerPower *= 1.5;
        battleTurns.push(`CRITICAL HIT! ${aGhost.ghost_type} found a weak spot in the spiritual barrier.`);
      }

      const defenseBonus = (defender.defense_layer || 0) * (1 + dGhost.totalStats.vit / 50);
      const defenderPower = dGhost.totalStats.vit + (dGhost.totalStats.int * 0.5) + defenseBonus;
      
      const damage = Math.max(1, Math.floor(attackerPower - (defenderPower * 0.5)));
      battleTurns.push(`${aGhost.ghost_type} dealt ${damage} spiritual damage to ${dGhost.ghost_type}.`);
      
      win = attackerPower > defenderPower;
      
      if (win) {
        battleTurns.push(`The syndicate of ${attacker.username} has successfully breached the defenses!`);
        stolen = Math.floor(defender.gold * 0.2);
      } else {
        battleTurns.push(`${dGhost.ghost_type} repelled the attack. The raid was unsuccessful.`);
      }
    }

    if (win && stolen > 0) {
      await supabase.from('profiles').update({ gold: attacker.gold + stolen }).eq('id', attackerId);
      await supabase.from('profiles').update({ gold: defender.gold - stolen }).eq('id', defenderId);
    }

    await supabase.from('profiles').update({ energy: attacker.energy - 20 }).eq('id', attackerId);
    
    const logId = Math.random().toString(36).substring(7);
    await supabase
      .from('battle_logs')
      .insert([{ 
        id: logId, 
        attacker_id: attackerId, 
        defender_id: defenderId, 
        winner_id: win ? attackerId : defenderId, 
        gold_stolen: stolen, 
        battle_details: JSON.stringify(battleTurns),
        timestamp: Date.now() 
      }]);

    res.json({ win, stolen, energy: attacker.energy - 20, battleLog: battleTurns.join(" "), turns: battleTurns });
  });

  app.get("/api/logs/:userId", async (req, res) => {
    const { data: logs } = await supabase
      .from('battle_logs')
      .select(`
        *,
        attacker:profiles!attacker_id(username),
        defender:profiles!defender_id(username)
      `)
      .or(`attacker_id.eq.${req.params.userId},defender_id.eq.${req.params.userId}`)
      .order('timestamp', { ascending: false })
      .limit(20);

    const formattedLogs = logs?.map((log: any) => ({
      ...log,
      attacker_name: log.attacker?.username,
      defender_name: log.defender?.username
    }));

    res.json(formattedLogs || []);
  });

  app.post("/api/upgrade/defense", async (req, res) => {
    const { userId } = req.body;
    const profile = await syncProfile(userId) as any;
    const cost = (profile.defense_layer + 1) * 1000;

    if (profile.gold < cost) {
      return res.status(400).json({ error: "Not enough gold" });
    }

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update({ 
        gold: profile.gold - cost, 
        defense_layer: profile.defense_layer + 5 
      })
      .eq('id', userId)
      .select()
      .single();
    
    res.json({ success: true, newDefense: updatedProfile.defense_layer });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
