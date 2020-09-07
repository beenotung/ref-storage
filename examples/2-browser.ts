import { createStore } from 'ref-storage'

let browserDB = createStore({
  storage: localStorage,
})


