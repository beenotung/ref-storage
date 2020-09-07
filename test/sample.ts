import { allNames } from '@beenotung/tslib/constant/character-name'
import { format_time_duration } from '@beenotung/tslib/format'
import { Random } from '@beenotung/tslib/random'
import { MB } from '@beenotung/tslib/size'
import { nextKey as getNewKey } from '../src/helpers'
import { createStore } from '../src/store'

const store = createStore<{ id: string }>({
  path: 'data',
  quota: 200 * MB,
  keyField: 'id',
})
store.clear()
const { save, get } = store

const rootUser = { id: 'root', name: 'Admin', posts: [] as any[], comments: [] }
save(rootUser)
const users = { id: 'users', ids: [rootUser.id] }
save(users)

function newUser() {
  const user = {
    id: getNewKey(),
    name: Random.element(allNames),
    posts: [],
    comments: [],
  }
  save(user)
  users.ids.push(user.id)
  save(users)
  return user
}

const rootPost = {
  id: 'hello',
  content: 'Hello world',
  author: rootUser,
  comments: [] as any,
}
save(rootPost)
const posts = { id: 'posts', ids: [rootPost.id] }
save(posts)
rootUser.posts.push(rootPost)
save(rootUser)

function newPost() {
  const userId = Random.element(users.ids)
  const user = get(userId)
  if (!user) {
    console.error('failed to load user', userId)
    throw new Error('failed to load user')
  }
  const post = {
    id: getNewKey(),
    content: Random.nextString(Random.nextInt(250, 3)),
    author: user,
    comments: [],
  }
  save(post)
  posts.ids.push(post.id)
  save(posts)
  user.posts.push(post)
  save(user)
  return post
}

const comments = { id: 'comments', ids: [] as string[] }
save(comments)

function newComment() {
  const post = get(Random.element(posts.ids))
  const user = get(Random.element(users.ids))
  const comment = {
    id: getNewKey(),
    content: Random.nextString(Random.nextInt(250, 3)),
    post,
    author: user,
  }
  save(comment)
  comments.ids.push(comment.id)
  save(comments)
  post.comments.push(comment)
  save(post)
  user.comments.push(comment)
  save(user)
  return comment
}

const start = Date.now()

function report() {
  const now = Date.now()
  const passed = now - start
  const u = users.ids.length
  const p = posts.ids.length
  const c = comments.ids.length
  const n = u + p + c
  console.log(`
  users: ${u}
  posts: ${p}
  comments: ${c}
  total: ${n}
  passed: ${format_time_duration(passed)}
  write/second: ${n / (passed / 1000)}
  `)
}

function tick() {
  report()
  if (Random.nextBool(0.05)) {
    newUser()
  } else if (Random.nextBool(0.2)) {
    newPost()
  } else {
    newComment()
  }
  // setTimeout(tick)
}

// tick()
for (;;) {
  tick()
}
