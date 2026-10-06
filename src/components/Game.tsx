import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { CanoeConfig, PhaseConfig, GameSettings } from '../App'

interface GameProps {
  canoe: CanoeConfig
  phase: PhaseConfig
  settings: GameSettings
  onFinish: (time: number, position: number) => void
  onQuit: () => void
}

interface Opponent {
  mesh: THREE.Group
  speed: number
  maxSpeed: number
  position: number
  lane: number
  targetLane: number
  behavior: 'fast' | 'balanced' | 'blocker' | 'shortcut' | 'rival'
  stunned: number
  name: string
  color: number
}

interface Obstacle {
  mesh: THREE.Object3D
  type: 'rock' | 'log' | 'waterfall' | 'bridge' | 'barrier' | 'current'
  zPos: number
  xWidth: number
}

interface PowerUp {
  mesh: THREE.Mesh
  type: 'turbo' | 'shield' | 'trap' | 'boost'
  zPos: number
  collected: boolean
}

interface Checkpoint {
  zPos: number
  passed: boolean
  mesh: THREE.Group
}

const RIVER_WIDTH = 28
const TRACK_LENGTH = 1500
const LANES = 5
const LANE_WIDTH = RIVER_WIDTH / LANES

export default function Game({ canoe, phase, settings, onFinish, onQuit }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const gameDataRef = useRef<any>(null)
  const keysRef = useRef<Set<string>>(new Set())

  const [hud, setHud] = useState({
    position: 1,
    speed: 0,
    energy: 100,
    time: 0,
    checkpoints: 0,
    totalCheckpoints: 5,
    countdown: 3,
    raceStarted: false,
    raceFinished: false,
    finalPosition: 0,
    finalTime: 0,
    fps: 60,
    ranking: [] as { name: string; position: number }[],
    shield: false,
    turbo: false,
    paused: false
  })

  const createCanoeMesh = (color: string): THREE.Group => {
    const group = new THREE.Group()
    
    // Hull - elongated shape
    const hullGeom = new THREE.BoxGeometry(1.2, 0.4, 3.5)
    const hullMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(color) })
    const hull = new THREE.Mesh(hullGeom, hullMat)
    hull.position.y = 0.2
    hull.castShadow = true
    
    // Round the front and back
    const front = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1.2, 4),
      hullMat
    )
    front.rotation.x = Math.PI / 2
    front.rotation.y = Math.PI / 4
    front.position.z = -2
    front.position.y = 0.2
    front.castShadow = true
    group.add(front)

    const back = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 0.8, 4),
      hullMat
    )
    back.rotation.x = -Math.PI / 2
    back.rotation.y = Math.PI / 4
    back.position.z = 1.8
    back.position.y = 0.2
    group.add(back)

    group.add(hull)

    // Paddler body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      new THREE.MeshPhongMaterial({ color: 0xFFDBB5 })
    )
    body.position.y = 0.9
    group.add(body)

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshPhongMaterial({ color: 0xFFDBB5 })
    )
    head.position.y = 1.4
    group.add(head)

    // Paddle
    const paddleGroup = new THREE.Group()
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6),
      new THREE.MeshPhongMaterial({ color: 0x8B4513 })
    )
    paddleGroup.add(shaft)
    
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.4, 0.04),
      new THREE.MeshPhongMaterial({ color: 0xA0522D })
    )
    blade.position.y = -0.7
    paddleGroup.add(blade)

    paddleGroup.position.set(0.7, 0.7, 0)
    paddleGroup.rotation.z = 0.4
    group.add(paddleGroup)

    // Shield visual (hidden by default)
    const shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 16),
      new THREE.MeshPhongMaterial({ color: 0x00FF88, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    )
    shieldMesh.visible = false
    shieldMesh.name = 'shield'
    group.add(shieldMesh)

    return group
  }

  const initGame = useCallback(() => {
    if (!containerRef.current) return

    // Clean up previous
    if (gameDataRef.current) {
      cancelAnimationFrame(gameDataRef.current.animId)
      gameDataRef.current.renderer.dispose()
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }
    }

    // Scene
    const scene = new THREE.Scene()
    
    // Sky gradient
    const skyColor = phase.difficulty <= 2 ? 0x87CEEB : phase.difficulty <= 4 ? 0x6B8E9E : 0x4A5568
    scene.background = new THREE.Color(skyColor)
    scene.fog = new THREE.Fog(skyColor, 80, 350)

    // Camera
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 800)
    camera.position.set(0, 7, 10)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xFFF8DC, 1.2)
    sunLight.position.set(30, 80, 30)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 1024
    sunLight.shadow.mapSize.height = 1024
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 300
    sunLight.shadow.camera.left = -60
    sunLight.shadow.camera.right = 60
    sunLight.shadow.camera.top = 60
    sunLight.shadow.camera.bottom = -60
    scene.add(sunLight)

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.3)
    scene.add(hemiLight)

    // Water
    const waterGeom = new THREE.PlaneGeometry(RIVER_WIDTH + 6, TRACK_LENGTH + 100, 40, 150)
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x1E90FF,
      transparent: true,
      opacity: 0.85,
      shininess: 120,
      specular: 0x888888,
    })
    const water = new THREE.Mesh(waterGeom, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.set(0, -0.3, -TRACK_LENGTH / 2)
    water.receiveShadow = true
    scene.add(water)

    // Water foam/ripples
    const foamGeom = new THREE.PlaneGeometry(RIVER_WIDTH + 6, TRACK_LENGTH + 100, 20, 80)
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    })
    const foam = new THREE.Mesh(foamGeom, foamMat)
    foam.rotation.x = -Math.PI / 2
    foam.position.set(0, -0.25, -TRACK_LENGTH / 2)
    scene.add(foam)

    // River banks
    const bankMat = new THREE.MeshLambertMaterial({ color: 0x2E8B2E })
    const bankGeom = new THREE.PlaneGeometry(60, TRACK_LENGTH + 100)
    
    const leftBank = new THREE.Mesh(bankGeom, bankMat)
    leftBank.rotation.x = -Math.PI / 2
    leftBank.position.set(-RIVER_WIDTH / 2 - 30, -0.2, -TRACK_LENGTH / 2)
    leftBank.receiveShadow = true
    scene.add(leftBank)

    const rightBank = new THREE.Mesh(bankGeom, bankMat)
    rightBank.rotation.x = -Math.PI / 2
    rightBank.position.set(RIVER_WIDTH / 2 + 30, -0.2, -TRACK_LENGTH / 2)
    rightBank.receiveShadow = true
    scene.add(rightBank)

    // Sandy edges
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xC2B280 })
    const sandGeom = new THREE.PlaneGeometry(3, TRACK_LENGTH + 100)
    
    const leftSand = new THREE.Mesh(sandGeom, sandMat)
    leftSand.rotation.x = -Math.PI / 2
    leftSand.position.set(-RIVER_WIDTH / 2 - 1.5, -0.15, -TRACK_LENGTH / 2)
    scene.add(leftSand)

    const rightSand = new THREE.Mesh(sandGeom, sandMat)
    rightSand.rotation.x = -Math.PI / 2
    rightSand.position.set(RIVER_WIDTH / 2 + 1.5, -0.15, -TRACK_LENGTH / 2)
    scene.add(rightSand)

    // Trees
    for (let i = 0; i < 80; i++) {
      const treeGroup = new THREE.Group()
      const trunkH = 2 + Math.random() * 2
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.4, trunkH, 6),
        new THREE.MeshLambertMaterial({ color: 0x654321 })
      )
      trunk.position.y = trunkH / 2
      trunk.castShadow = true
      treeGroup.add(trunk)

      const leavesSize = 1.5 + Math.random() * 2
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(leavesSize, leavesSize * 2, 7),
        new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.3, 0.6 + Math.random() * 0.3, 0.2 + Math.random() * 0.2) })
      )
      leaves.position.y = trunkH + leavesSize
      leaves.castShadow = true
      treeGroup.add(leaves)

      const side = Math.random() > 0.5 ? 1 : -1
      treeGroup.position.set(
        side * (RIVER_WIDTH / 2 + 4 + Math.random() * 35),
        0,
        -Math.random() * TRACK_LENGTH
      )
      scene.add(treeGroup)
    }

    // Mountains
    for (let i = 0; i < 12; i++) {
      const mtnH = 25 + Math.random() * 40
      const mtn = new THREE.Mesh(
        new THREE.ConeGeometry(15 + Math.random() * 25, mtnH, 5 + Math.floor(Math.random() * 3)),
        new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.25, 0.3, 0.25 + Math.random() * 0.15) })
      )
      mtn.position.set(
        (Math.random() - 0.5) * 400,
        mtnH / 2 - 5,
        -200 - Math.random() * (TRACK_LENGTH - 200)
      )
      scene.add(mtn)

      // Snow cap
      if (mtnH > 40) {
        const snow = new THREE.Mesh(
          new THREE.ConeGeometry(5, 8, 5),
          new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
        )
        snow.position.copy(mtn.position)
        snow.position.y = mtnH - 8
        scene.add(snow)
      }
    }

    // Player canoe
    const player = createCanoeMesh(canoe.color)
    player.position.set(0, 0.3, -5)
    scene.add(player)

    // Opponents
    const behaviors: Opponent['behavior'][] = ['fast', 'balanced', 'blocker', 'shortcut', 'rival']
    const names = ['Relâmpago', 'Equilibrado', 'Bloqueador', 'Atalheiro', 'Rival Supremo']
    const colors = [0xFF3333, 0x33FF33, 0x3333FF, 0xFFCC00, 0xFF33FF]
    
    const opponents: Opponent[] = behaviors.map((behavior, i) => {
      const canoeMesh = createCanoeMesh(`#${colors[i].toString(16).padStart(6, '0')}`)
      const startLane = i % LANES
      canoeMesh.position.set(
        (startLane - 2) * LANE_WIDTH,
        0.3,
        -8 - i * 2.5
      )
      scene.add(canoeMesh)

      return {
        mesh: canoeMesh,
        speed: 0,
        maxSpeed: behavior === 'fast' ? 0.38 : behavior === 'rival' ? 0.35 : behavior === 'balanced' ? 0.32 : 0.30,
        position: 8 + i * 2.5,
        lane: startLane,
        targetLane: startLane,
        behavior,
        stunned: 0,
        name: names[i],
        color: colors[i]
      }
    })

    // Obstacles
    const obstacles: Obstacle[] = []
    const numObstacles = 25 + phase.difficulty * 8

    for (let i = 0; i < numObstacles; i++) {
      const z = -40 - (i / numObstacles) * (TRACK_LENGTH - 80)
      const lane = Math.floor(Math.random() * LANES)
      const types: Obstacle['type'][] = ['rock', 'log', 'barrier', 'current']
      if (phase.difficulty >= 3) types.push('waterfall')
      if (phase.difficulty >= 2) types.push('bridge')
      const type = types[Math.floor(Math.random() * types.length)]
      
      let mesh: THREE.Object3D
      let xWidth = 2.5

      switch (type) {
        case 'rock': {
          const rockGroup = new THREE.Group()
          const mainRock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.6, 1),
            new THREE.MeshPhongMaterial({ color: 0x555555, flatShading: true })
          )
          mainRock.position.y = 0.5
          mainRock.castShadow = true
          rockGroup.add(mainRock)
          
          if (Math.random() > 0.5) {
            const smallRock = new THREE.Mesh(
              new THREE.DodecahedronGeometry(0.4, 0),
              new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true })
            )
            smallRock.position.set(0.8, 0.3, 0.3)
            rockGroup.add(smallRock)
          }
          mesh = rockGroup
          break
        }
        case 'log': {
          const logGroup = new THREE.Group()
          const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 4, 8),
            new THREE.MeshPhongMaterial({ color: 0x8B4513 })
          )
          log.rotation.z = Math.PI / 2
          log.position.y = 0.3
          log.castShadow = true
          logGroup.add(log)
          
          // Branches
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 0.8, 5),
            new THREE.MeshPhongMaterial({ color: 0x654321 })
          )
          branch.position.set(0.5, 0.6, 0)
          branch.rotation.z = 0.5
          logGroup.add(branch)
          mesh = logGroup
          break
        }
        case 'waterfall': {
          const wfGroup = new THREE.Group()
          const fall = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 0.8),
            new THREE.MeshPhongMaterial({ color: 0x4488FF, transparent: true, opacity: 0.6 })
          )
          fall.position.y = 2.5
          wfGroup.add(fall)
          
          // Mist
          const mist = new THREE.Mesh(
            new THREE.SphereGeometry(2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.2 })
          )
          mist.position.y = 0.5
          wfGroup.add(mist)
          mesh = wfGroup
          xWidth = 4
          break
        }
        case 'bridge': {
          const bridgeGroup = new THREE.Group()
          const bridgeDeck = new THREE.Mesh(
            new THREE.BoxGeometry(RIVER_WIDTH + 6, 0.4, 2.5),
            new THREE.MeshPhongMaterial({ color: 0x8B7355 })
          )
          bridgeDeck.position.y = 3.5
          bridgeDeck.castShadow = true
          bridgeGroup.add(bridgeDeck)
          
          // Railings
          const railMat = new THREE.MeshPhongMaterial({ color: 0x654321 })
          for (let r = -1; r <= 1; r += 2) {
            const rail = new THREE.Mesh(
              new THREE.BoxGeometry(0.15, 1, 2.5),
              railMat
            )
            rail.position.set(r * (RIVER_WIDTH / 2 + 2), 4.2, 0)
            bridgeGroup.add(rail)
          }
          
          // Pillars
          for (let p = -1; p <= 1; p++) {
            const pillar = new THREE.Mesh(
              new THREE.CylinderGeometry(0.3, 0.4, 3.8, 8),
              new THREE.MeshPhongMaterial({ color: 0x555555 })
            )
            pillar.position.set(p * (RIVER_WIDTH / 3), 1.7, 0)
            pillar.castShadow = true
            bridgeGroup.add(pillar)
          }
          mesh = bridgeGroup
          xWidth = RIVER_WIDTH
          break
        }
        case 'barrier': {
          const barrierGroup = new THREE.Group()
          const barrier = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1.2, 0.4),
            new THREE.MeshPhongMaterial({ color: 0xFF6600 })
          )
          barrier.position.y = 0.6
          barrier.castShadow = true
          barrierGroup.add(barrier)
          
          // Stripes
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.3, 0.45),
            new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
          )
          stripe.position.y = 0.6
          barrierGroup.add(stripe)
          mesh = barrierGroup
          break
        }
        case 'current': {
          const currentGroup = new THREE.Group()
          for (let a = 0; a < 4; a++) {
            const arrow = new THREE.Mesh(
              new THREE.ConeGeometry(0.25, 0.8, 4),
              new THREE.MeshPhongMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.5 })
            )
            arrow.rotation.x = Math.PI / 2
            arrow.position.set(a * 1.2 - 1.8, 0.1, 0)
            currentGroup.add(arrow)
          }
          mesh = currentGroup
          xWidth = 4
          break
        }
      }

      mesh.position.x = (lane - 2) * LANE_WIDTH
      mesh.position.z = z
      scene.add(mesh)

      obstacles.push({ mesh, type, zPos: z, xWidth })
    }

    // Power-ups
    const powerUps: PowerUp[] = []
    const puTypes: PowerUp['type'][] = ['turbo', 'shield', 'trap', 'boost']
    const puColors = { turbo: 0xFF0000, shield: 0x00FF88, trap: 0xFF00FF, boost: 0xFFFF00 }

    for (let i = 0; i < 15; i++) {
      const type = puTypes[Math.floor(Math.random() * puTypes.length)]
      const lane = Math.floor(Math.random() * LANES)
      const z = -80 - (i / 15) * (TRACK_LENGTH - 160)

      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5, 0),
        new THREE.MeshPhongMaterial({ 
          color: puColors[type], 
          emissive: puColors[type],
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.9
        })
      )
      mesh.position.set((lane - 2) * LANE_WIDTH, 1.5, z)
      scene.add(mesh)

      // Glow ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.05, 8, 16),
        new THREE.MeshBasicMaterial({ color: puColors[type], transparent: true, opacity: 0.4 })
      )
      ring.position.copy(mesh.position)
      ring.rotation.x = Math.PI / 2
      scene.add(ring)

      powerUps.push({ mesh, type, zPos: z, collected: false })
    }

    // Checkpoints
    const checkpoints: Checkpoint[] = []
    const numCheckpoints = 5

    for (let i = 0; i < numCheckpoints; i++) {
      const z = -(i + 1) * (TRACK_LENGTH / (numCheckpoints + 1))
      
      const gate = new THREE.Group()
      const poleMat = new THREE.MeshPhongMaterial({ color: 0xFFDD00 })
      
      const leftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 8), poleMat)
      leftPole.position.set(-RIVER_WIDTH / 2 + 1, 2.5, 0)
      leftPole.castShadow = true
      gate.add(leftPole)

      const rightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 8), poleMat)
      rightPole.position.set(RIVER_WIDTH / 2 - 1, 2.5, 0)
      rightPole.castShadow = true
      gate.add(rightPole)

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(RIVER_WIDTH - 2, 0.8, 0.15),
        new THREE.MeshPhongMaterial({ color: 0xFF2222 })
      )
      banner.position.y = 4.8
      gate.add(banner)

      // Number on banner
      const numMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 0.2),
        new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
      )
      numMesh.position.y = 4.8
      gate.add(numMesh)

      gate.position.z = z
      scene.add(gate)

      checkpoints.push({ zPos: z, passed: false, mesh: gate })
    }

    // Start line
    const startLine = new THREE.Mesh(
      new THREE.BoxGeometry(RIVER_WIDTH + 2, 0.05, 0.8),
      new THREE.MeshPhongMaterial({ color: 0x00FF00 })
    )
    startLine.position.set(0, 0.05, -2)
    scene.add(startLine)

    // Finish line
    const finishLine = new THREE.Mesh(
      new THREE.BoxGeometry(RIVER_WIDTH + 2, 0.05, 1.5),
      new THREE.MeshPhongMaterial({ color: 0xFF0000 })
    )
    finishLine.position.set(0, 0.05, -TRACK_LENGTH + 5)
    scene.add(finishLine)

    // Checkered pattern on finish
    for (let cx = 0; cx < 8; cx++) {
      for (let cz = 0; cz < 2; cz++) {
        if ((cx + cz) % 2 === 0) {
          const sq = new THREE.Mesh(
            new THREE.BoxGeometry(RIVER_WIDTH / 8, 0.06, 0.75),
            new THREE.MeshPhongMaterial({ color: 0x000000 })
          )
          sq.position.set(-RIVER_WIDTH / 2 + cx * (RIVER_WIDTH / 8) + RIVER_WIDTH / 16, 0.06, -TRACK_LENGTH + 4.5 + cz * 0.75)
          scene.add(sq)
        }
      }
    }

    // Flags
    for (let i = 0; i < 25; i++) {
      const flagGroup = new THREE.Group()
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6),
        new THREE.MeshPhongMaterial({ color: 0x888888 })
      )
      pole.position.y = 1.75
      flagGroup.add(pole)

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.5),
        new THREE.MeshPhongMaterial({ 
          color: [0xFF0000, 0x0000FF, 0xFFFF00, 0x00FF00][i % 4], 
          side: THREE.DoubleSide 
        })
      )
      flag.position.set(0.4, 3.2, 0)
      flagGroup.add(flag)

      const side = i % 2 === 0 ? -1 : 1
      flagGroup.position.set(
        side * (RIVER_WIDTH / 2 + 0.5),
        0,
        -i * (TRACK_LENGTH / 25)
      )
      scene.add(flagGroup)
    }

    // Spectators
    for (let i = 0; i < 40; i++) {
      const specGroup = new THREE.Group()
      const bodyColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
      const specBody = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.6, 4, 6),
        new THREE.MeshPhongMaterial({ color: bodyColor })
      )
      specBody.position.y = 0.7
      specGroup.add(specBody)

      const specHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshPhongMaterial({ color: 0xFFDBB5 })
      )
      specHead.position.y = 1.2
      specGroup.add(specHead)

      const side = Math.random() > 0.5 ? 1 : -1
      specGroup.position.set(
        side * (RIVER_WIDTH / 2 + 2 + Math.random() * 4),
        0,
        -Math.random() * TRACK_LENGTH
      )
      scene.add(specGroup)
    }

    // Clouds
    for (let i = 0; i < 15; i++) {
      const cloud = new THREE.Group()
      for (let c = 0; c < 3 + Math.floor(Math.random() * 3); c++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(3 + Math.random() * 4, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.7 })
        )
        puff.position.set(c * 3 - 4, Math.random() * 2, Math.random() * 2)
        cloud.add(puff)
      }
      cloud.position.set(
        (Math.random() - 0.5) * 300,
        40 + Math.random() * 30,
        -Math.random() * TRACK_LENGTH
      )
      scene.add(cloud)
    }

    // Game data
    const data = {
      scene, camera, renderer,
      player,
      playerSpeed: 0,
      playerPos: 0,
      playerX: 0,
      playerEnergy: 100,
      playerShield: false,
      playerTurbo: false,
      playerStunTime: 0,
      opponents,
      obstacles,
      powerUps,
      checkpoints,
      water,
      foam,
      raceStarted: false,
      raceFinished: false,
      countdown: 3,
      raceTime: 0,
      lastTime: performance.now(),
      animId: 0,
      fps: 60,
      frameCount: 0,
      fpsTimer: performance.now(),
      playerTilt: 0,
      waterSplashParticles: [] as THREE.Mesh[],
    }

    gameDataRef.current = data
    setHud(prev => ({ ...prev, totalCheckpoints: numCheckpoints }))

    // Countdown
    let countVal = 3
    setHud(prev => ({ ...prev, countdown: 3, raceStarted: false }))
    const countInterval = setInterval(() => {
      countVal--
      setHud(prev => ({ ...prev, countdown: countVal }))
      if (countVal <= 0) {
        clearInterval(countInterval)
        data.raceStarted = true
        setHud(prev => ({ ...prev, raceStarted: true }))
      }
    }, 1000)

    // Start render loop
    const animate = () => {
      data.animId = requestAnimationFrame(animate)
      
      const now = performance.now()
      const dt = Math.min((now - data.lastTime) / 1000, 0.05)
      data.lastTime = now

      // FPS
      data.frameCount++
      if (now - data.fpsTimer >= 1000) {
        data.fps = data.frameCount
        data.frameCount = 0
        data.fpsTimer = now
      }

      if (data.raceStarted && !data.raceFinished) {
        data.raceTime += dt
        updateGameLogic(data, dt, now)
      }

      // Always animate water
      animateWater(data, now)

      // Camera follow
      updateCamera(data, dt)

      renderer.render(scene, camera)
    }
    animate()
  }, [canoe, phase])

  const updateGameLogic = (data: any, dt: number, now: number) => {
    const keys = keysRef.current
    const speedMult = canoe.speed / 5
    const controlMult = canoe.control / 5
    const maxSpeed = 0.35 * speedMult
    const turboMaxSpeed = 0.55 * speedMult

    // Player stunned
    if (data.playerStunTime > 0) {
      data.playerStunTime -= dt
      data.playerSpeed *= 0.95
    } else {
      // Acceleration
      if (keys.has('w') || keys.has('arrowup')) {
        data.playerSpeed = Math.min(data.playerSpeed + 0.25 * dt * speedMult, maxSpeed)
      } else if (keys.has('s') || keys.has('arrowdown')) {
        data.playerSpeed = Math.max(data.playerSpeed - 0.4 * dt, -0.05)
      } else {
        data.playerSpeed *= (1 - 1.5 * dt)
        if (data.playerSpeed < 0.01) data.playerSpeed = 0
      }

      // Turbo
      if (keys.has(' ') && data.playerEnergy > 0) {
        data.playerSpeed = Math.min(data.playerSpeed + 0.4 * dt, turboMaxSpeed)
        data.playerEnergy = Math.max(0, data.playerEnergy - 25 * dt)
        data.playerTurbo = true
      } else {
        data.playerTurbo = false
      }

      // Lateral movement
      const lateralSpeed = 10 * controlMult * dt
      let targetTilt = 0
      if (keys.has('a') || keys.has('arrowleft')) {
        data.playerX -= lateralSpeed
        targetTilt = 0.15
      } else if (keys.has('d') || keys.has('arrowright')) {
        data.playerX += lateralSpeed
        targetTilt = -0.15
      }
      data.playerTilt = THREE.MathUtils.lerp(data.playerTilt, targetTilt, dt * 8)

      // Boundaries
      data.playerX = Math.max(-RIVER_WIDTH / 2 + 1.5, Math.min(RIVER_WIDTH / 2 - 1.5, data.playerX))
    }

    // Update position
    data.playerPos += data.playerSpeed
    data.player.position.z = -5 - data.playerPos
    data.player.position.x = data.playerX
    data.player.rotation.z = data.playerTilt
    
    // Bob on water
    data.player.position.y = 0.3 + Math.sin(now * 0.003) * 0.05

    // Energy regen
    data.playerEnergy = Math.min(100, data.playerEnergy + 4 * dt)

    // Shield visual
    const shieldMesh = data.player.getObjectByName('shield')
    if (shieldMesh) shieldMesh.visible = data.playerShield

    // Obstacle collisions
    for (const obs of data.obstacles) {
      const dz = Math.abs(data.player.position.z - obs.mesh.position.z)
      const dx = Math.abs(data.playerX - obs.mesh.position.x)
      
      if (dz < 1.8 && dx < (obs.xWidth / 2 + 0.8)) {
        if (obs.type === 'current') {
          data.playerX += (Math.random() - 0.5) * 4 * dt
          data.playerSpeed *= 0.97
        } else if (obs.type === 'bridge') {
          // Can pass under bridge, but pillars block
          const pillarDist = Math.abs(data.playerX) 
          if (pillarDist < RIVER_WIDTH / 3 + 1 && pillarDist > RIVER_WIDTH / 3 - 1) {
            if (!data.playerShield) {
              data.playerSpeed *= 0.4
              data.playerStunTime = 0.4
            }
          }
        } else {
          if (!data.playerShield) {
            data.playerSpeed *= 0.3
            data.playerStunTime = 0.5
            // Knockback
            data.playerX += (data.playerX > obs.mesh.position.x ? 1 : -1) * 1.5
          }
        }
      }
    }

    // Power-up collection
    for (const pu of data.powerUps) {
      if (pu.collected) continue
      const dz = Math.abs(data.player.position.z - pu.mesh.position.z)
      const dx = Math.abs(data.playerX - pu.mesh.position.x)
      
      if (dz < 2 && dx < 2) {
        pu.collected = true
        pu.mesh.visible = false
        
        switch (pu.type) {
          case 'turbo':
            data.playerSpeed = Math.min(data.playerSpeed + 0.25, turboMaxSpeed)
            break
          case 'shield':
            data.playerShield = true
            setTimeout(() => { if (gameDataRef.current) gameDataRef.current.playerShield = false }, 5000)
            break
          case 'boost':
            data.playerEnergy = Math.min(100, data.playerEnergy + 35)
            break
          case 'trap':
            const nearest = data.opponents.reduce((a: any, b: any) => 
              Math.abs(a.position - data.playerPos) < Math.abs(b.position - data.playerPos) ? a : b
            )
            nearest.stunned = 2.5
            break
        }
      }

      // Animate
      if (!pu.collected) {
        pu.mesh.rotation.y += dt * 3
        pu.mesh.rotation.x += dt * 1.5
        pu.mesh.position.y = 1.5 + Math.sin(now * 0.003 + pu.zPos) * 0.3
      }
    }

    // Checkpoints
    let passedCount = 0
    for (const cp of data.checkpoints) {
      if (!cp.passed && data.playerPos >= -cp.zPos) {
        cp.passed = true
        cp.mesh.children.forEach((child: THREE.Mesh) => {
          if (child.material) {
            (child.material as THREE.MeshPhongMaterial).color.setHex(0x00FF00)
          }
        })
      }
      if (cp.passed) passedCount++
    }

    // Opponent AI
    for (const opp of data.opponents) {
      if (opp.stunned > 0) {
        opp.stunned -= dt
        opp.speed *= 0.92
        opp.mesh.position.z = -5 - opp.position
        continue
      }

      let targetSpeed = opp.maxSpeed
      const distToPlayer = opp.position - data.playerPos

      switch (opp.behavior) {
        case 'fast':
          targetSpeed = opp.maxSpeed * (0.85 + Math.sin(now * 0.001 + opp.color) * 0.2)
          if (Math.random() < 0.003) { // Random mistakes
            targetSpeed *= 0.3
            opp.targetLane = Math.floor(Math.random() * LANES)
          }
          break
        case 'balanced':
          targetSpeed = opp.maxSpeed * 0.95
          break
        case 'blocker':
          targetSpeed = opp.maxSpeed * 0.9
          if (Math.abs(distToPlayer) < 40 && distToPlayer > 0) {
            opp.targetLane = Math.round((data.playerX / LANE_WIDTH) + 2)
            opp.targetLane = Math.max(0, Math.min(LANES - 1, opp.targetLane))
          }
          break
        case 'shortcut':
          targetSpeed = opp.maxSpeed * 0.92
          if (Math.random() < 0.008) {
            // Look for open lane
            let bestLane = opp.lane
            let minObstacles = 999
            for (let l = 0; l < LANES; l++) {
              let obsCount = 0
              for (const obs of data.obstacles) {
                if (obs.mesh.position.z > opp.mesh.position.z - 40 && 
                    obs.mesh.position.z < opp.mesh.position.z &&
                    Math.abs((l - 2) * LANE_WIDTH - obs.mesh.position.x) < 2) {
                  obsCount++
                }
              }
              if (obsCount < minObstacles) {
                minObstacles = obsCount
                bestLane = l
              }
            }
            opp.targetLane = bestLane
          }
          break
        case 'rival':
          targetSpeed = opp.maxSpeed * (0.95 + Math.sin(now * 0.002) * 0.1)
          if (Math.abs(distToPlayer) < 30) {
            opp.targetLane = Math.round((data.playerX / LANE_WIDTH) + 2)
            opp.targetLane = Math.max(0, Math.min(LANES - 1, opp.targetLane))
            targetSpeed *= 1.05
          }
          break
      }

      opp.speed = THREE.MathUtils.lerp(opp.speed, targetSpeed, dt * 2)
      opp.position += opp.speed
      opp.mesh.position.z = -5 - opp.position

      // Lateral movement
      const targetX = (opp.targetLane - 2) * LANE_WIDTH
      opp.mesh.position.x = THREE.MathUtils.lerp(opp.mesh.position.x, targetX, dt * 4)
      opp.lane = opp.targetLane

      // Random lane changes to avoid obstacles
      for (const obs of data.obstacles) {
        const dzToObs = obs.mesh.position.z - opp.mesh.position.z
        if (dzToObs < 0 && dzToObs > -20 && Math.abs(opp.mesh.position.x - obs.mesh.position.x) < obs.xWidth / 2 + 1) {
          opp.targetLane = Math.max(0, Math.min(LANES - 1, 
            opp.lane + (opp.mesh.position.x > obs.mesh.position.x ? 1 : -1)
          ))
        }
      }

      // Collision with player
      const dx = Math.abs(opp.mesh.position.x - data.playerX)
      const dz = Math.abs(opp.mesh.position.z - data.player.position.z)
      if (dx < 1.8 && dz < 2.5) {
        const pushDir = opp.mesh.position.x > data.playerX ? 1 : -1
        opp.mesh.position.x += pushDir * 1.5 * dt * 10
        data.playerX -= pushDir * 1.0 * dt * 10
        opp.speed *= 0.85
        data.playerSpeed *= 0.9
      }

      // Bob on water
      opp.mesh.position.y = 0.3 + Math.sin(now * 0.003 + opp.color) * 0.05
      opp.mesh.rotation.z = Math.sin(now * 0.002 + opp.color) * 0.05
    }

    // Calculate ranking
    const allRacers = [
      { name: 'Você', pos: data.playerPos, isPlayer: true },
      ...data.opponents.map((o: Opponent) => ({ name: o.name, pos: o.position, isPlayer: false }))
    ].sort((a, b) => b.pos - a.pos)

    const playerRank = allRacers.findIndex(r => r.isPlayer) + 1
    const ranking = allRacers.map((r, i) => ({ name: r.name, position: i + 1 }))

    // Check finish
    if (data.playerPos >= TRACK_LENGTH - 10) {
      data.raceFinished = true
      setHud(prev => ({
        ...prev,
        raceFinished: true,
        finalPosition: playerRank,
        finalTime: data.raceTime
      }))
      setTimeout(() => onFinish(data.raceTime, playerRank), 4000)
    }

    // Update HUD
    setHud(prev => ({
      ...prev,
      position: playerRank,
      speed: Math.round(Math.max(0, data.playerSpeed) * 200),
      energy: Math.round(data.playerEnergy),
      time: data.raceTime,
      checkpoints: passedCount,
      fps: data.fps,
      ranking,
      shield: data.playerShield,
      turbo: data.playerTurbo
    }))
  }

  const animateWater = (data: any, now: number) => {
    const positions = (data.water.geometry as THREE.PlaneGeometry).attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const wave = Math.sin(x * 0.3 + now * 0.002) * 0.15 + 
                   Math.cos(y * 0.2 + now * 0.0015) * 0.1 +
                   Math.sin((x + y) * 0.15 + now * 0.001) * 0.08
      positions.setZ(i, wave)
    }
    positions.needsUpdate = true
    data.water.geometry.computeVertexNormals()
  }

  const updateCamera = (data: any, dt: number) => {
    const sensitivity = settings.cameraSensitivity / 50
    const camX = data.playerX * 0.4 * sensitivity
    const camZ = data.player.position.z + 10 + data.playerSpeed * 8
    const camY = 5 + data.playerSpeed * 10

    data.camera.position.x = THREE.MathUtils.lerp(data.camera.position.x, camX, dt * 4)
    data.camera.position.z = THREE.MathUtils.lerp(data.camera.position.z, camZ, dt * 4)
    data.camera.position.y = THREE.MathUtils.lerp(data.camera.position.y, camY, dt * 4)
    
    const lookTarget = new THREE.Vector3(
      data.playerX * 0.3,
      0,
      data.player.position.z - 15
    )
    data.camera.lookAt(lookTarget)
  }

  useEffect(() => {
    initGame()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'Escape') onQuit()
      e.preventDefault()
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    const handleResize = () => {
      if (gameDataRef.current) {
        gameDataRef.current.camera.aspect = window.innerWidth / window.innerHeight
        gameDataRef.current.camera.updateProjectionMatrix()
        gameDataRef.current.renderer.setSize(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', handleResize)
      if (gameDataRef.current) {
        cancelAnimationFrame(gameDataRef.current.animId)
        gameDataRef.current.renderer.dispose()
        if (containerRef.current) {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
          }
        }
      }
    }
  }, [initGame, onQuit, settings.cameraSensitivity])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start">
          {/* Position */}
          <div className="bg-black/70 rounded-xl p-3 backdrop-blur-sm border border-white/10">
            <div className="text-yellow-400 text-4xl font-black leading-none">{hud.position}º</div>
            <div className="text-white/50 text-xs mt-1">Posição</div>
          </div>

          {/* Timer & Phase */}
          <div className="bg-black/70 rounded-xl p-3 backdrop-blur-sm text-center border border-white/10">
            <div className="text-white/50 text-xs">{phase.name}</div>
            <div className="text-white text-2xl font-mono font-bold">{hud.time.toFixed(1)}s</div>
          </div>

          {/* Checkpoints */}
          <div className="bg-black/70 rounded-xl p-3 backdrop-blur-sm border border-white/10">
            <div className="text-green-400 text-2xl font-bold">{hud.checkpoints}/{hud.totalCheckpoints}</div>
            <div className="text-white/50 text-xs">Checkpoints</div>
          </div>
        </div>

        {/* Bottom HUD - Speed & Energy */}
        <div className="absolute bottom-16 left-4 right-4 flex gap-3">
          {/* Speed */}
          <div className="bg-black/70 rounded-xl p-3 backdrop-blur-sm flex-1 max-w-[220px] border border-white/10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/60 text-xs font-bold">VELOCIDADE</span>
              <span className="text-white text-sm font-mono">{hud.speed} km/h</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-100"
                style={{ 
                  width: `${Math.min(100, hud.speed)}%`,
                  background: hud.speed > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #3b82f6)'
                }}
              />
            </div>
          </div>

          {/* Energy */}
          <div className="bg-black/70 rounded-xl p-3 backdrop-blur-sm flex-1 max-w-[220px] border border-white/10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/60 text-xs font-bold">ENERGIA</span>
              <span className="text-white text-sm font-mono">{hud.energy}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${hud.energy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Power-up indicators */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {hud.shield && (
            <div className="bg-green-500/90 rounded-lg px-3 py-1.5 text-white text-sm font-bold flex items-center gap-1 animate-pulse">
              🛡️ ESCUDO
            </div>
          )}
          {hud.turbo && (
            <div className="bg-orange-500/90 rounded-lg px-3 py-1.5 text-white text-sm font-bold flex items-center gap-1 animate-pulse">
              🔥 TURBO
            </div>
          )}
        </div>

        {/* Ranking */}
        <div className="absolute top-20 right-3 bg-black/70 rounded-xl p-3 backdrop-blur-sm border border-white/10 min-w-[140px]">
          <div className="text-white/50 text-xs font-bold mb-2 border-b border-white/10 pb-1">🏁 RANKING</div>
          {hud.ranking.slice(0, 6).map((r, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs py-0.5 ${
              r.name === 'Você' ? 'text-yellow-400 font-bold' : 'text-white/70'
            }`}>
              <span className="w-4 text-center">{r.position}</span>
              <span className="truncate">{r.name}</span>
            </div>
          ))}
        </div>

        {/* FPS */}
        {settings.showFPS && (
          <div className="absolute bottom-4 right-4 bg-black/60 rounded px-2 py-1 text-green-400 text-xs font-mono">
            {hud.fps} FPS
          </div>
        )}

        {/* Countdown */}
        {!hud.raceStarted && hud.countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="text-9xl font-black text-white" style={{ 
                textShadow: '0 0 40px rgba(255,200,0,0.8), 0 0 80px rgba(255,100,0,0.4)',
                animation: 'pulse 0.5s ease-in-out'
              }}>
                {hud.countdown}
              </div>
            </div>
          </div>
        )}

        {/* GO! */}
        {!hud.raceStarted && hud.countdown === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-7xl font-black text-green-400" style={{ 
              textShadow: '0 0 30px rgba(0,255,100,0.8)',
              animation: 'bounce 0.5s ease-in-out'
            }}>
              🏁 VAI! 🏁
            </div>
          </div>
        )}

        {/* Race Finished */}
        {hud.raceFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-b from-gray-900/95 to-black/95 rounded-2xl p-10 text-center border border-white/20 shadow-2xl max-w-md">
              <div className="text-7xl mb-4">
                {hud.finalPosition === 1 ? '🥇' : hud.finalPosition === 2 ? '🥈' : hud.finalPosition === 3 ? '🥉' : '🏁'}
              </div>
              <h2 className="text-5xl font-black text-white mb-3">
                {hud.finalPosition === 1 ? 'VITÓRIA!' : `${hud.finalPosition}º LUGAR`}
              </h2>
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <p className="text-yellow-300 text-2xl font-mono font-bold">{hud.finalTime.toFixed(2)}s</p>
                <p className="text-white/50 text-sm">Tempo final</p>
              </div>
              <p className="text-white/60 text-sm animate-pulse">Retornando ao menu...</p>
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-4 right-4 bg-black/40 rounded-lg px-3 py-2 text-white/40 text-xs">
          <div>WASD/Setas: Mover</div>
          <div>ESPAÇO: Turbo</div>
          <div>ESC: Sair</div>
        </div>
      </div>
    </div>
  )
}
