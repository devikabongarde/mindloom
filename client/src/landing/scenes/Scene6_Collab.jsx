import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'

const reactions = ['🔥', '🧠', '⚡', '✅']

export default function Scene6_Collab() {
  return (
    <section className="scene-shell scene-grid">
      <div className="space-y-6 md:space-y-8">
        <p className="scene-eyebrow">LIVE COLLABORATION</p>
        <h2 className="scene-headline">shared minds. one shelf reality.</h2>
        <p className="scene-subline">stormy during activity. foggy when abandoned.</p>
      </div>

      <GlassCard className="collab-dashboard">
        <div className="weather-overlay" />

        <motion.div
          className="live-cursor cursor-a"
          animate={{ x: [0, 140, 80, 0], y: [0, -20, 80, 0] }}
          transition={{ repeat: Infinity, duration: 6.5 }}
        >
          Devika
        </motion.div>

        <motion.div
          className="live-cursor cursor-b"
          animate={{ x: [0, -120, -40, 0], y: [0, 70, -25, 0] }}
          transition={{ repeat: Infinity, duration: 7.2 }}
        >
          Kaivalya
        </motion.div>

        <div className="reaction-cluster">
          {reactions.map((emoji, index) => (
            <motion.span
              key={emoji}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: [0, 1, 0], y: [14, -25, -52], scale: [0.7, 1, 1.05] }}
              transition={{ repeat: Infinity, duration: 3.5, delay: index * 0.35 }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      </GlassCard>
    </section>
  )
}
