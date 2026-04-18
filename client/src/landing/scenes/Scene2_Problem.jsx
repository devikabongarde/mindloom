import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'

const browserTabs = [
  'Devika - 400 tabs open',
  'Research Archive (unread)',
  'AI Paper to revisit',
]

const deadBookmarks = [
  'Kaivalya/bookmarks/2019',
  'Design links_old.zip',
  'must-read-later-final',
]

export default function Scene2_Problem() {
  return (
    <section className="scene-shell scene-grid">
      <div className="space-y-6 md:space-y-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="scene-eyebrow"
        >
          THE PROBLEM
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 0.1 }}
          className="scene-headline"
        >
          knowledge is dying faster than they can read it.
        </motion.h2>
      </div>

      <div className="relative grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {browserTabs.map((tab, index) => (
            <motion.div
              key={tab}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.15 }}
            >
              <GlassCard className="tab-card floating-card">
                <span className="dot-red" />
                <span className="dot-amber" />
                <span className="dot-green" />
                <p>{tab}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="space-y-3">
          {deadBookmarks.map((mark, index) => (
            <motion.div
              key={mark}
              initial={{ x: 30, opacity: 0, rotate: 4 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.2 }}
            >
              <GlassCard className="bookmark-card floating-card">
                <p>{mark}</p>
                <span className="bookmark-status">DEAD</span>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
