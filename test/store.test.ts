import { Cache, createStore } from '../src/store'
import { GeneralObject } from '../src/types'

describe('Store TestSuit', function () {
  const store = createStore<
    {
      _id: string
    } & GeneralObject
  >({ path: 'data' })
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
  it('should delete values', function () {
    for (const key of ['num', 'str', 'user']) {
      store.del(key)
      expect(store.get(key)).toBeNull()
    }
  })
  it('should save object', function () {
    const user = { _id: 'user-12', name: 'Alice' }
    store.save(user)
    expect(store.get('user-12')).toEqual(user)
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
    const user = makeSavedObject('Alice', {
      name: 'Alice',
      friends: {
        Bob: { since: 'today' },
        Charlie: { since: 'tomorrow' },
      },
    })
    store.save(user)
  })
  it('should store array', function () {
    const alice = makeSavedObject('alice', { name: 'Alice', level: 1 })
    store.save(alice)
    const bob = makeSavedObject('bob', { name: 'Bob', level: 2 })
    store.save(bob)
    const users = makeSavedObject('users', { users: [alice, bob] })
    store.save(users)

    alice.level = 10
    store.save(alice)
    bob.level = 20
    store.save(bob)
    expect(store.get('users')).toEqual(users)
  })
  it('should save and load cyclic-referenced object', function () {
    const user = {
      _id: 'user',
      posts: [] as any[],
    }
    const post = {
      _id: 'post',
      content: 'Hello world',
      author: user,
    }
    user.posts.push(post)
    store.save(post, { nestedSave: true })
    const loadedUser = store.get('user', { post })
    expect(loadedUser).toEqual(user)
  })
  it('should delete cyclic-referenced object', function () {
    const user = { _id: 'user', posts: [] as any[] }
    store.save(user)
    const cache: Cache = {}
    for (let i = 0; i < 3; i++) {
      const post = {
        _id: 'post-' + i,
        author: user,
        content: 'Content of Post ' + i,
      }
      store.save(post)
      cache[post._id] = post
      user.posts.push(post)
      store.save(user)
    }
    expect(store.get('user', cache)).toEqual(user)
    store.del('user', { recursive: true, cache })
    expect(store.get('user')).toBeNull()
  })
  it('should reconstruct cyclic reference on key-ed object', function () {
    // populate key-ed sample data
    const user = {
      _id: 'user-1',
      name: 'Alice',
      posts: [] as any[],
    }
    const post = {
      _id: 'post-1',
      title: 'Hello world',
      author: user,
    }
    user.posts.push(post)
    store.save(post, { nestedSave: true })

    // load data with cyclic reference on key-ed object
    const loadedPost = store.get('post-1')
    expect(loadedPost).toEqual(loadedPost.author.posts[0])
  })
})

function makeSavedObject<T extends object>(
  key: string,
  object: T,
): T & { _id: string } {
  return Object.assign(object, { _id: key })
}
