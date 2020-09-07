# ref-storage

[![npm Package Version](https://img.shields.io/npm/v/ref-storage.svg?maxAge=3600)](https://www.npmjs.com/package/ref-storage)

Persist key-ed objects with cross-platform Storage under synchronous operations (not async)
with auto normalization and denormalization.

Inspired from [ref-db](https://github.com/beenotung/ref-db) but denormalize aggressively (hence without proxy overhead)

## Supported Platforms

ref-storage is built on top of cross-platform Storage, hence it works on:
- Browser (using [window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage))
- Node.js (using [node-localstorage](https://www.npmjs.com/package/node-localstorage))

## How it works?
This package is inspired from [ref-db](https://github.com/beenotung/ref-db).
However, the loaded object is not proxied.
Instead, the denormalization is happened aggressively upon `get(key)` call.

Object pooling is applied to support cyclic reference on key-ed objects.

## Usage

Details refer to the [test spec](./test/store.test.ts)

### Create the Store (database)
```typescript
import { createStore, GeneralObject, nextKey } from 'ref-storage'

type Data = GeneralObject & {
  id: string
}

const store = createStore<Data>({
  path: 'data',
  keyField: 'id', // default to _id
  nestedSave: false, // optional
  nextKey, // optional
  quota: 2 * 1024**3 // default
})
```

### Get/Set key-values
```typescript
store.set('num', 42)
store.set('str', 'Alice')
store.set('user', '{}')
```
