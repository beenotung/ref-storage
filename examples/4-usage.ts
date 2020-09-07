import { createStore } from 'ref-storage'

let store = createStore({
  path: 'data',
  keyField: 'id',
})

// get/set any json values
store.set('num', 42)
store.set('str', 'Alice')
store.set('user', { name: 'Alice' })
console.log(store.get('user').name) // Alice

// populate key-ed sample data
let user = {
  id: 'user-1',
  name: 'Alice',
  posts: [] as any[],
}
let post = {
  id: 'post-1',
  title: 'Hello World',
  author: user,
}
user.posts.push(post) // cyclic reference is supported

store.save(user, {
  nestedSave: true, // override default setting
})

// auto reconstruct (cyclic) key-object references
let loadedPost = store.get('post-1')
console.log(loadedPost.author.name) // Alice
console.log(loadedPost.author.posts[0] == loadedPost) // true
