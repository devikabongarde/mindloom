import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'

const orbitingLinks = [
  {
    label: 'neural notes',
    left: '8%',
    top: '12%',
    delay: 0,
  },
  {
    label: 'startup docs',
    left: '76%',
    top: '12%',
    delay: 0.12,
  },
  {
    label: 'climate paper',
    left: '84%',
    top: '58%',
    delay: 0.24,
  },
  {
    label: 'ux teardown',
    left: '72%',
    top: '88%',
    delay: 0.36,
  },
  {
    label: 'llm prompt bible',
    left: '12%',
    top: '84%',
    delay: 0.48,
  },
]

const corePills = [
  { label: 'saved', left: '6%', top: '6%', delay: 0.05 },
  { label: 'indexed', right: '6%', top: '6%', delay: 0.14 },
  { label: 'remixed', left: '6%', bottom: '6%', delay: 0.23 },
  { label: 'alive', right: '6%', bottom: '6%', delay: 0.32 },
]

export default function Scene3_Solution() {
  return (
    <section className="scene-shell scene-grid">
      <div className="space-y-6 md:space-y-8">
        <motion.p className="scene-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          THE SOLUTION
        </motion.p>
        <motion.h2
          className="scene-headline"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          Meet ShelfLife
        </motion.h2>
        <motion.p
          className="scene-subline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9 }}
        >
          a living AI-powered archive that organizes itself.
        </motion.p>
      </div>

      <div className="relative flex min-h-[340px] items-center justify-center">
        <motion.div
          className="shelf-core"
          animate={{
            boxShadow: [
              '0 0 50px rgba(0, 216, 255, 0.12)',
              '0 0 80px rgba(141, 95, 255, 0.26)',
              '0 0 50px rgba(0, 216, 255, 0.12)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 5 }}
        >
          <GlassCard className="core-card h-full w-full rounded-[32px] p-7 text-center">
            <div className="core-pill-layer" aria-hidden="true">
              {corePills.map((pill) => (
                <motion.span
                  key={pill.label}
                  className="core-pill"
                  style={{ left: pill.left, right: pill.right, top: pill.top, bottom: pill.bottom }}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 20, delay: pill.delay }}
                >
                  {pill.label}
                </motion.span>
              ))}
            </div>
            <div className="core-copy">
              <p className="scene-eyebrow !tracking-[0.2em]">LIVING SHELF CORE</p>
              <p className="core-subline">Autonomous context curation</p>
            </div>
          </GlassCard>
        </motion.div>

        {orbitingLinks.map((item, index) => {
          return (
            <motion.div
              key={item.label}
              className="orbit-pill"
              style={{ left: item.left, top: item.top }}
              initial={{ opacity: 0, y: 26, scale: 0.8, rotate: -2, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }}
              transition={{
                type: 'spring',
                stiffness: 130,
                damping: 18,
                delay: item.delay,
              }}
            >
              <GlassCard className="soft-pill px-4 py-2 text-xs tracking-[0.15em] text-sky-900">
                {item.label}
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
