import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Layers, Rocket, Shield, Target, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'
import { ProjectCard } from '../components/ProjectCard'
import { TokenCA } from '../components/TokenCA'
import type { Project } from '../lib/types'

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4ade80]/20 bg-[#4ade80]/5 px-4 py-1.5 text-xs font-medium text-[#4ade80] mb-6">
            <Rocket className="h-3 w-3" />
            Built for pump.fun launches
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Tokens that unlock
            <br />
            <span className="bg-gradient-to-r from-[#4ade80] to-[#22c55e] bg-clip-text text-transparent">
              when milestones hit
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Allocate supply to KOLs, advisors, and contributors with conditional unlocks —
            1% when you hit $100M mcap for 7 days, 1% when they drive 1M impressions. No trust, just criteria.
          </p>
          <TokenCA />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/launch"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22c55e] px-8 py-3.5 text-sm font-semibold text-[#0a0f0d] shadow-lg shadow-[#4ade80]/20 hover:shadow-[#4ade80]/30 transition-shadow"
            >
              Launch on pump.fun
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#projects"
              className="inline-flex items-center gap-2 rounded-xl border border-[#243028] px-8 py-3.5 text-sm font-medium text-gray-300 hover:border-[#4ade80]/30 hover:text-white transition-colors"
            >
              View Projects
            </a>
          </div>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Target, title: 'Milestone Unlocks', desc: 'Market cap, social reach, volume — set any criteria' },
            { icon: Shield, title: 'Transparent Tracking', desc: 'Real-time progress via DexScreener & social metrics' },
            { icon: TrendingUp, title: 'pump.fun Native', desc: 'Launch directly on pump.fun, allocate from day one' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#243028]/60 bg-[#111916]/50 p-5">
              <f.icon className="h-5 w-5 text-[#4ade80] mb-3" />
              <h3 className="font-semibold text-white text-sm">{f.title}</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Projects */}
      <section id="projects" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Layers className="h-5 w-5 text-[#4ade80]" />
            Active Projects
          </h2>
          <Link to="/launch" className="text-sm text-[#4ade80] hover:underline">
            + New Project
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-[#111916] animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#243028] p-12 text-center">
            <p className="text-gray-500">No projects yet. Launch your first token.</p>
            <Link to="/launch" className="mt-4 inline-block text-[#4ade80] hover:underline text-sm">
              Get started →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}