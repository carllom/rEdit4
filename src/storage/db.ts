import { openDB, type IDBPDatabase } from 'idb'
import type { Project, Layer } from '../domain/model'

const DB_NAME = 'redit'
const DB_VERSION = 1
const STORE_PROJECT = 'project'
const STORE_LAYERS = 'layerData'
const PROJECT_KEY = 'current'

let _db: IDBPDatabase | null = null

async function db(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore(STORE_PROJECT)
      database.createObjectStore(STORE_LAYERS)
    },
  })
  return _db
}

// Serialize project: strip Uint8Array pixel data (stored separately)
function serializeProject(project: Project): object {
  return {
    ...project,
    images: project.images.map(img => ({
      ...img,
      layers: img.layers.map(({ data: _data, ...rest }) => rest),
    })),
  }
}

export async function saveProject(project: Project): Promise<void> {
  const store = await db()
  const tx = store.transaction([STORE_PROJECT, STORE_LAYERS], 'readwrite')
  tx.objectStore(STORE_PROJECT).put(serializeProject(project), PROJECT_KEY)
  for (const image of project.images) {
    for (const layer of image.layers) {
      tx.objectStore(STORE_LAYERS).put(layer.data, layer.id)
    }
  }
  await tx.done
}

export async function loadProject(): Promise<Project | null> {
  const store = await db()
  const meta = await store.get(STORE_PROJECT, PROJECT_KEY)
  if (!meta) return null

  const project = meta as Project
  for (const image of project.images) {
    for (const layer of image.layers as Layer[]) {
      const saved = await store.get(STORE_LAYERS, layer.id)
      layer.data = saved instanceof Uint8Array
        ? saved
        : new Uint8Array(image.width * image.height)
    }
  }
  return project
}

// Remove stale layer pixel blobs that are no longer in the project
export async function pruneLayerData(activeLayerIds: Set<string>): Promise<void> {
  const store = await db()
  const allKeys = await store.getAllKeys(STORE_LAYERS)
  const tx = store.transaction(STORE_LAYERS, 'readwrite')
  for (const key of allKeys) {
    if (!activeLayerIds.has(key as string)) tx.store.delete(key)
  }
  await tx.done
}
