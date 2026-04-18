import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useNavigate } from 'react-router-dom'
import Scene1_Hero from './scenes/Scene1_Hero'
import Scene2_Problem from './scenes/Scene2_Problem'
import Scene3_Solution from './scenes/Scene3_Solution'
import Scene4_AI from './scenes/Scene4_AI'
import Scene5_Decay from './scenes/Scene5_Decay'
import Scene6_Collab from './scenes/Scene6_Collab'
import Scene7_CTA from './scenes/Scene7_CTA'

gsap.registerPlugin(ScrollTrigger)

const SCENES = [
  { title: 'Opening Impact', Component: Scene1_Hero },
  { title: 'The Problem', Component: Scene2_Problem },
  { title: 'The Solution', Component: Scene3_Solution },
  { title: 'AI Ingestion', Component: Scene4_AI },
  { title: 'Decay System', Component: Scene5_Decay },
  { title: 'Live Collaboration', Component: Scene6_Collab },
  { title: 'Lineage + CTA', Component: Scene7_CTA },
]

const TRANSITION_STYLES = [
  {
    initial: (direction) => ({
      opacity: 0,
      scale: 1.04,
      y: direction > 0 ? 52 : -52,
    }),
    exit: (direction) => ({
      opacity: 0,
      scale: 0.94,
      y: direction > 0 ? -34 : 34,
    }),
  },
  {
    initial: (direction) => ({
      opacity: 0,
      scale: 1.02,
      x: direction > 0 ? 84 : -84,
      rotate: direction > 0 ? 1.8 : -1.8,
    }),
    exit: (direction) => ({
      opacity: 0,
      scale: 0.95,
      x: direction > 0 ? -64 : 64,
      rotate: direction > 0 ? -1.2 : 1.2,
    }),
  },
  {
    initial: (direction) => ({
      opacity: 0,
      scale: 1.08,
      y: direction > 0 ? 26 : -26,
    }),
    exit: (direction) => ({
      opacity: 0,
      scale: 0.9,
      y: direction > 0 ? -20 : 20,
    }),
  },
  {
    initial: (direction) => ({
      opacity: 0,
      scale: 1.03,
      x: direction > 0 ? 42 : -42,
      y: direction > 0 ? 26 : -26,
    }),
    exit: (direction) => ({
      opacity: 0,
      scale: 0.93,
      x: direction > 0 ? -30 : 30,
      y: direction > 0 ? -16 : 16,
    }),
  },
]

const BLOB_MOTION = [
  { parallaxX: 0.52, parallaxY: 0.43, driftX: 34, driftY: 30, tilt: 0.014, speed: 0.0010, phase: 0.2 },
  { parallaxX: -0.46, parallaxY: 0.34, driftX: 31, driftY: 27, tilt: -0.013, speed: 0.00086, phase: 1.4 },
  { parallaxX: 0.3, parallaxY: -0.36, driftX: 25, driftY: 34, tilt: 0.016, speed: 0.0011, phase: 2.2 },
  { parallaxX: -0.4, parallaxY: -0.48, driftX: 36, driftY: 30, tilt: -0.014, speed: 0.00095, phase: 3.0 },
  { parallaxX: 0.42, parallaxY: -0.29, driftX: 27, driftY: 23, tilt: 0.012, speed: 0.0012, phase: 4.1 },
]

const AUTO_ADVANCE_MS = 6000
const AUTO_ADVANCE_COOLDOWN_MS = 2500

export default function ScrollScenes() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const blobRefs = useRef([])
  const blobStateRef = useRef(BLOB_MOTION.map(() => ({ x: 0, y: 0, r: 0 })))
  const activeRef = useRef(0)
  const lastInteractionRef = useRef(Date.now())
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [sceneProgress, setSceneProgress] = useState(0)

  useEffect(() => {
    let targetX = 0.5
    let targetY = 0.5
    let currentX = 0.5
    let currentY = 0.5
    let lastTime = performance.now()
    let rafId = null

    const onPointerMove = (event) => {
      targetX = event.clientX / window.innerWidth
      targetY = event.clientY / window.innerHeight
    }

    const animatePointer = () => {
      const now = performance.now()
      const dt = Math.min(2, (now - lastTime) / 16.67)
      lastTime = now

      currentX += (targetX - currentX) * 0.055 * dt
      currentY += (targetY - currentY) * 0.055 * dt
      document.documentElement.style.setProperty('--mx', currentX.toFixed(4))
      document.documentElement.style.setProperty('--my', currentY.toFixed(4))
      const dx = (currentX - 0.5) * 2 * 170
      const dy = (currentY - 0.5) * 2 * 128

      blobRefs.current.forEach((blob, index) => {
        if (!blob) {
          return
        }

        const cfg = BLOB_MOTION[index]
        const driftX =
          Math.sin(now * cfg.speed + cfg.phase) * cfg.driftX +
          Math.cos(now * cfg.speed * 0.63 + cfg.phase * 1.3) * (cfg.driftX * 0.35)
        const driftY =
          Math.cos(now * cfg.speed * 1.14 + cfg.phase) * cfg.driftY +
          Math.sin(now * cfg.speed * 0.72 + cfg.phase * 0.9) * (cfg.driftY * 0.32)

        const txTarget = dx * cfg.parallaxX + driftX
        const tyTarget = dy * cfg.parallaxY + driftY
        const rotateTarget = dx * cfg.tilt + Math.sin(now * cfg.speed * 0.45 + cfg.phase) * 0.9

        const state = blobStateRef.current[index]
        state.x += (txTarget - state.x) * 0.07 * dt
        state.y += (tyTarget - state.y) * 0.07 * dt
        state.r += (rotateTarget - state.r) * 0.09 * dt

        blob.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) rotate(${state.r.toFixed(2)}deg)`
      })

      rafId = window.requestAnimationFrame(animatePointer)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    animatePointer()

    const lenis = new Lenis({
      smoothWheel: true,
      wheelMultiplier: 1.1,
      lerp: 0.2,
    })

    const ticker = (time) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: () => `+=${(SCENES.length - 1) * window.innerHeight}`,
      scrub: 0.12,
      pin: '.pin-stage',
      anticipatePin: 1,
      onUpdate: (self) => {
        const max = SCENES.length - 1
        const segmented = self.progress * (max + 1)
        const nextIndex = Math.min(max, Math.floor(segmented))
        const nextProgress = Math.min(1, Math.max(0, segmented - nextIndex))
        setSceneProgress(nextProgress)

        if (nextIndex !== activeRef.current) {
          setDirection(nextIndex > activeRef.current ? 1 : -1)
          activeRef.current = nextIndex
          setActiveIndex(nextIndex)
        }
      },
    })

    return () => {
      trigger.kill()
      gsap.ticker.remove(ticker)
      lenis.destroy()
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener('pointermove', onPointerMove)
      ScrollTrigger.getAll().forEach((item) => item.kill())
    }
  }, [])

  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = Date.now()
    }

    window.addEventListener('wheel', markInteraction, { passive: true })
    window.addEventListener('touchstart', markInteraction, { passive: true })
    window.addEventListener('keydown', markInteraction)
    window.addEventListener('pointerdown', markInteraction, { passive: true })

    const timer = window.setInterval(() => {
      if (document.hidden) {
        return
      }

      if (Date.now() - lastInteractionRef.current < AUTO_ADVANCE_COOLDOWN_MS) {
        return
      }

      const container = containerRef.current
      if (!container) {
        return
      }

      const maxIndex = SCENES.length - 1
      if (activeRef.current >= maxIndex) {
        return
      }
      const nextIndex = activeRef.current + 1
      const containerTop = container.getBoundingClientRect().top + window.scrollY
      const targetTop = containerTop + nextIndex * window.innerHeight + 2

      window.scrollTo({ top: targetTop, behavior: 'smooth' })
      lastInteractionRef.current = Date.now()
    }, AUTO_ADVANCE_MS)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('wheel', markInteraction)
      window.removeEventListener('touchstart', markInteraction)
      window.removeEventListener('keydown', markInteraction)
      window.removeEventListener('pointerdown', markInteraction)
    }
  }, [])

  const ActiveScene = SCENES[activeIndex].Component
  const transitionStyle = TRANSITION_STYLES[activeIndex % TRANSITION_STYLES.length]

  return (
    <div
      ref={containerRef}
      style={{ height: `${SCENES.length * 100}vh` }}
      className="relative"
    >
      <div className="pin-stage">
        <div className="ambient-blobs" aria-hidden="true">
          <span className="ambient-blob blob-pink" ref={(el) => { blobRefs.current[0] = el }} />
          <span className="ambient-blob blob-blue" ref={(el) => { blobRefs.current[1] = el }} />
          <span className="ambient-blob blob-lavender" ref={(el) => { blobRefs.current[2] = el }} />
          <span className="ambient-blob blob-mint" ref={(el) => { blobRefs.current[3] = el }} />
          <span className="ambient-blob blob-peach" ref={(el) => { blobRefs.current[4] = el }} />
        </div>

        <div className="scene-overlay" aria-hidden="true" />

        {activeIndex < SCENES.length - 1 && (
          <button
            type="button"
            className="landing-get-started-btn"
            onClick={() => navigate('/register')}
          >
            GET STARTED
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0"
            initial={transitionStyle.initial(direction)}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              rotate: 0,
            }}
            exit={transitionStyle.exit(direction)}
            transition={{ duration: 0.36, ease: [0.3, 0.9, 0.4, 1] }}
          >
            <ActiveScene sceneProgress={sceneProgress} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
