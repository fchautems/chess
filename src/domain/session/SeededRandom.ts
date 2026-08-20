export function seededUnit(seed: number, index: number): number {
  let value = (seed + Math.imul(index + 1, 0x6d2b79f5)) >>> 0
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
}
