interface RankingProps {
  ranking: { name: string; time: number; phase: string }[]
  onBack: () => void
}

export default function Ranking({ ranking, onBack }: RankingProps) {
  const sorted = [...ranking].sort((a, b) => a.time - b.time)

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-8">
      <h1 className="text-4xl font-bold text-white mb-8">🏆 Ranking</h1>
      
      <div className="bg-white/10 rounded-xl p-6 max-w-lg w-full">
        {sorted.length === 0 || (sorted.length === 1 && sorted[0].time === 0) ? (
          <p className="text-white/60 text-center">Nenhuma corrida registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {sorted.filter(r => r.time > 0).map((entry, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-400/20' : i === 2 ? 'bg-amber-700/20' : 'bg-white/5'
              }`}>
                <span className="text-2xl w-8">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <p className="text-white font-bold">{entry.name}</p>
                  <p className="text-white/60 text-sm">{entry.phase}</p>
                </div>
                <span className="text-yellow-300 font-mono">{entry.time.toFixed(1)}s</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onBack} className="mt-8 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors">
        ← Voltar
      </button>
    </div>
  )
}
