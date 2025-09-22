export type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';
