import type { BankQuestion, Module, Question } from '../types'
import { buildExamBank } from '../lib/questions'
import extra from './exam-extra.json'

const files = import.meta.glob<Module>('./modules/*.json', { eager: true, import: 'default' })

export const modules: Module[] = Object.values(files).sort((a, b) => a.order - b.order)
export const moduleById = (id: string): Module | undefined => modules.find((m) => m.id === id)
export const examBank: BankQuestion[] = buildExamBank(modules, (extra as { questions: Question[] }).questions)
