import { getNodeStore, Store as _Store } from '@beenotung/tslib/store'
import fs from 'fs'
import { isObject } from './helpers'
import { nextKey as defaultNextKey } from './key'

export type Store = ReturnType<typeof createStore>

export function createStore<
  SavedObject extends object = { _id: string }
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

  // type SavedObject = object & Pick<  Record<Key, string>,Key>

  function isSavedObject(value: any): value is SavedObject {
    return isObject(value) && keyField in value
  }

  function proxy(value: any) {
    if (!isSavedObject(value)) {
      return value
    }
    return new Proxy(value, {
      get(target: any, p: PropertyKey, receiver: any): any {
        return Reflect.get(target, p, receiver)
      },
      set(target: any, p: PropertyKey, value: any, receiver: any): boolean {
        return Reflect.set(target, p, value, receiver)
      },
    })
  }

  function get(key: string) {
    // TODO handle nested object
    let value = store.getObject(key)
    if (isObject(value)) {
      value = Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          if (isSavedObject(value)) {
            value = get(value[keyField] as any)
          }
          return [key, value]
        }),
      )
    }
    return proxy(value)
  }

  function set(key: string, value: any) {
    if (isObject(value)) {
      // TODO handle array
      // handle nested object
      value = Object.fromEntries(
        Object.entries(value).map(([key, value]: [string, any]) => {
          if (isSavedObject(value) && Object.keys(value).length > 1) {
            if (nestedSave) {
              save(value)
            }
            value = { [keyField]: value[keyField] }
          }
          return [key, value]
        }),
      )
    }
    return store.setObject(key, value)
  }

  function save<T extends SavedObject>(object: T): T & SavedObject {
    if (!(keyField in object)) {
      object[keyField] = getNewKey() as any
    }
    set(object[keyField] as any, object)
    return object
  }

  function clear() {
    store.clear()
  }

  function getNewKey(): string {
    // TODO check to make sure the key is non-existing
    return nextKey()
  }

  return {
    get,
    set,
    save,
    clear,
    getNewKey,
  }
}
