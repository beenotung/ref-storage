import { createStore, Store } from '../src/store'

describe('Store TestSuit', function () {
  let store: Store
  beforeAll(() => {
    store = createStore({ path: 'data' })
  })
  it('should clear store', function () {
    store.clear()
  })
  it('should set values', function () {
    store.set('num', 42)
    store.set('str', 'Alice')
    store.set('user', {
      id: 12,
      name: 'Alice',
    })
  })
  it('should get stored values', function () {
    expect(store.get('num')).toEqual(42)
    expect(store.get('str')).toEqual('Alice')
    expect(store.get('user')).toEqual({
      id: 12,
      name: 'Alice',
    })
  })
  it('should save object', function () {
    const user = { _id: 'user-12', name: 'Alice' }
    store.save(user)
    expect(store.get('user-12')).toEqual(user)
  })
  it('should auto assign id when save object', function () {
    const user = castSavedObject({ name: 'Alice' })
    store.save(user)
    expect(user).toHaveProperty('_id')
    expect(user._id.length > 0)
  })
  it('should store nested objects', function () {
    const user = makeSavedObject('user', { name: 'Alice' })
    store.save(user)
    const post = makeSavedObject('post', {
      author: user,
      content: 'Hello world',
    })
    store.save({
      _id: 'post',
      author: user,
      content: 'Hello',
    })
    store.save(post)
    user.name = 'Bob'
    store.save(user)
    expect(store.get(user._id)).toEqual(user)
    expect(store.get(post._id)).toEqual(post)
  })
  it('should inline non-keyed objects', function () {
    const user = {
      name: 'Alice',
      friends: {
        Bob: { since: 'today' },
        Charlie: { since: 'tomorrow' },
      },
    }
    store.save(user)
  })
})

function castSavedObject<T extends object>(object: T): T & { _id: string } {
  return object as any
}

function makeSavedObject<T extends object>(
  key: string,
  object: T,
): T & { _id: string } {
  return Object.assign(object, { _id: key })
}
