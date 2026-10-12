import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHash, routePath } from './router.ts'

test('parses every route', () => {
  assert.deepEqual(parseHash(''), { name: 'home' })
  assert.deepEqual(parseHash('#/'), { name: 'home' })
  assert.deepEqual(parseHash('#'), { name: 'home' })
  assert.deepEqual(parseHash('#/module/m03'), { name: 'module', id: 'm03' })
  assert.deepEqual(parseHash('#/module/m03/'), { name: 'module', id: 'm03' })
  assert.deepEqual(parseHash('#/module/m03/quiz'), { name: 'quiz', id: 'm03' })
  assert.deepEqual(parseHash('#/exam'), { name: 'exam' })
  assert.deepEqual(parseHash('#/exam/results'), { name: 'examResults' })
  assert.deepEqual(parseHash('#/progress'), { name: 'progress' })
})

test('unknown or malformed hashes are notFound, never throw', () => {
  for (const h of ['#/foo', '#/module/', '#/module', '#module/m01', '#/module/m01/quiz/extra', '#/exam/x']) {
    assert.deepEqual(parseHash(h), { name: 'notFound' }, h)
  }
})

test('routePath round-trips', () => {
  assert.equal(routePath({ name: 'quiz', id: 'm02' }), '#/module/m02/quiz')
  assert.equal(routePath({ name: 'home' }), '#/')
})
