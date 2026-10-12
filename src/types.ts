export interface Question {
  id: string          // "m01-q01" … "m12-q30" for modules, "x-q01"… for exam-extra
  topic: string       // short tag, e.g. "peril vs hazard"
  stem: string
  options: string[]   // exactly 4
  answerIndex: number // 0..3
  explanation: string // 1–2 sentences that teach
}

/** A question that knows which module it belongs to ("m01".."m12" or "mixed"). */
export interface BankQuestion extends Question {
  module: string
}

/** A bank question whose options have been permuted for display. order[i] = original index of the option now at position i. */
export interface DrawnQuestion extends BankQuestion {
  order: number[]
}

export interface Section {
  heading: string
  body: string // markdown subset
}

export interface Module {
  id: string            // "m01"
  order: number         // 1..12
  title: string
  estimatedMinutes: number
  recap: string[]       // exactly 5
  sections: Section[]   // 4..6
  whyItMatters: string
  questions: Question[] // exactly 30
}
