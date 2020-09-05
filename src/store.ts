import { getNodeStore, Store as _Store } from '@beenotung/tslib/store'
import fs from 'fs'
import { isObject, mapObject } from './helpers'
import { nextKey as defaultNextKey } from './key'
import { GeneralObject } from './types'

export type Store = ReturnType<typeof createStore>
export type Cache = Record<string, any>
export type DelOptions = {
  recursive: boolean
  cache: Cache
  visitedKeys: Record<string, boolean>
  visitedValues: Set<any>
}

export function createStore<
  SavedObject extends GeneralObject = {
    _id: string
  } & GeneralObject
>(args: {
  path: string
  quota?: number
  keyField?: keyof SavedObject // default _id
  nestedSave?: boolean
  nextKey?: () => string
}) {
  const { path: dir, nestedSave } = args
  const keyField = args.keyField || ('_id' as keyof SavedObject)
  const nextKey = args.nextKey || defaultNextKey
  fs.mkdirSync(dir, { recursive: true })
  const storage = getNodeStore(dir, args.quota)
  const store = _Store.create(storage)

  function isSavedObject(value: any): value is SavedObject {
    return isObject(value) && keyField in value
  }

  function isSavedObjectRef(value: any): value is SavedObject {
    if (!isObject(value)) {
      return false
    }
    const keys = Object.keys(value)
    return keys.length === 1 && keys[0] === keyField
  }

  function isSavedObjectValue(value: any): value is SavedObject {
    if (!isObject(value)) {
      return false
    }
    const keys = Object.keys(value)
    return keys.length > 1 && keys.includes(keyField as string)
  }

  function recursiveDelValue(value: any, options: DelOptions) {
    if (options.visitedValues.has(value)) {
      return // return to avoid dead-loop
    }
    options.visitedValues.add(value)
    if (Array.isArray(value)) {
      value.forEach(value => recursiveDelValue(value, options))
      return
    }
    if (isObject(value)) {
      Object.values(value).forEach(value => recursiveDelValue(value, options))
      if (isSavedObject(value)) {
        const key: string = value[keyField] as any
        del(key, options)
      }
    }
  }

  function del(key: string, options: DelOptions) {
    if (key in options.visitedKeys) {
      return // return to avoid dead-loop
    }
    options.visitedKeys[key] = true
    if (options.recursive) {
      const value = get(key, options.cache)
      recursiveDelValue(value, options)
    }
    store.removeItem(key)
    delete options.cache[key]
  }

  function mapGettingValue(value: any, cache: Record<string, any>): any {
    if (Array.isArray(value)) {
      return value.map(value => mapGettingValue(value, cache))
    }
    if (isSavedObjectRef(value)) {
      return get(value[keyField] as any, cache)
    }
    if (isObject(value)) {
      return mapObject(value, ([key, value]) => {
        value = mapGettingValue(value, cache)
        return [key, value]
      })
    }
    return value
  }

  function get(key: string, cache: Cache) {
    if (key in cache) {
      return cache[key]
    }
    const value = store.getObject(key)
    cache[key] = value
    if (isSavedObjectRef(value)) {
      // the raw object is empty
      return value // return here to avoid dead-loop
    }
    return mapGettingValue(value, cache)
  }

  function mapSavingValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map(mapSavingValue)
    }
    if (isSavedObjectRef(value)) {
      return value
    }
    if (isSavedObjectValue(value)) {
      if (nestedSave) {
        save(value)
      }
      return { [keyField]: value[keyField] }
    }
    if (isObject(value)) {
      return mapObject(value, ([key, value]) => [key, mapSavingValue(value)])
    }
    return value
  }

  function set(key: string, value: any) {
    // preserve top-level object value
    if (Array.isArray(value)) {
      value = value.map(mapSavingValue)
    } else if (isObject(value)) {
      value = mapObject(value, ([key, value]) => [key, mapSavingValue(value)])
    }
    return store.setObject(key, value)
  }

  function save<T extends SavedObject>(object: SavedObject) {
    set(object[keyField] as any, object)
  }

  function clear() {
    store.clear()
  }

  function getNewKey(): string {
    // TODO check to make sure the key is non-existing
    return nextKey()
  }

  return {
    get: (key: string, cache: Cache = {}) => get(key, cache),
    set,
    save,
    del: (key: string, options?: Partial<DelOptions>) =>
      del(key, {
        recursive: options?.recursive || false,
        cache: options?.cache || {},
        visitedKeys: options?.visitedKeys || {},
        visitedValues: options?.visitedValues || new Set(),
      }),
    clear,
    getNewKey,
  }
}
