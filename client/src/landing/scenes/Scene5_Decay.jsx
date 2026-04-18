import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'

const decayItems = [
  { label: 'Fresh', age: 'Day 1', className: 'decay-fresh' },
  { label: 'Fading', age: 'Day 14', className: 'decay-mid' },
  { label: 'Dead', age: 'Day 30', className: 'decay-dead' },
]

export default function Scene5_Decay() {
  return (
    <section className="scene-shell scene-grid">
      <div className="space-y-6 md:space-y-8">
        <p className="scene-eyebrow">BIOLOGICAL DECAY SYSTEM</p>
        <h2 className="scene-headline">neglected knowledge decays.</h2>
        <p className="scene-subline">digital hoarding has consequences.</p>
      </div>

      <div className="relative">
        <div className="grid gap-4 md:grid-cols-3">
          {decayItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: index * 0.2 }}
            >
              <GlassCard className={`decay-card ${item.className}`}>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-600">{item.age}</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">{item.label}</h3>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="graveyard-pit"
          animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 3.4 }}
        />
      </div>
    </section>
  )
}
