import React from 'react';
import { Egg, tryHatch, createGhostFromSpecies } from '../models';

interface Props {
  eggs: Egg[];
  onHatch?: (ghostJson: string) => void; // callback with created ghost (as JSON) when hatched
}

export default function EggList({ eggs, onHatch }: Props) {
  const now = Math.floor(Date.now() / 1000);

  const handleHatch = (egg: Egg) => {
    const species = tryHatch(egg, now);
    if (!species) return alert('Not ready yet');
    const ghost = createGhostFromSpecies(species);
    if (onHatch) onHatch(JSON.stringify(ghost));
    alert(`Hatched ${ghost.name}!`);
  };

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-lg font-semibold">Eggs</h3>
      {eggs.length === 0 && <div className="text-sm text-zinc-400">No eggs in incubator.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {eggs.map(e => (
          <div key={e.id} className="p-3 bg-zinc-900 rounded-md border border-white/5">
            <div className="flex justify-between">
              <div>
                <div className="text-sm text-zinc-300">Egg {e.id}</div>
                <div className="text-xs text-zinc-400">Pool: {e.speciesPool.join(', ')}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">{Math.floor(e.progress * 100)}%</div>
                <div className="text-xs text-zinc-500">{now >= e.hatchTime ? 'Ready' : 'Hatching'}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleHatch(e)} className="px-3 py-1 bg-emerald-600 rounded text-sm">Hatch</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
