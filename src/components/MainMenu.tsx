import { useEffect, useState } from 'react'

interface MainMenuProps {
  onPlay: () => void
  onCanoeSelect: () => void
  onPhaseSelect: () => void
  onRanking: () => void
  onSettings: () => void
}

export default function MainMenu({ onPlay, onCanoeSelect, onPhaseSelect, onRanking, onSettings }: MainMenuProps) {
  const [animate, setAnimate] = useState(false)
  const [waveOffset, setWaveOffset] = useState(0)

  useEffect(() => {
    setAnimate(true)
    const interval = setInterval(() => {
      setWaveOffset(prev => prev + 1)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-500 to-blue-700">
        {/* Sun */}
        <div className="absolute top-10 right-20 w-24 h-24 bg-yellow-300 rounded-full shadow-lg shadow-yellow-300/50 animate-pulse" />
        
        {/* Mountains */}
        <svg className="absolute bottom-40 w-full h-48" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <polygon points="0,200 150,50 300,200" fill="#2d5a27" opacity="0.7" />
          <polygon points="200,200 400,30 600,200" fill="#1a4314" opacity="0.8" />
          <polygon points="500,200 700,60 900,200" fill="#2d5a27" opacity="0.7" />
          <polygon points="800,200 1000,40 1200,200" fill="#1a4314" opacity="0.8" />
        </svg>

        {/* Trees */}
        <div className="absolute bottom-32 left-0 w-full flex justify-around">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="text-4xl" style={{ transform: `translateY(${Math.sin(i + waveOffset * 0.05) * 3}px)` }}>
              🌲
            </div>
          ))}
        </div>

        {/* Water */}
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-blue-900 to-blue-600 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 100" preserveAspectRatio="none">
            {Array.from({ length: 5 }).map((_, i) => (
              <path
                key={i}
                d={`M0,${30 + i * 15} Q${150 + Math.sin(waveOffset * 0.1 + i) * 30},${20 + i * 15} ${300},${35 + i * 15} T${600},${30 + i * 15} T${900},${35 + i * 15} T${1200},${30 + i * 15}`}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
            ))}
          </svg>
          {/* Canoe animation */}
          <div className="absolute bottom-8 text-4xl" style={{ 
            left: `${20 + Math.sin(waveOffset * 0.03) * 5}%`,
            transform: `translateY(${Math.sin(waveOffset * 0.08) * 4}px) rotate(${Math.sin(waveOffset * 0.05) * 3}deg)`
          }}>
            🛶
          </div>
        </div>

        {/* Flags */}
        <div className="absolute top-20 left-10 text-3xl animate-bounce">🚩</div>
        <div className="absolute top-16 left-40 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🏁</div>
      </div>

      {/* Title */}
      <div className={`relative z-10 text-center transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <h1 className="text-6xl md:text-8xl font-bold text-white drop-shadow-lg mb-2"
          style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.5)' }}>
          🛶 GINCANA
        </h1>
        <h2 className="text-4xl md:text-6xl font-bold text-yellow-300 drop-shadow-lg mb-8"
          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          DE CANOAS
        </h2>
        <p className="text-white/80 text-lg mb-12">Aventura e Competição no Rio!</p>
      </div>

      {/* Menu Buttons */}
      <div className={`relative z-10 flex flex-col gap-4 transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <MenuButton onClick={onPlay} emoji="🏁" label="JOGAR" color="from-green-500 to-green-700" />
        <MenuButton onClick={onCanoeSelect} emoji="🛶" label="SELECIONAR CANOA" color="from-amber-500 to-amber-700" />
        <MenuButton onClick={onPhaseSelect} emoji="🗺️" label="SELECIONAR FASE" color="from-blue-500 to-blue-700" />
        <MenuButton onClick={onRanking} emoji="🏆" label="RANKING" color="from-purple-500 to-purple-700" />
        <MenuButton onClick={onSettings} emoji="⚙️" label="CONFIGURAÇÕES" color="from-gray-500 to-gray-700" />
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-white/60 text-sm z-10">
        Use WASD ou Setas para controlar • ESPAÇO para turbo
      </div>
    </div>
  )
}

function MenuButton({ onClick, emoji, label, color }: { onClick: () => void; emoji: string; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-8 py-3 bg-gradient-to-r ${color} text-white font-bold text-lg rounded-xl 
        shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200
        border-2 border-white/20 flex items-center gap-3 min-w-[280px] justify-center`}
    >
      <span className="text-2xl">{emoji}</span>
      <span>{label}</span>
    </button>
  )
}
