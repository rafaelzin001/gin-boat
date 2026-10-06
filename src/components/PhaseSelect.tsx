import { useState } from 'react'
import { PhaseConfig } from '../App'

interface PhaseSelectProps {
  selectedPhase: PhaseConfig
  onSelect: (phase: PhaseConfig) => void
  onBack: () => void
}

const PHASES: PhaseConfig[] = [
  { id: 'river1', name: 'Rio Sereno', difficulty: 1, unlocked: true, bestTime: null },
  { id: 'river2', name: 'Corredeira Selvagem', difficulty: 2, unlocked: true, bestTime: null },
  { id: 'river3', name: 'Cachoeira do Trovão', difficulty: 3, unlocked: true, bestTime: null },
  { id: 'river4', name: 'Cânion Perigoso', difficulty: 4, unlocked: false, bestTime: null },
  { id: 'river5', name: 'Rio dos Espíritos', difficulty: 5, unlocked: false, bestTime: null },
  { id: 'river6', name: 'Tempestade Final', difficulty: 6, unlocked: false, bestTime: null },
]

export default function PhaseSelect({ selectedPhase, onSelect, onBack }: PhaseSelectProps) {
  const [phases] = useState(PHASES)

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-green-900 to-blue-950 p-8">
      <h1 className="text-4xl font-bold text-white mb-8">🗺️ Selecionar Fase</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">
        {phases.map(phase => (
          <button
            key={phase.id}
            onClick={() => phase.unlocked && onSelect(phase)}
            disabled={!phase.unlocked}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              selectedPhase.id === phase.id 
                ? 'border-yellow-400 bg-white/20 scale-105' 
                : phase.unlocked 
                  ? 'border-white/30 bg-white/10 hover:bg-white/20 hover:scale-102' 
                  : 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="text-4xl mb-2">
              {phase.difficulty <= 2 ? '🏞️' : phase.difficulty <= 4 ? '🌊' : '⚡'}
            </div>
            <h3 className="text-white font-bold">{phase.name}</h3>
            <div className="flex gap-1 justify-center mt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < phase.difficulty ? 'bg-yellow-400' : 'bg-gray-600'}`} />
              ))}
            </div>
            {!phase.unlocked && <p className="text-yellow-400 text-xs mt-2">🔒 Bloqueada</p>}
            {phase.bestTime && (
              <p className="text-green-400 text-xs mt-1">Melhor: {phase.bestTime.toFixed(1)}s</p>
            )}
          </button>
        ))}
      </div>

      <button onClick={onBack} className="mt-8 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors">
        ← Voltar
      </button>
    </div>
  )
}
