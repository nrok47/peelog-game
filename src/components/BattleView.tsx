import React, { useState } from 'react';
import { Ghost, createGhostFromSpecies, sampleSkills } from '../models';
import { simulateBattle } from '../battle/simulator';

interface Props {
  onSaveLog?: (log: unknown) => void;
}

export default function BattleView({ onSaveLog }: Props) {
  const [left, setLeft] = useState<Ghost>(() => createGhostFromSpecies('shadow_imp'));
  const [right, setRight] = useState<Ghost>(() => createGhostFromSpecies('ember_wisp'));
  const [logs, setLogs] = useState<any[]>([]);

  const handleSimulate = () => {
    // prepare skill map
    const skillMap = { ...sampleSkills };
    const res = simulateBattle([left], [right], skillMap);
    setLogs(res.logs);
    if (onSaveLog) onSaveLog(res.logs);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Battle Simulator</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-3 rounded">{left.name} (HP: {left.currentHp})</div>
        <div className="bg-zinc-900 p-3 rounded">{right.name} (HP: {right.currentHp})</div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSimulate} className="px-3 py-1 bg-rose-600 rounded">Simulate</button>
      </div>

      <div className="bg-zinc-900 p-3 rounded space-y-2 max-h-64 overflow-auto text-sm">
        {logs.map((l, i) => (
          <div key={i} className="text-zinc-300">[{l.turn}] {l.actorId} → {l.action} {l.targetId ?? ''} {l.detail ?? ''} {l.value ?? ''}</div>
        ))}
      </div>
    </div>
  );
}
