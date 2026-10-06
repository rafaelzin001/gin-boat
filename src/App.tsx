import { useState } from 'react'
import MainMenu from './components/MainMenu'
import Game from './components/Game'
import CanoeSelect from './components/CanoeSelect'
import PhaseSelect from './components/PhaseSelect'
import Ranking from './components/Ranking'
import Settings from './components/Settings'

export type GameState = 'menu' | 'canoe-select' | 'phase-select' | 'ranking' | 'settings' | 'playing'

export interface CanoeConfig {
  id: string
  name: string
  color: string
  speed: number
  control: number
  resistance: number
  unlocked: boolean
}

export interface PhaseConfig {
  id: string
  name: string
  difficulty: number
  unlocked: boolean
  bestTime: number | null
}

export interface GameSettings {
  musicVolume: number
  sfxVolume: number
  cameraSensitivity: number
  showFPS: boolean
}

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [selectedCanoe, setSelectedCanoe] = useState<CanoeConfig>({
    id: 'basic',
    name: 'Canoa Básica',
    color: '#8B4513',
    speed: 5,
    control: 5,
    resistance: 5,
    unlocked: true
  })
  const [selectedPhase, setSelectedPhase] = useState<PhaseConfig>({
    id: 'river1',
    name: 'Rio Sereno',
    difficulty: 1,
    unlocked: true,
    bestTime: null
  })
  const [settings, setSettings] = useState<GameSettings>({
    musicVolume: 70,
    sfxVolume: 80,
    cameraSensitivity: 50,
    showFPS: false
  })
  const [ranking, setRanking] = useState<{ name: string; time: number; phase: string }[]>([
    { name: 'Jogador', time: 0, phase: 'Rio Sereno' }
  ])

  const handleFinishRace = (time: number, position: number) => {
    const newRanking = [...ranking]
    const existing = newRanking.find(r => r.name === 'Jogador' && r.phase === selectedPhase.name)
    if (existing) {
      if (time < existing.time || existing.time === 0) {
        existing.time = time
      }
    } else {
      newRanking.push({ name: 'Jogador', time, phase: selectedPhase.name })
    }
    newRanking.sort((a, b) => a.time - b.time)
    setRanking(newRanking)
    setGameState('menu')
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {gameState === 'menu' && (
        <MainMenu
          onPlay={() => setGameState('playing')}
          onCanoeSelect={() => setGameState('canoe-select')}
          onPhaseSelect={() => setGameState('phase-select')}
          onRanking={() => setGameState('ranking')}
          onSettings={() => setGameState('settings')}
        />
      )}
      {gameState === 'canoe-select' && (
        <CanoeSelect
          selectedCanoe={selectedCanoe}
          onSelect={setSelectedCanoe}
          onBack={() => setGameState('menu')}
        />
      )}
      {gameState === 'phase-select' && (
        <PhaseSelect
          selectedPhase={selectedPhase}
          onSelect={setSelectedPhase}
          onBack={() => setGameState('menu')}
        />
      )}
      {gameState === 'ranking' && (
        <Ranking ranking={ranking} onBack={() => setGameState('menu')} />
      )}
      {gameState === 'settings' && (
        <Settings settings={settings} onUpdate={setSettings} onBack={() => setGameState('menu')} />
      )}
      {gameState === 'playing' && (
        <Game
          canoe={selectedCanoe}
          phase={selectedPhase}
          settings={settings}
          onFinish={handleFinishRace}
          onQuit={() => setGameState('menu')}
        />
      )}
    </div>
  )
}

export default App
