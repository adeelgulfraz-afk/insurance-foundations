import { useEffect, useRef } from 'react'
import type { DrawnQuestion } from '../types'

interface QuestionCardProps {
  question: DrawnQuestion
  index: number
  total: number
  selected: number | null
  submitted: boolean
  showFeedback: boolean
  onSelect: (optionIndex: number) => void
  /** Focus the stem on first render too, e.g. when the card replaces the button that was just pressed. */
  focusOnMount?: boolean
}

export default function QuestionCard({ question, index, total, selected, submitted, showFeedback, onSelect, focusOnMount = false }: QuestionCardProps) {
  const reveal = showFeedback && submitted
  const correct = selected === question.answerIndex
  const stemRef = useRef<HTMLHeadingElement>(null)
  const prevId = useRef<string | undefined>(undefined)

  // Move focus to the new stem when the question changes (on first mount only if asked).
  useEffect(() => {
    if (prevId.current === undefined ? focusOnMount : prevId.current !== question.id) stemRef.current?.focus()
    prevId.current = question.id
  }, [question.id])

  return (
    <div>
      <p className="q-count">Question {index + 1} of {total}</p>
      <h2 className="q-stem" ref={stemRef} tabIndex={-1}>{question.stem}</h2>
      <div className="options" role="group" aria-label="Answer options">
        {question.options.map((text, k) => {
          const state = reveal
            ? k === question.answerIndex ? 'is-correct' : k === selected ? 'is-wrong' : ''
            : k === selected ? 'is-selected' : ''
          return (
            <button key={k} type="button" className={`option ${state}`} aria-pressed={k === selected} disabled={submitted} onClick={() => onSelect(k)}>
              <span className="option-letter" aria-hidden="true">{'ABCD'[k]}</span>
              <span>{text}</span>
            </button>
          )
        })}
      </div>
      <div role="status" aria-live="polite">
        {reveal && (
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong>{correct ? 'Correct.' : 'Not quite.'}</strong>
            {question.explanation}
          </div>
        )}
      </div>
    </div>
  )
}
