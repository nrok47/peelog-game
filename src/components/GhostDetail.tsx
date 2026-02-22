import React from 'react';
import { Ghost, Skill, sampleSkills } from '../models';

interface Props {
  ghost: Ghost;
  onTrain?: (stat: string, amount?: number) => void;
}

export default function GhostDetail({ ghost, onTrain }: Props) {
  if (!ghost) return null;
  return (
    <div className="p-4 bg-zinc-900 rounded-md border border-white/5">
      <h3 className="text-lg font-semibold">{ghost.name} (Lv {ghost.level})</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        {Object.entries(ghost.stats).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <div className="text-zinc-300">{k.toUpperCase()}</div>
            <div className="font-medium">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="text-sm text-zinc-400">Skill Slots</div>
        <div className="flex gap-2 mt-2">
          {ghost.skillSlots.map((s, i) => (
            <div key={i} className="px-2 py-1 bg-zinc-800 rounded text-sm">
              {s ? (sampleSkills[s as keyof typeof sampleSkills]?.name ?? s) : 'Empty'}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => onTrain?.('atk', 1)} className="px-3 py-1 bg-amber-600 rounded text-sm">Train ATK</button>
        <button onClick={() => onTrain?.('hp', 5)} className="px-3 py-1 bg-emerald-600 rounded text-sm">Train HP</button>
      </div>
    </div>
  );
}
