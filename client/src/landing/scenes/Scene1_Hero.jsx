import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const dustParticles = Array.from({ length: 28 })
const introSentence = "don't just store resources. mindloom resurrects them."
const introLines = ["don't just store resources.", 'mindloom resurrects them.']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function Scene1_Hero({ sceneProgress = 0 }) {
  const [autoProgress, setAutoProgress] = useState(0)
  const [showIdleHint, setShowIdleHint] = useState(false)

  useEffect(() => {
    let rafId = 0
    const startAt = performance.now() + 120
    const duration = 1850

    const tick = (now) => {
      const t = clamp((now - startAt) / duration, 0, 1)
      setAutoProgress(t)

      if (t < 1) {
        rafId = window.requestAnimationFrame(tick)
      }
    }

    rafId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [])

  const scrollProgress = clamp((sceneProgress - 0.02) / 0.5, 0, 1)
  const slideRevealFromAuto = clamp((autoProgress - 0.56) / 0.44, 0, 1)
  const slideReveal = Math.max(slideRevealFromAuto, clamp(scrollProgress * 1.35, 0, 1))

  const organizeFromAuto = clamp((autoProgress - 0.68) / 0.32, 0, 1)
  const baseProgress = Math.max(scrollProgress, organizeFromAuto)
  const organize = 1 - (1 - baseProgress) ** 3

  useEffect(() => {
    if (sceneProgress > 0.012) {
      setShowIdleHint(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowIdleHint(true)
    }, 1600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [sceneProgress])

  const taglineRaw = clamp((organize - 0.8) / 0.2, 0, 1)
  const taglineProgress = 1 - (1 - taglineRaw) ** 2
  const clusterQuestionFadeStart = 0.84
  const clusterQuestionFade = clamp((slideReveal - clusterQuestionFadeStart) / 0.12, 0, 1)
  const clusterQuestionOpacity = 1 - clusterQuestionFade

  return (
    <section className="scene-shell scene-shell-hero">
      <div className="dust-field" aria-hidden="true">
        {dustParticles.map((_, index) => (
          <span
            key={index}
            className="dust-particle"
            style={{
              '--x': `${(index * 17) % 100}%`,
              '--y': `${(index * 29) % 100}%`,
              '--delay': `${(index % 7) * 0.6}s`,
              '--duration': `${8 + (index % 9)}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
        className="intro-center"
      >
        <p
          className="cluster-question"
          style={{
            opacity: clusterQuestionOpacity,
            transform: `translateY(${Math.round((1 - clusterQuestionOpacity) * -10)}px)`,
          }}
        >
          are your saved resources clustered?
        </p>
        <div
          style={{
            opacity: slideReveal,
            transform: `translateY(${Math.round((1 - slideReveal) * 18)}px)`,
          }}
        >
          <div className="intro-sentence-block" aria-label={introSentence}>
            {introLines.map((line, lineIndex) => {
              const lineOffset = introLines
                .slice(0, lineIndex)
                .reduce((sum, text) => sum + text.length + 1, 0)

              return (
                <p key={line} className="intro-sentence clutter-line">
                  {line.split('').map((char, charIndex) => {
                    const index = lineOffset + charIndex
                    const scatterX = Math.sin((index + 1) * 1.7) * 42
                    const scatterY = Math.cos((index + 1) * 2.15) * 24
                    const scatterR = Math.sin((index + 1) * 1.28) * 14
                    const x = Math.round(scatterX * (1 - organize))
                    const y = Math.round(scatterY * (1 - organize))
                    const rotate = Math.round(scatterR * (1 - organize))
                    const opacity = 0.25 + organize * 0.75
                    const glow = 0.2 + organize * 0.8

                    return (
                      <span
                        key={`${lineIndex}-${char}-${charIndex}`}
                        className="clutter-char"
                        style={{
                          transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
                          opacity,
                          textShadow: `0 0 ${10 + organize * 20}px rgba(97, 212, 255, ${glow * 0.25})`,
                        }}
                      >
                        {char === ' ' ? '\u00A0' : char}
                      </span>
                    )
                  })}
                </p>
              )
            })}
          </div>
          <p
            className="intro-tagline"
            style={{
              opacity: taglineProgress,
              transform: `translateY(${Math.round((1 - taglineProgress) * 8)}px)`,
            }}
          >
            mindloom organizes what you store.
          </p>
        </div>
      </motion.div>

      {showIdleHint && <p className="scroll-hint">scroll to continue</p>}
    </section>
  )
}
