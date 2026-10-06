import { GameSettings } from '../App'

interface SettingsProps {
  settings: GameSettings
  onUpdate: (settings: GameSettings) => void
  onBack: () => void
}

export default function Settings({ settings, onUpdate, onBack }: SettingsProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-800 to-gray-950 p-8">
      <h1 className="text-4xl font-bold text-white mb-8">⚙️ Configurações</h1>
      
      <div className="bg-white/10 rounded-xl p-6 max-w-md w-full space-y-6">
        <div>
          <label className="text-white font-bold block mb-2">🎵 Volume da Música</label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.musicVolume}
            onChange={(e) => onUpdate({ ...settings, musicVolume: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
          <span className="text-white/60 text-sm">{settings.musicVolume}%</span>
        </div>

        <div>
          <label className="text-white font-bold block mb-2">🔊 Volume dos Efeitos</label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.sfxVolume}
            onChange={(e) => onUpdate({ ...settings, sfxVolume: Number(e.target.value) })}
            className="w-full accent-green-500"
          />
          <span className="text-white/60 text-sm">{settings.sfxVolume}%</span>
        </div>

        <div>
          <label className="text-white font-bold block mb-2">📷 Sensibilidade da Câmera</label>
          <input
            type="range"
            min="10"
            max="100"
            value={settings.cameraSensitivity}
            onChange={(e) => onUpdate({ ...settings, cameraSensitivity: Number(e.target.value) })}
            className="w-full accent-purple-500"
          />
          <span className="text-white/60 text-sm">{settings.cameraSensitivity}%</span>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-white font-bold">📊 Mostrar FPS</label>
          <button
            onClick={() => onUpdate({ ...settings, showFPS: !settings.showFPS })}
            className={`px-4 py-2 rounded-lg transition-colors ${
              settings.showFPS ? 'bg-green-500 text-white' : 'bg-gray-600 text-white/60'
            }`}
          >
            {settings.showFPS ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white/5 rounded-xl p-4 max-w-md w-full">
        <h3 className="text-white font-bold mb-2">🎮 Controles</h3>
        <div className="text-white/70 text-sm space-y-1">
          <p><kbd className="bg-white/20 px-2 py-0.5 rounded">W/↑</kbd> Acelerar</p>
          <p><kbd className="bg-white/20 px-2 py-0.5 rounded">S/↓</kbd> Frear</p>
          <p><kbd className="bg-white/20 px-2 py-0.5 rounded">A/←</kbd> Virar esquerda</p>
          <p><kbd className="bg-white/20 px-2 py-0.5 rounded">D/→</kbd> Virar direita</p>
          <p><kbd className="bg-white/20 px-2 py-0.5 rounded">ESPAÇO</kbd> Turbo</p>
          <p><kbd className="bg-white/20 px-2 py-0.5 rounded">ESC</kbd> Pausar</p>
        </div>
      </div>

      <button onClick={onBack} className="mt-8 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors">
        ← Voltar
      </button>
    </div>
  )
}
