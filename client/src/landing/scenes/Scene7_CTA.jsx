import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'

const remixNodes = [
  { label: 'ai digest shelf', meta: 'fork v2', left: '70%', top: '22%', delay: 0.12 },
  { label: 'design vault', meta: 'team remix', left: '78%', top: '44%', delay: 0.24 },
  { label: 'research timeline', meta: 'community fork', left: '66%', top: '66%', delay: 0.36 },
  { label: 'product notes', meta: 'private branch', left: '44%', top: '72%', delay: 0.48 },
]

export default function Scene7_CTA() {
  const navigate = useNavigate()

  return (
    <section className="scene-shell scene-grid">
      <div className="space-y-6 md:space-y-8">
        <p className="scene-eyebrow">LINEAGE + CTA</p>
        <h2 className="scene-headline">knowledge evolves when shared.</h2>
        <p className="scene-subline">build. save. decay. remix.</p>

        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="cta-button"
            onClick={() => navigate('/register')}
          >
            ENTER THE LIVING ARCHIVE
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="cta-button"
            onClick={() => navigate('/login')}
          >
            I ALREADY HAVE AN ACCOUNT
          </motion.button>
        </div>
      </div>

      <GlassCard className="lineage-map">
        <div className="lineage-root-wrap">
          <motion.div
            className="lineage-root"
            animate={{ boxShadow: ['0 0 0 rgba(132, 176, 255, 0)', '0 0 22px rgba(132, 176, 255, 0.55)', '0 0 0 rgba(132, 176, 255, 0)'] }}
            transition={{ repeat: Infinity, duration: 2.6 }}
          >
            <p>origin shelf</p>
            <span>base archive</span>
          </motion.div>
        </div>

        {remixNodes.map((node) => (
          <motion.div
            key={node.label}
            className="lineage-pill"
            style={{ left: node.left, top: node.top }}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: node.delay }}
          >
            <p>{node.label}</p>
            <span>{node.meta}</span>
          </motion.div>
        ))}

        <svg viewBox="0 0 100 100" className="lineage-graph" aria-hidden="true">
          <path d="M30 50 C42 40, 52 33, 68 24" />
          <path d="M30 50 C44 47, 56 46, 76 44" />
          <path d="M30 50 C42 56, 53 64, 64 66" />
          <path d="M30 50 C39 59, 43 67, 43 72" />
        </svg>
      </GlassCard>
    </section>
  )
}
