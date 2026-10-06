import { useState } from 'react'
import { CanoeConfig } from '../App'

interface CanoeSelectProps {
  selectedCanoe: CanoeConfig
  onSelect: (canoe: CanoeConfig) => void
  onBack: () => void
}

const CANOES: CanoeConfig[] = [
  { id: 'basic', name: 'Canoa Básica', color: '#8B4513', speed: 5, control: 5, resistance: 5, unlocked: true },
  { id: 'speed', name: 'Flecha do Rio', color: '#DC143C', speed: 8, control: 3, resistance: 3, unlocked: true },
  { id: 'tank', name: 'Fortaleza', color: '#2F4F4F', speed: 3, control: 5, resistance: 9, unlocked: true },
  { id: 'balanced', name: 'Equilíbrio', color: '#4169E1', speed: 6, control: 6, resistance: 6, unlocked: true },
  { id: 'agile', name: 'Raio Ágil', color: '#FFD700', speed: 4, control: 9, resistance: 4, unlocked: false },
  { id: 'legend', name: 'Lenda do Rio', color: '#9400D3', speed: 8, control: 7, resistance: 7, unlocked: false },
]

export default function CanoeSelect({ selectedCanoe, onSelect, onBack }: CanoeSelectProps) {
  const [canoes] = useState(CANOES)

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950 p-8">
      <h1 className="text-4xl font-bold text-white mb-8">🛶 Selecionar Canoa</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">
        {canoes.map(canoa => (
          <button
            key={canoa.id}
            onClick={() => canoa.unlocked && onSelect(canoa)}
            disabled={!canoa.unlocked}
            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
              selectedCanoe.id === canoa.id 
                ? 'border-yellow-400 bg-white/20 scale-105' 
                : canoa.unlocked 
                  ? 'border-white/30 bg-white/10 hover:bg-white/20 hover:scale-102' 
                  : 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="text-4xl mb-2" style={{ filter: canoa.unlocked ? 'none' : 'grayscale(1)' }}>
              🛶
            </div>
            <div className="w-8 h-8 rounded-full mx-auto mb-2 border-2 border-white/50" 
              style={{ backgroundColor: canoa.color }} />
            <h3 className="text-white font-bold text-sm">{canoa.name}</h3>
            {!canoa.unlocked && <p className="text-yellow-400 text-xs mt-1">🔒 Bloqueada</p>}
            <div className="mt-2 space-y-1">
              <StatBar label="VEL" value={canoa.speed} color="bg-red-500" />
              <StatBar label="CTR" value={canoa.control} color="bg-blue-500" />
              <StatBar label="RES" value={canoa.resistance} color="bg-green-500" />
            </div>
          </button>
        ))}
      </div>

      <button onClick={onBack} className="mt-8 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors">
        ← Voltar
      </button>
    </div>
  )
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-white/60 text-xs w-6">{label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  )
}
