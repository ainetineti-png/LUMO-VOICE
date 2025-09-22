import { GoogleGenAI, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might show a UI message or handle this more gracefully.
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
let chat: Chat | null = null;

function startChat() {
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: 'You are a friendly and helpful voice assistant. Keep your responses concise and conversational, suitable for being spoken aloud.',
    },
  });
}

export const getAssistantResponse = async (message: string): Promise<string> => {
  if (!chat) {
    startChat();
  }

  // Type guard to ensure chat is not null
  if (!chat) {
    throw new Error("Chat session failed to initialize.");
  }

  try {
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error getting response from Gemini:", error);
    // Reset chat on error to start fresh
    startChat();
    return "I'm sorry, I seem to be having trouble connecting. Could you please try again?";
  }
};
