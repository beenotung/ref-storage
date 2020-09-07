import { createStore } from 'ref-storage'
import { MB } from '@beenotung/tslib/size'

// using custom directory and storage quota
let store = createStore({
  path: 'data',
  quota: 5 * MB, // optional
  keyField: 'id', // default is '_id'
  nestedSave: true, // default is false
})
