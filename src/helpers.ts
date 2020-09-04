export function isObject<T>(value: T): T extends object ? true : false {
  return (value !== null && typeof value === 'object') as any
}
