import { getNodeStore, Store as _Store } from '@beenotung/tslib/store'
import fs from 'fs'
import { isObject } from './helpers'
import { nextKey } from './key'

export type Store = ReturnType<typeof createStore>

export function createStore(args: {
  path: string
  keyField?: string // default _id
}) {
  const dir = args.path
  const keyField = args.keyField || '_id'
  fs.mkdirSync(dir, { recursive: true })
  const storage = getNodeStore(dir)
  const store = _Store.create(storage)

  function isSavedObject<T>(value: T): T extends object ? true : false {
    return (isObject(value) && keyField in value) as any
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
    const value = store.getObject(key)
    return proxy(value)
  }

  function set(key: string, value: any) {
    if (!isObject(value)) {
      return store.setObject(key, value)
    }
    // TODO handle nested object
    value = Object.fromEntries(
      Object.entries(value).map(([key, value]: [string, any]) => {
        if (!isSavedObject(value)) {
          return [key, value]
        }
        save(value)
        return [key, { [keyField]: value[keyField] }]
      }),
    )
    // TODO handle array
  }

  function save(_object: object) {
    const object = _object as any
    if (!(keyField in object)) {
      object[keyField] = getNewKey()
    }
    set(object[keyField], object)
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
