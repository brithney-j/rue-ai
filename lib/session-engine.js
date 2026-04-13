export function getCurrentStep(plan, session) {
  if (!plan || !session) return null
  return plan.steps?.[session.currentStepIndex] || null
}

export function startStep(session, plan, stepIndex) {
  const step = plan?.steps?.[stepIndex]

  if (!step) {
    return {
      ...session,
      currentStepIndex: stepIndex,
      status: "completed",
      feedback: "Cooking session complete.",
      timerRemainingSec: 0
    }
  }

  const now = new Date()
  const durationSec = Number(step.durationSec || 0)
  const due = new Date(now.getTime() + durationSec * 1000)

  return {
    ...session,
    currentStepIndex: stepIndex,
    status: "active",
    feedback: `Step ${stepIndex + 1}: ${step.title}`,
    currentStepStartedAt: now.toISOString(),
    currentStepDueAt: due.toISOString(),
    timerRemainingSec: durationSec
  }
}

export function nextStep(session, plan) {
  const nextIndex = Number(session.currentStepIndex || 0) + 1
  return startStep(session, plan, nextIndex)
}

export function computeRemainingSec(session) {
  if (!session?.currentStepDueAt) return 0

  const due = new Date(session.currentStepDueAt).getTime()
  const now = Date.now()

  return Math.max(0, Math.floor((due - now) / 1000))
}