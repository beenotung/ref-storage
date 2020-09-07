import { getLocalStorage, Store as _Store } from '@beenotung/tslib/store'
import { isObject, mapObject } from './internal/helpers'
import { GeneralObject } from './types'

export type Store = ReturnType<typeof createStore>
export type Cache = Record<string, any>
export type DelOptions = {
  recursive: boolean
  cache: Cache
  visitedKeys: Record<string, boolean>
  visitedValues: Set<any>
}
export type SaveOptions<SavedObject extends GeneralObject> = {
  nestedSave: boolean
  visitedObject: Set<SavedObject>
}
type _SaveOptions<T extends GeneralObject> = SaveOptions<T>

export function createStore<
  SavedObject extends GeneralObject = {
    _id: string
  } & GeneralObject
>(
  args: {
    keyField?: keyof SavedObject // default _id
    nestedSave?: boolean // default false
  } & (
    | {
        path: string
        quota?: number
      }
    | {
        storage: Storage
      }
  ),
) {
  type SaveOptions = _SaveOptions<SavedObject>
  const storage =
    'storage' in args ? args.storage : getLocalStorage(args.path, args.quota)
  const store = _Store.create(storage)
  const keyField = args.keyField || ('_id' as keyof SavedObject)

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

  function expandGettingValue(object: any, key: any, value: any, cache: Cache) {
    if (Array.isArray(value)) {
      value.forEach((val, i) => expandGettingValue(value, i, val, cache))
      return
    }
    if (isSavedObjectRef(value)) {
      object[key] = get(value[keyField] as any, cache)
      return
    }
    if (isObject(value)) {
      Object.entries(value).forEach(([k, v]) =>
        expandGettingValue(value, k, v, cache),
      )
      return
    }
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
    if (Array.isArray(value)) {
      value.forEach((v, i) => expandGettingValue(value, i, v, cache))
    } else if (isObject(value)) {
      Object.entries(value).forEach(([k, v]) =>
        expandGettingValue(value, k, v, cache),
      )
    }
    return value
  }

  function mapSavingValue(value: any, options: SaveOptions): any {
    if (Array.isArray(value)) {
      return value.map(value => mapSavingValue(value, options))
    }
    if (isSavedObjectRef(value)) {
      return value
    }
    if (isSavedObjectValue(value)) {
      if (options.nestedSave) {
        save(value, options)
      }
      return { [keyField]: value[keyField] }
    }
    if (isObject(value)) {
      return mapObject(value, ([key, value]) => [
        key,
        mapSavingValue(value, options),
      ])
    }
    return value
  }

  function set(key: string, value: any, options: SaveOptions) {
    if (value.toJSON) {
      set(key, value.toJSON(), options)
      return
    }
    // preserve top-level object value
    if (Array.isArray(value)) {
      value = value.map(value => mapSavingValue(value, options))
    } else if (isObject(value)) {
      value = mapObject(value, ([key, value]) => [
        key,
        mapSavingValue(value, options),
      ])
    }
    store.setObject(key, value)
  }

  function save<T extends SavedObject>(
    object: SavedObject,
    options: SaveOptions,
  ) {
    if (options.visitedObject.has(object)) {
      return // return here to avoid dead-loop
    }
    options.visitedObject.add(object)
    set(object[keyField] as any, object, options)
  }

  function clear() {
    store.clear()
  }

  return {
    get: (key: string, cache: Cache = {}) => get(key, cache),
    set: (key: string, value: any, options?: Partial<SaveOptions>) =>
      set(key, value, {
        nestedSave: options?.nestedSave ?? args.nestedSave ?? false,
        visitedObject: options?.visitedObject || new Set(),
      }),
    save: <T extends SavedObject>(object: T, options?: Partial<SaveOptions>) =>
      save(object, {
        nestedSave: options?.nestedSave ?? args.nestedSave ?? false,
        visitedObject: options?.visitedObject || new Set(),
      }),
    del: (key: string, options?: Partial<DelOptions>) =>
      del(key, {
        recursive: options?.recursive ?? false,
        cache: options?.cache || {},
        visitedKeys: options?.visitedKeys || {},
        visitedValues: options?.visitedValues || new Set(),
      }),
    clear,
  }
}
