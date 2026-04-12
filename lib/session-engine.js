export function getCurrentStep(plan, session) {
  if (!plan || !session) return null
  return plan.steps?.[session.currentStepIndex] || null
}

export function nextStep(session, plan) {
  const nextIndex = session.currentStepIndex + 1
  const total = plan.steps.length

  return {
    ...session,
    currentStepIndex: nextIndex,
    status: nextIndex >= total ? "completed" : "active",
    feedback:
      nextIndex >= total
        ? "Cooking session complete."
        : `Moved to step ${nextIndex + 1}.`
  }
}