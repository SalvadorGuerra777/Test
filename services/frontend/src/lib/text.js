// MiniMax (and other reasoning models) sometimes wrap their chain-of-thought
// in <think>...</think> before the real answer - strip it before showing
// anything to the user. Shared by the plan view and the chat sidebar.
export function stripThinking(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}
