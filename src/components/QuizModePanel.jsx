import { useState } from 'react'
import {
  setQuizQuestion,
  startQuizMode,
  stopQuizMode,
  submitQuizAnswer,
} from '../services/groupService'

function QuizModePanel({ groupId, quizState, isCreator, currentUser, activeUsers, className = '' }) {
  const [questionInput, setQuestionInput] = useState('')
  const [answerInput, setAnswerInput] = useState('')
  const [responseInput, setResponseInput] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [loading, setLoading] = useState(null)
  const [feedback, setFeedback] = useState('')

  const isActive = Boolean(quizState?.active)
  const question = quizState?.question || null
  const currentQuestionKey = question?.createdAt || ''
  const userResponse = quizState?.responses?.[currentUser.id]
  const alreadyAnsweredCurrent = userResponse?.questionCreatedAt === currentQuestionKey
  const names = quizState?.names || {}
  const stats = quizState?.stats || {}

  const participantResults = Object.entries(stats)
    .map(([userId, row]) => ({
      userId,
      name: names[userId] || activeUsers?.find((participant) => participant.userId === userId)?.name || 'User',
      correct: Number(row?.correct || 0),
      wrong: Number(row?.wrong || 0),
    }))
    .sort((a, b) => b.correct - a.correct || a.wrong - b.wrong)

  const showFeedback = (message) => {
    setFeedback(message)
    window.setTimeout(() => setFeedback(''), 2600)
  }

  const handleStartQuiz = async () => {
    try {
      setLoading('start')
      await startQuizMode({ groupId, creatorId: currentUser.id })
      showFeedback('Quiz mode started')
    } catch {
      showFeedback('Something went wrong. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleStopQuiz = async () => {
    try {
      setLoading('stop')
      await stopQuizMode({ groupId, creatorId: currentUser.id })
      setShowComposer(false)
      setQuestionInput('')
      setAnswerInput('')
      setResponseInput('')
      showFeedback('Quiz mode ended')
    } catch {
      showFeedback('Something went wrong. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleSetQuestion = async () => {
    if (!questionInput.trim() || !answerInput.trim()) {
      showFeedback('Add both a question and answer.')
      return
    }

    try {
      setLoading('question')
      await setQuizQuestion({
        groupId,
        creatorId: currentUser.id,
        prompt: questionInput,
        answer: answerInput,
      })
      setQuestionInput('')
      setAnswerInput('')
      setResponseInput('')
      setShowComposer(false)
      showFeedback('Question updated')
    } catch {
      showFeedback('Something went wrong. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleSubmitAnswer = async (event) => {
    event.preventDefault()

    const answerValue = responseInput.trim()
    if (!answerValue) {
      showFeedback('Type your answer first.')
      return
    }

    try {
      setLoading('answer')
      await submitQuizAnswer({
        groupId,
        userId: currentUser.id,
        name: currentUser.name || 'User',
        answer: answerValue,
      })
      showFeedback('Answer submitted')
      setResponseInput('')
    } catch {
      showFeedback('Something went wrong. Try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4 ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Quiz</p>
        <span className={`rounded-full px-2 py-1 text-[10px] ${isActive ? 'bg-emerald-300/20 text-emerald-100' : 'bg-white/10 text-white/65'}`}>
          {isActive ? 'Live' : 'Idle'}
        </span>
      </div>

      <div className="space-y-4">
        {isCreator && (
          <div className={`flex w-full flex-wrap gap-2 ${isActive ? 'justify-end' : 'justify-stretch'}`}>
            <button
              type="button"
              onClick={isActive ? handleStopQuiz : handleStartQuiz}
              disabled={Boolean(loading)}
              className={`rounded-full border text-white transition disabled:cursor-not-allowed disabled:opacity-55 ${
                isActive
                  ? 'border-white/20 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20'
                  : 'w-full border-white/35 bg-white/20 px-5 py-2.5 text-sm font-bold tracking-wide hover:bg-white/30'
              }`}
            >
              {loading === 'start' || loading === 'stop'
                ? 'Working...'
                : isActive
                  ? 'Stop Quiz'
                  : 'Start Quiz'}
            </button>

            {isActive && (
              <button
                type="button"
                onClick={() => setShowComposer((value) => !value)}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/20"
              >
                {showComposer ? 'Close Editor' : 'New Question'}
              </button>
            )}
          </div>
        )}

        {isCreator && isActive && (showComposer || !question?.prompt) && (
          <div className="space-y-3 rounded-xl bg-white/5 p-4">
            <input
              value={questionInput}
              onChange={(event) => setQuestionInput(event.target.value)}
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
              placeholder="Question"
            />
            <input
              value={answerInput}
              onChange={(event) => setAnswerInput(event.target.value)}
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
              placeholder="Correct answer"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleSetQuestion}
                disabled={Boolean(loading)}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading === 'question' ? 'Saving...' : 'Set'}
              </button>
            </div>
          </div>
        )}

        {isActive && question?.prompt && !alreadyAnsweredCurrent && (
          <form onSubmit={handleSubmitAnswer} className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="text-base font-medium leading-relaxed text-white">{question.prompt}</div>
            <input
              value={responseInput}
              onChange={(event) => setResponseInput(event.target.value)}
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white"
              placeholder="Type your answer..."
              disabled={alreadyAnsweredCurrent || loading === 'answer'}
            />
            <button
              type="submit"
              disabled={alreadyAnsweredCurrent || loading === 'answer'}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading === 'answer' ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}

        {isActive && question?.prompt && alreadyAnsweredCurrent && (
          <p className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80">
            Answer submitted {userResponse?.isCorrect === true ? '(Correct)' : userResponse?.isCorrect === false ? '(Wrong)' : ''}
          </p>
        )}

        {participantResults.length > 0 && (
          <div className="rounded-xl bg-white/5 p-4">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-white/60">Participant Results</p>
            <div className="space-y-2">
              {participantResults.map((row) => (
                <div key={row.userId} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <span className="truncate text-white/85">{row.name}</span>
                  <span className="whitespace-nowrap text-emerald-100">{row.correct} correct</span>
                  <span className="whitespace-nowrap text-rose-100">{row.wrong} wrong</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {feedback && <p className="text-xs text-white/70">{feedback}</p>}
      </div>
    </div>
  )
}

export default QuizModePanel
