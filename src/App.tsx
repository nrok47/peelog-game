import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Ghost, 
  Coins, 
  Zap, 
  Sword, 
  Shield, 
  TrendingUp, 
  Hammer, 
  Skull, 
  ChevronRight,
  User,
  History,
  Info,
  Flame,
  Wind,
  Brain,
  Heart,
  LogOut
} from 'lucide-react';
import BattleView from './components/BattleView';

// Types
interface Profile {
  id: string;
  username: string;
  gold: number;
  energy: number;
  max_energy: number;
  income_per_sec: number;
  defense_layer: number;
}

interface GhostGeneral {
  id: string;
  ghost_type: string;
  level: number;
  exp: number;
  str: number;
  agi: number;
  int: number;
  vit: number;
  head_item_id?: string;
  armor_item_id?: string;
  feet_item_id?: string;
  totalStats: {
    str: number;
    agi: number;
    int: number;
    vit: number;
    acc: number;
    eva: number;
  };
}

interface InventoryItem {
  id: string;
  item_name: string;
  item_type: string;
  slot: string;
  stat_bonus: string;
  income_bonus: number;
  is_equipped: number;
}

interface Target {
  id: string;
  username: string;
  gold: number;
  income_per_sec: number;
  defense_layer: number;
}

interface BattleLog {
  id: string;
  attacker_id: string;
  defender_id: string;
  winner_id: string;
  gold_stolen: number;
  timestamp: number;
  attacker_name: string;
  defender_name: string;
}

const STORAGE_KEY = "spirit_master_user_id";

const GHOST_METADATA: Record<string, { move: string, description: string, color: string }> = {
  'Krasue': { move: 'Head Dash', description: 'Pierces through defenses with high agility.', color: 'text-orange-400' },
  'Krahang': { move: 'Basket Slam', description: 'Heavy area damage with brute force.', color: 'text-zinc-400' },
  'Pret': { move: 'Horrific Scream', description: 'Long range artillery scream with high VIT.', color: 'text-purple-400' },
  'Phi Pop': { move: 'Liver Rip', description: 'Life-stealing attacks that drain enemy essence.', color: 'text-red-400' },
  'Nang Tani': { move: 'Banana Charm', description: 'Supportive spirit that charms and debuffs.', color: 'text-emerald-400' },
  'Phi Tai Hong': { move: 'Vengeance', description: 'Berserker that grows stronger as health drops.', color: 'text-rose-500' },
  'Kuman Thong': { move: 'Windfall', description: 'Lucky spirit that increases plundered gold.', color: 'text-yellow-400' },
  'Nang Nak': { move: 'Long Arm Reach', description: 'Tanker that pulls enemies closer.', color: 'text-blue-400' },
  'Phi Am': { move: 'Chest Press', description: 'Crowd control specialist that locks targets.', color: 'text-indigo-400' },
  'Hun Phayon': { move: 'Guardian Phayon', description: 'Ultimate defender that protects the team.', color: 'text-slate-400' },
  'Krasue Fire': { move: 'Inferno Dash', description: 'Evolved Krasue with burning soul.', color: 'text-orange-600' },
  'Great Garuda': { move: 'Divine Wing', description: 'Evolved Krahang with celestial power.', color: 'text-zinc-600' },
  'Demon Preta': { move: 'Abyssal Howl', description: 'Evolved Pret from the deepest hell.', color: 'text-purple-600' },
  'Ghoul Lord': { move: 'Soul Devour', description: 'Evolved Phi Pop that rules the ghouls.', color: 'text-red-600' },
  'Golden Tani': { move: 'Royal Charm', description: 'Evolved Nang Tani with golden aura.', color: 'text-emerald-600' },
  'Dual Soul': { move: 'Eternal Grudge', description: 'Evolved Phi Tai Hong with two souls.', color: 'text-rose-700' },
  'Divine Kumara': { move: 'Heavenly Fortune', description: 'Evolved Kuman Thong with divine luck.', color: 'text-yellow-600' },
  'Wraith Queen': { move: 'Eternal Embrace', description: 'Evolved Nang Nak that rules the wraiths.', color: 'text-blue-600' },
  'Nightmare King': { move: 'Sleep Paralysis', description: 'Evolved Phi Am that rules the nightmares.', color: 'text-indigo-600' },
  'Iron Golem': { move: 'Unstoppable Wall', description: 'Evolved Hun Phayon made of magical iron.', color: 'text-slate-600' },
};

export default function App() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem(STORAGE_KEY));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ghosts, setGhosts] = useState<GhostGeneral[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<InventoryItem[]>([]);
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ghosts' | 'tycoon' | 'raid'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGhostForEquip, setSelectedGhostForEquip] = useState<{ghostId: string, slot: string} | null>(null);
  const [battleResult, setBattleResult] = useState<{win: boolean, stolen: number, log: string, turns?: string[]} | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [dbStatus, setDbStatus] = useState<any>(null);

  const checkDbStatus = async () => {
    try {
      const res = await fetch('/api/debug/db-status');
      const data = await res.json();
      setDbStatus(data);
    } catch (e) {
      setDbStatus({ error: "Failed to connect" });
    }
  };

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [pRes, gRes, tRes, iRes, eRes, lRes] = await Promise.all([
        fetch(`/api/profile/${userId}`),
        fetch(`/api/ghosts/${userId}`),
        fetch(`/api/targets`),
        fetch(`/api/inventory/${userId}`),
        fetch(`/api/equipment/available/${userId}`),
        fetch(`/api/logs/${userId}`)
      ]);
      
      const pData = await pRes.json();
      const gData = await gRes.json();
      const tData = await tRes.json();
      const iData = await iRes.json();
      const eData = await eRes.json();
      const lData = await lRes.json();
      
      setProfile(pData);
      setGhosts(gData);
      setTargets(tData.filter((t: any) => t.id !== userId));
      setInventory(iData);
      setAvailableEquipment(eData);
      setBattleLogs(lData);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkDbStatus();
    if (userId) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [fetchData, userId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername.length < 3) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
        setLoading(false);
      } else {
        localStorage.setItem(STORAGE_KEY, data.id);
        setUserId(data.id);
        setProfile(data);
      }
    } catch (err) {
      setMessage("Login failed.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
    setProfile(null);
    setActiveTab('dashboard');
  };

  const handleTrain = async (ghostId: string, stat: string) => {
    if (!userId) return;
    try {
      const res = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ghostId, statType: stat })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Training successful! ${stat.toUpperCase()} increased.`);
        fetchData();
      }
    } catch (err) {
      setMessage("Training failed.");
    }
  };

  const handleEvolve = async (ghostId: string) => {
    try {
      const res = await fetch('/api/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghostId })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Evolution successful! The spirit has transformed.`);
        fetchData();
      }
    } catch (err) {
      setMessage("Evolution failed.");
    }
  };

  const handleEquip = async (itemId: string) => {
    if (!selectedGhostForEquip) return;
    try {
      const res = await fetch('/api/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ghostId: selectedGhostForEquip.ghostId, 
          itemId, 
          slot: selectedGhostForEquip.slot 
        })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Item equipped successfully.`);
        setSelectedGhostForEquip(null);
        fetchData();
      }
    } catch (err) {
      setMessage("Equipping failed.");
    }
  };

  const handleUnequip = async () => {
    if (!selectedGhostForEquip) return;
    try {
      const res = await fetch('/api/unequip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ghostId: selectedGhostForEquip.ghostId, 
          slot: selectedGhostForEquip.slot 
        })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Item unequipped.`);
        setSelectedGhostForEquip(null);
        fetchData();
      }
    } catch (err) {
      setMessage("Unequipping failed.");
    }
  };

  const handleUpgradeDefense = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/upgrade/defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Defense upgraded! Your syndicate is now more secure.`);
        fetchData();
      }
    } catch (err) {
      setMessage("Upgrade failed.");
    }
  };

  const handleCraft = async (name: string, cost: number, income: number) => {
    if (!userId) return;
    try {
      const res = await fetch('/api/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemName: name, cost, incomeBonus: income })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Crafted ${name}! Passive income increased.`);
        fetchData();
      }
    } catch (err) {
      setMessage("Crafting failed.");
    }
  };

  const handleHatch = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/hatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        setMessage("A new spirit has hatched from the occult egg!");
        fetchData();
      } else {
        setMessage(data.error || "Failed to hatch egg");
      }
    } catch (e) {
      setMessage("Connection error");
    }
  };

  const handleRaid = async (targetId: string) => {
    if (!userId) return;
    try {
      const res = await fetch('/api/raid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackerId: userId, defenderId: targetId })
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setBattleResult({ win: data.win, stolen: data.stolen, log: data.battleLog });
        fetchData();
      }
    } catch (err) {
      setMessage("Raid failed.");
    }
  };

  const handleSaveBattleLog = async (logs: unknown[]) => {
    try {
      const battleId = `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
      await fetch('/api/save-battle-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, events: logs })
      });
    } catch (e) {
      console.warn('Failed to save battle log', e);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0c0c0c] text-orange-500 font-mono">
      <motion.div 
        animate={{ opacity: [0.4, 1, 0.4] }} 
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-2xl tracking-widest"
      >
        SUMMONING SPIRITS...
      </motion.div>
    </div>
  );

  if (!userId) return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2.5rem] p-10 max-w-md w-full border border-white/5 text-center"
      >
        <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-900/40">
          <Skull className="text-white w-10 h-10" />
        </div>
        <h1 className="font-serif italic text-4xl text-white mb-2">Spirit Master</h1>
        <p className="text-orange-500 font-bold uppercase tracking-widest text-[10px] mb-8">Thai Occult Syndicate</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-2">Syndicate Name</label>
            <input 
              type="text" 
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20"
          >
            Enter the Shadows
          </button>
        </form>
        
        {message && <p className="mt-6 text-red-400 text-xs font-mono">{message}</p>}
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-300 font-sans selection:bg-orange-500/30">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Skull className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif italic text-xl text-white tracking-tight">Spirit Master</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-bold">Thai Occult Syndicate</p>
          </div>
        </div>

        <div className="flex gap-6 items-center">
          <StatItem icon={<Coins className="w-4 h-4 text-yellow-500" />} label="Gold" value={profile?.gold.toLocaleString() || "0"} />
          <StatItem icon={<Zap className="w-4 h-4 text-cyan-400" />} label="Energy" value={`${profile?.energy}/${profile?.max_energy}`} />
          <StatItem icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Income" value={`+${profile?.income_per_sec.toFixed(1)}/s`} />
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-32 px-6 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="md:col-span-2 space-y-6">
                <section className="glass rounded-3xl p-8 neon-border relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Ghost size={120} />
                  </div>
                  <h2 className="font-serif italic text-3xl text-white mb-2">Welcome, {profile?.username}</h2>
                  <p className="text-zinc-500 max-w-md mb-8">Your syndicate is growing. The spirits whisper of new opportunities in the shadows of the city.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DashboardCard 
                      title="Active Spirits" 
                      value={ghosts.length.toString()} 
                      icon={<Ghost className="text-orange-500" />}
                      onClick={() => setActiveTab('ghosts')}
                    />
                    <DashboardCard 
                      title="Defense Layer" 
                      value={profile?.defense_layer.toString() || "0"} 
                      icon={<Shield className="text-cyan-500" />}
                      onClick={handleUpgradeDefense}
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass rounded-3xl p-6 border-white/5">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Shield className="w-3 h-3" /> My Inventory
                    </h3>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {inventory.length > 0 ? (
                        inventory.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <div>
                              <p className="text-xs font-bold text-white">{item.item_name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {item.item_type === 'EQUIPMENT' 
                                  ? Object.entries(JSON.parse(item.stat_bonus)).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')
                                  : `+${item.income_bonus}/s Income`}
                              </p>
                            </div>
                            {item.is_equipped === 1 && (
                              <span className="text-[8px] uppercase tracking-widest bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full font-bold">Equipped</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-600 italic">Inventory is empty.</p>
                      )}
                    </div>
                  </div>
                  <div className="glass rounded-3xl p-6 border-white/5">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <History className="w-3 h-3" /> Battle History
                    </h3>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {battleLogs.length > 0 ? (
                        battleLogs.map(log => {
                          const isAttacker = log.attacker_id === userId;
                          const won = log.winner_id === userId;
                          return (
                            <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                              <div>
                                <p className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1">
                                  {isAttacker ? 'Offensive' : 'Defensive'}
                                </p>
                                <p className="text-xs text-white truncate max-w-[100px]">
                                  {isAttacker ? log.defender_name : log.attacker_name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-[10px] font-bold ${won ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {won ? 'WIN' : 'LOSS'}
                                </p>
                                {log.gold_stolen > 0 && (
                                  <p className="text-[9px] font-mono text-zinc-400">
                                    {won ? '+' : '-'}{log.gold_stolen} G
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-zinc-600 italic">No recent battles.</p>
                      )}
                    </div>
                  </div>
                  <div className="glass rounded-3xl p-6 border-white/5 md:col-span-2">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Info className="w-3 h-3" /> Tactical Intel
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                        <p className="text-[9px] font-bold text-cyan-500 uppercase mb-1">Defense Layer</p>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          Syndicate defense scales with <span className="text-white">VIT</span>. High VIT amplifies Defense Layer.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                        <p className="text-[9px] font-bold text-orange-500 uppercase mb-1">ACC vs EVA</p>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          Raids use <span className="text-white">ACC</span> vs <span className="text-white">EVA</span>. Missed attacks fail instantly.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                        <p className="text-[9px] font-bold text-purple-500 uppercase mb-1">Critical Hits</p>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          High <span className="text-white">INT</span> increases Critical Hit chance (1.5x damage).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-[2rem] p-8 border-white/5 md:col-span-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <TrendingUp size={120} />
                    </div>
                    <h3 className="font-serif italic text-2xl text-white mb-4">Syndicate Progression</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Sword size={16} />
                          </div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-widest">The Fighter Path</h4>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Focus on training your <span className="text-orange-400">Ghost Generals</span>. High STR and AGI allow you to plunder massive wealth from other syndicates.
                        </p>
                        <div className="flex gap-2">
                          <span className="text-[8px] px-2 py-1 rounded bg-orange-500/10 text-orange-500 font-bold">RAIDING</span>
                          <span className="text-[8px] px-2 py-1 rounded bg-orange-500/10 text-orange-500 font-bold">STATS TRAINING</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <TrendingUp size={16} />
                          </div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-widest">The Tycoon Path</h4>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Focus on <span className="text-emerald-400">Occult Crafting</span> and <span className="text-cyan-400">Defense Grid</span>. Generate passive income and protect your hoard from hunters.
                        </p>
                        <div className="flex gap-2">
                          <span className="text-[8px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-bold">PASSIVE INCOME</span>
                          <span className="text-[8px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-500 font-bold">DEFENSE GRID</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-6 border-white/5 md:col-span-2">
                    <BattleView onSaveLog={handleSaveBattleLog} />
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <div className="glass rounded-3xl p-6 border-white/5">
                  <h3 className="font-serif italic text-xl text-white mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <ActionButton icon={<Sword />} label="Raid Syndicate" onClick={() => setActiveTab('raid')} />
                    <ActionButton icon={<Hammer />} label="Craft Talisman" onClick={() => setActiveTab('tycoon')} />
                    <ActionButton icon={<User />} label="Manage Spirits" onClick={() => setActiveTab('ghosts')} />
                  </div>
                </div>

                {dbStatus && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-500 space-y-1">
                    <p className="uppercase tracking-widest font-bold mb-2">Supabase Status</p>
                    <div className="flex justify-between">
                      <span>Profiles:</span>
                      <span className={dbStatus.profiles?.includes('OK') ? 'text-emerald-500' : 'text-red-500'}>{dbStatus.profiles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ghosts:</span>
                      <span className={dbStatus.ghosts?.includes('OK') ? 'text-emerald-500' : 'text-red-500'}>{dbStatus.ghosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inventory:</span>
                      <span className={dbStatus.inventory?.includes('OK') ? 'text-emerald-500' : 'text-red-500'}>{dbStatus.inventory}</span>
                    </div>
                  </div>
                )}
                
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium"
                  >
                    {message}
                    <button onClick={() => setMessage(null)} className="ml-2 opacity-50 hover:opacity-100">×</button>
                  </motion.div>
                )}
              </aside>
            </motion.div>
          )}

          {activeTab === 'ghosts' && (
            <motion.div 
              key="ghosts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="font-serif italic text-4xl text-white">Ghost Generals</h2>
                  <p className="text-zinc-500">Train and evolve your spirits to dominate the occult world.</p>
                </div>
                <button 
                  onClick={handleHatch}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-900/20 hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <Plus size={18} /> HATCH OCCULT EGG (1,000 G)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {ghosts.map(ghost => (
                  <div key={ghost.id} className="glass rounded-[2rem] p-8 border-white/5 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-shrink-0 flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-600/20 to-purple-600/20 flex items-center justify-center border border-white/10 animate-float">
                          <Ghost size={64} className={GHOST_METADATA[ghost.ghost_type]?.color.replace('text-', 'text-') || 'text-orange-500'} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-mono text-orange-500 font-bold">LVL {ghost.level}</span>
                          <h3 className={`text-xl font-serif ${GHOST_METADATA[ghost.ghost_type]?.color || 'text-white'}`}>{ghost.ghost_type}</h3>
                          <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">{GHOST_METADATA[ghost.ghost_type]?.move || 'Normal Attack'}</p>
                        </div>
                        <div className="max-w-[120px] text-center">
                          <p className="text-[9px] text-zinc-600 leading-tight italic">{GHOST_METADATA[ghost.ghost_type]?.description || 'A mysterious spirit from the occult world.'}</p>
                        </div>
                        {ghost.level >= 10 && (
                          <button 
                            onClick={() => handleEvolve(ghost.id)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold shadow-lg shadow-orange-900/20 hover:scale-105 transition-transform"
                          >
                            EVOLVE
                          </button>
                        )}
                      </div>

                      <div className="flex-grow space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <StatBar 
                            icon={<Flame className="w-3 h-3" />} 
                            label="STR" 
                            base={ghost.str} 
                            total={ghost.totalStats.str} 
                            color="bg-red-500" 
                            onTrain={() => handleTrain(ghost.id, 'str')} 
                          />
                          <StatBar 
                            icon={<Wind className="w-3 h-3" />} 
                            label="AGI" 
                            base={ghost.agi} 
                            total={ghost.totalStats.agi} 
                            color="bg-cyan-500" 
                            onTrain={() => handleTrain(ghost.id, 'agi')} 
                          />
                          <StatBar 
                            icon={<Brain className="w-3 h-3" />} 
                            label="INT" 
                            base={ghost.int} 
                            total={ghost.totalStats.int} 
                            color="bg-purple-500" 
                            onTrain={() => handleTrain(ghost.id, 'int')} 
                          />
                          <StatBar 
                            icon={<Heart className="w-3 h-3" />} 
                            label="VIT" 
                            base={ghost.vit} 
                            total={ghost.totalStats.vit} 
                            color="bg-emerald-500" 
                            onTrain={() => handleTrain(ghost.id, 'vit')} 
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Accuracy</span>
                            <span className="text-[10px] font-mono text-white">{ghost.totalStats.acc}%</span>
                          </div>
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Evasion</span>
                            <span className="text-[10px] font-mono text-white">{ghost.totalStats.eva}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Equipment Slots */}
                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4">Equipment</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <EquipSlot 
                          label="Head" 
                          itemId={ghost.head_item_id} 
                          inventory={inventory} 
                          onClick={() => setSelectedGhostForEquip({ghostId: ghost.id, slot: 'HEAD'})} 
                        />
                        <EquipSlot 
                          label="Armor" 
                          itemId={ghost.armor_item_id} 
                          inventory={inventory} 
                          onClick={() => setSelectedGhostForEquip({ghostId: ghost.id, slot: 'ARMOR'})} 
                        />
                        <EquipSlot 
                          label="Feet" 
                          itemId={ghost.feet_item_id} 
                          inventory={inventory} 
                          onClick={() => setSelectedGhostForEquip({ghostId: ghost.id, slot: 'FEET'})} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'tycoon' && (
            <motion.div 
              key="tycoon"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="font-serif italic text-4xl text-white">Occult Tycoon</h2>
                <p className="text-zinc-500">Craft sacred items to generate passive income for the syndicate.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Occult Crafting</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <ShopItem 
                      name="Yantra Cloth" 
                      desc="Basic protection that attracts small donations." 
                      cost={500} 
                      income={2} 
                      onCraft={() => handleCraft("Yantra Cloth", 500, 2)} 
                    />
                    <ShopItem 
                      name="Kuman Thong" 
                      desc="A golden child spirit that brings luck and wealth." 
                      cost={2500} 
                      income={15} 
                      onCraft={() => handleCraft("Kuman Thong", 2500, 15)} 
                    />
                    <ShopItem 
                      name="Lek Lai" 
                      desc="Rare mystical metal that resonates with cosmic energy." 
                      cost={10000} 
                      income={80} 
                      onCraft={() => handleCraft("Lek Lai", 10000, 80)} 
                    />
                    <ShopItem 
                      name="Sacred Relic" 
                      desc="A powerful ancient artifact that generates massive wealth." 
                      cost={50000} 
                      income={500} 
                      onCraft={() => handleCraft("Sacred Relic", 50000, 500)} 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Defense Grid</h3>
                  <div className="glass rounded-[2rem] p-8 border-white/5 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-500">
                        <Shield size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Current Defense</p>
                        <p className="text-2xl font-mono text-white">{profile?.defense_layer} DF</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-zinc-400 leading-relaxed italic">
                      "Strengthen your syndicate's spiritual barrier to reduce gold lost during raids."
                    </p>

                    <button 
                      onClick={handleUpgradeDefense}
                      className="w-full py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/20 flex flex-col items-center gap-1"
                    >
                      <span>UPGRADE DEFENSE GRID</span>
                      <span className="text-[10px] opacity-70 font-mono">COST: {((profile?.defense_layer || 0) / 5 + 1) * 1000} G</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'raid' && (
            <motion.div 
              key="raid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div>
                <h2 className="font-serif italic text-4xl text-white">Syndicate Raids</h2>
                <p className="text-zinc-500">Plunder other syndicates to expand your influence.</p>
              </div>

              <div className="glass rounded-[2rem] overflow-hidden border-white/5">
                <div className="px-8 py-4 bg-white/5 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" /> Syndicate Rankings
                  </h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Syndicate</th>
                      <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Wealth</th>
                      <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Defense</th>
                      <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Income</th>
                      <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(target => (
                      <tr key={target.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-500">
                              <User size={16} />
                            </div>
                            <span className="text-white font-medium">{target.username}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-yellow-500/80 font-mono">{target.gold.toLocaleString()} G</td>
                        <td className="px-8 py-6 text-cyan-500/80 font-mono">{target.defense_layer} DF</td>
                        <td className="px-8 py-6 text-emerald-500/80 font-mono">+{target.income_per_sec}/s</td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => handleRaid(target.id)}
                            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-lg shadow-orange-900/20 group-hover:scale-105 active:scale-95"
                          >
                            RAID (20 EN)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Battle Result Modal */}
      <AnimatePresence>
        {battleResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className={`glass rounded-[2.5rem] p-10 max-w-lg w-full border ${battleResult.win ? 'border-emerald-500/30' : 'border-red-500/30'} text-center relative overflow-hidden`}
            >
              {/* Decorative background */}
              <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] opacity-20 ${battleResult.win ? 'bg-emerald-500' : 'bg-red-500'}`} />
              
              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${battleResult.win ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                  {battleResult.win ? <TrendingUp size={40} /> : <Skull size={40} />}
                </div>
                
                <h3 className={`font-serif italic text-4xl mb-2 ${battleResult.win ? 'text-emerald-400' : 'text-red-400'}`}>
                  {battleResult.win ? 'VICTORY' : 'DEFEAT'}
                </h3>
                
                <p className="text-zinc-400 mb-8 font-mono text-sm leading-relaxed italic">
                  "{battleResult.log}"
                </p>

                {battleResult.turns && (
                  <div className="bg-black/40 rounded-2xl p-4 mb-8 text-left space-y-2 max-h-[200px] overflow-y-auto border border-white/5">
                    {battleResult.turns.map((turn, i) => (
                      <p key={i} className="text-[10px] font-mono text-zinc-400 border-l-2 border-white/10 pl-3 py-1">
                        {turn}
                      </p>
                    ))}
                  </div>
                )}
                
                {battleResult.win && (
                  <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">Plundered Wealth</p>
                    <div className="flex items-center justify-center gap-3">
                      <Coins className="text-yellow-500" size={24} />
                      <span className="text-3xl font-mono text-white font-bold">+{battleResult.stolen.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => setBattleResult(null)}
                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest transition-all ${battleResult.win ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                >
                  Return to Syndicate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equipment Selection Modal */}
      <AnimatePresence>
        {selectedGhostForEquip && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass rounded-3xl p-8 max-w-md w-full border border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif italic text-2xl text-white">Select {selectedGhostForEquip.slot}</h3>
                <button onClick={() => setSelectedGhostForEquip(null)} className="text-zinc-500 hover:text-white">×</button>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {/* Unequip Option */}
                {ghosts.find(g => g.id === selectedGhostForEquip.ghostId)?.[`${selectedGhostForEquip.slot.toLowerCase()}_item_id` as keyof GhostGeneral] && (
                  <button 
                    onClick={handleUnequip}
                    className="w-full p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-2 mb-4"
                  >
                    <LogOut size={14} /> UNEQUIP CURRENT ITEM
                  </button>
                )}

                {availableEquipment.filter(item => item.slot === selectedGhostForEquip.slot).length > 0 ? (
                  availableEquipment.filter(item => item.slot === selectedGhostForEquip.slot).map(item => (
                    <button 
                      key={item.id}
                      onClick={() => handleEquip(item.id)}
                      className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
                    >
                      <p className="text-sm font-bold text-white mb-1">{item.item_name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {Object.entries(JSON.parse(item.stat_bonus)).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-zinc-500 py-8 italic">No available items for this slot.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-3 border border-white/10 flex gap-2 z-50 shadow-2xl">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp size={20} />} label="Home" />
        <NavButton active={activeTab === 'ghosts'} onClick={() => setActiveTab('ghosts')} icon={<Ghost size={20} />} label="Spirits" />
        <NavButton active={activeTab === 'tycoon'} onClick={() => setActiveTab('tycoon')} icon={<Hammer size={20} />} label="Tycoon" />
        <NavButton active={activeTab === 'raid'} onClick={() => setActiveTab('raid')} icon={<Sword size={20} />} label="Raid" />
      </nav>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
      </div>
      <span className="text-sm font-mono text-white font-medium">{value}</span>
    </div>
  );
}

function DashboardCard({ title, value, icon, onClick }: { title: string, value: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="glass rounded-2xl p-6 border-white/5 hover:border-white/10 transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">{title}</p>
      <p className="text-2xl font-serif text-white">{value}</p>
    </button>
  );
}

function ActivityItem({ text, time }: { text: string, time: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <p className="text-xs text-zinc-400 truncate">{text}</p>
      <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{time}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="text-orange-500 group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      </div>
      <ChevronRight size={16} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${active ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
    >
      {icon}
      {active && <span className="text-xs font-bold uppercase tracking-widest">{label}</span>}
    </button>
  );
}

function StatBar({ icon, label, base, total, color, onTrain }: { icon: React.ReactNode, label: string, base: number, total: number, color: string, onTrain: () => void }) {
  const percentage = Math.min(100, (total / 100) * 100);
  const bonus = total - base;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className={color.replace('bg-', 'text-')}>{icon}</span>
          <span className="text-[10px] font-bold text-zinc-500">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-white">{total}</span>
          {bonus > 0 && <span className="text-[8px] font-mono text-emerald-500">+{bonus}</span>}
        </div>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex items-center">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
      <button 
        onClick={onTrain}
        className="w-full py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        TRAIN (10 EN)
      </button>
    </div>
  );
}

function EquipSlot({ label, itemId, inventory, onClick }: { label: string, itemId?: string, inventory: InventoryItem[], onClick: () => void }) {
  const item = inventory.find(i => i.id === itemId);
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      <div className={`w-full aspect-square rounded-2xl border flex items-center justify-center transition-all ${item ? 'bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-900/10' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
        {item ? <Shield size={20} className="text-orange-500" /> : <Info size={16} className="text-zinc-700" />}
      </div>
      <div className="text-center">
        <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">{label}</p>
        <p className="text-[10px] text-zinc-400 truncate max-w-[80px]">{item ? item.item_name : 'Empty'}</p>
      </div>
    </button>
  );
}

function ShopItem({ name, desc, cost, income, onCraft }: { name: string, desc: string, cost: number, income: number, onCraft: () => void }) {
  return (
    <div className="glass rounded-3xl p-6 border-white/5 flex flex-col h-full">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
        <Hammer size={24} />
      </div>
      <h3 className="text-xl font-serif text-white mb-2">{name}</h3>
      <p className="text-xs text-zinc-500 mb-6 flex-grow">{desc}</p>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500">Income</span>
          <span className="text-emerald-500 font-mono">+{income}/s</span>
        </div>
        <button 
          onClick={onCraft}
          className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Coins size={14} className="text-yellow-500" />
          CRAFT FOR {cost.toLocaleString()} G
        </button>
      </div>
    </div>
  );
}

