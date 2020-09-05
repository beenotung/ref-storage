/**
 * 5.38-5.97 seconds for 2000 object save
 * 50.7-51.6 seconds for 20000 object save
 * i.e. 335-394 save/second
 * */
import { allNames } from '@beenotung/tslib/constant/character-name'
import { startTimer } from '@beenotung/tslib/node'
import { Random } from '@beenotung/tslib/random'
import { GB } from '@beenotung/tslib/size'
import { createStore } from '../src/store'
import { W } from './constant'

const timer = startTimer('prepare benchmark')
const store = createStore({ path: 'data', keyField: 'id', quota: 2 * GB })
store.clear()
let n = 700 * W
n = 20000

timer.next('save users')
timer.setProgress({ totalTick: n, sampleOver: 100, estimateTime: true })
for (let i = 0; i < n; i++) {
  const user = {
    id: 'u-' + i,
    name: Random.element(allNames),
  }
  store.save(user)
  timer.tick()
}

timer.next('save post')
timer.setProgress({ totalTick: n, sampleOver: 100, estimateTime: true })
for (let i = 0; i < n; i++) {
  const post = {
    id: 'p-' + i,
    author: { id: 'u-' + Random.nextInt(n, 0) },
    content: Random.nextString(Random.nextInt(500, 3)),
  }
  store.save(post)
  timer.tick()
}

timer.end()
