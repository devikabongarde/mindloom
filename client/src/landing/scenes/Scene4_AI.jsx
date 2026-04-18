import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'

const pipeline = ['URL', 'Screenshot', 'Metadata', 'AI Summary']

export default function Scene4_AI() {
  return (
    <section className="scene-shell scene-grid">
      <div className="space-y-6 md:space-y-8">
        <p className="scene-eyebrow">AI INGESTION ENGINE</p>
        <h2 className="scene-headline">drop a link. intelligence begins.</h2>
        <p className="scene-subline">titles, screenshots, summaries generated instantly.</p>
      </div>

      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <GlassCard className="url-drop">
            https://futurelab.xyz/research/memory-systems
          </GlassCard>
        </motion.div>

        <div className="pipeline-grid">
          {pipeline.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: index * 0.18 }}
              className="relative"
            >
              <GlassCard className="pipeline-card">
                <span>{step}</span>
              </GlassCard>
              {index < pipeline.length - 1 && <span className="pipeline-arrow">-&gt;</span>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
