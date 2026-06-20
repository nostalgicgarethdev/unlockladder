import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { Project, Store } from './types.js'

const DATA_DIR = process.env.VERCEL
  ? '/tmp/unlockladder'
  : join(process.cwd(), 'data')
const STORE_PATH = join(DATA_DIR, 'store.json')

function ensureStore(): Store {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(STORE_PATH)) {
    const empty: Store = { projects: [] }
    writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2))
    return empty
  }
  return JSON.parse(readFileSync(STORE_PATH, 'utf-8')) as Store
}

function save(store: Store): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

export function getAllProjects(): Project[] {
  return ensureStore().projects
}

export function getProject(id: string): Project | undefined {
  return ensureStore().projects.find((p) => p.id === id)
}

export function createProject(project: Project): Project {
  const store = ensureStore()
  store.projects.unshift(project)
  save(store)
  return project
}

export function updateProject(id: string, updates: Partial<Project>): Project | undefined {
  const store = ensureStore()
  const idx = store.projects.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  store.projects[idx] = { ...store.projects[idx], ...updates }
  save(store)
  return store.projects[idx]
}

export function deleteProject(id: string): boolean {
  const store = ensureStore()
  const before = store.projects.length
  store.projects = store.projects.filter((p) => p.id !== id)
  if (store.projects.length === before) return false
  save(store)
  return true
}