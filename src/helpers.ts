let lastTime = 0
let acc = 0

export function nextKey(separator = '-'): string {
  const now = Date.now()
  if (now !== lastTime) {
    lastTime = now
    acc = 0
  }
  const key = now + separator + acc
  acc++
  return key
}
