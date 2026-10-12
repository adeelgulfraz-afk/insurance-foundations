import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shuffle, mulberry32 } from './shuffle.ts'

test('shuffle keeps every element and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8]
  const out = shuffle(input, mulberry32(1))
  assert.deepEqual([...out].sort(), input)
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8])
})

test('seeded rng is deterministic and changes order', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(42))
  const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(42))
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})
