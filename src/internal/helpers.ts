export function isObject(value: any): value is object {
  return value !== null && typeof value === 'object'
}

export function mapObject(
  object: object,
  mapper: (entry: [string, any]) => [string, any],
) {
  return Object.fromEntries(Object.entries(object).map(mapper))
}
