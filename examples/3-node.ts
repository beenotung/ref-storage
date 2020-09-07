import { createStore } from 'ref-storage'
import { LocalStorage } from 'node-localstorage'
import { MB } from '@beenotung/tslib/size'

let nodeDB = createStore({
  storage: new LocalStorage('data', 5 * MB),
})


