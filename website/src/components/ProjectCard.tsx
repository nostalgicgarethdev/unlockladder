import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, Layers, Lock, Unlock } from 'lucide-react'
import type { Project } from '../lib/types'

interface Props {
  project: Project
  index: number
}

export function ProjectCard({ project, index }: Props) {
  const unlocked = project.allocations.filter((a) => a.status === 'unlocked' || a.status === 'claimed').length
  const total = project.allocations.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={`/project/${project.id}`}
        className="group block rounded-2xl border border-[#243028] bg-[#111916]/80 p-5 backdrop-blur-sm hover:border-[#4ade80]/30 hover:bg-[#111916] transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a2420] to-[#243028] text-sm font-bold text-[#4ade80] border border-[#243028]">
              ${project.symbol}
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-[#4ade80] transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-gray-500">
                {project.mintAddress ? 'Live on pump.fun' : 'Draft — not launched'}
              </p>
            </div>
          </div>
          {project.pumpFunUrl && project.mintAddress && (
            <a
              href={project.pumpFunUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-500 hover:text-[#4ade80] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {project.totalAllocated}% allocated
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            {total - unlocked} locked
          </span>
          <span className="flex items-center gap-1 text-[#4ade80]/70">
            <Unlock className="h-3.5 w-3.5" />
            {unlocked} unlocked
          </span>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-[#1a2420] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]"
            style={{ width: `${project.totalAllocated}%` }}
          />
        </div>
      </Link>
    </motion.div>
  )
}