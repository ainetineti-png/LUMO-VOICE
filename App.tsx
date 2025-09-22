
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantAvatar } from './components/AssistantAvatar';
import { ChatMessage } from './components/ChatMessage';
import { useSpeech } from './hooks/useSpeech';
import { getAssistantResponse } from './services/geminiService';
import type { Message, AssistantState } from './types';

const App: React.FC = () => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleUserInput = useCallback(async (text: string) => {
    setAssistantState('thinking');
    setConversation(prev => [...prev, { role: 'user', text }]);
  }, []);

  const handleAssistantResponse = useCallback(async (text: string) => {
    const responseText = await getAssistantResponse(text);
    setConversation(prev => [...prev, { role: 'assistant', text: responseText }]);
    setAssistantState('speaking');
    speak(responseText);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    // After speaking, go back to listening
    if (assistantState === 'speaking') {
      setAssistantState('listening');
    }
  }, [assistantState]);

  const handleInterrupt = useCallback(() => {
    if (assistantState === 'speaking') {
      cancelInteraction(); // Stop current speech
      setAssistantState('listening'); // Immediately start listening
    }
  }, [assistantState]);


  const {
    isSupported,
    isListening,
    startListening,
    stopListening,
    cancelInteraction,
    speak,
  } = useSpeech({
    onResult: handleUserInput,
    onSpeechEnd: handleSpeechEnd,
    onInterrupt: handleInterrupt,
  });
  
  const startConversation = useCallback(() => {
    setAssistantState('listening');
  }, []);
  
  const stopConversation = useCallback(() => {
    cancelInteraction();
    setAssistantState('idle');
  }, [cancelInteraction]);

  const handleAvatarClick = useCallback(() => {
    if (assistantState === 'idle') {
      startConversation();
    } else if (assistantState === 'speaking') {
      // Allow click as a fallback to interrupt
      handleInterrupt();
    } else {
      // Stop conversation if listening or thinking
      stopConversation();
    }
  }, [assistantState, startConversation, stopConversation, handleInterrupt]);

  useEffect(() => {
    if (assistantState === 'listening' && !isListening) {
      startListening();
    } else if (assistantState !== 'listening' && isListening) {
      stopListening();
    }
  }, [assistantState, isListening, startListening, stopListening]);
  
  useEffect(() => {
    if (assistantState === 'thinking') {
      // FIX: .findLast() is not available in all JS environments. Replaced with a widely supported alternative.
      const lastUserMessage = [...conversation].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        handleAssistantResponse(lastUserMessage.text);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantState, conversation]);

  useEffect(() => {
    // Auto-scroll chat window
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-900 text-white">
        <p className="text-2xl text-center">
          Sorry, your browser does not support the Web Speech API. <br/>
          Please try Chrome on desktop or Android.
        </p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-screen flex flex-col items-center bg-gray-900 text-white p-4 font-sans">
        <div className="flex-1 w-full max-w-4xl flex flex-col items-center pt-8">
            <h1 className="text-4xl font-bold text-gray-300 mb-2">Gemini Voice Assistant</h1>
            <p className="text-gray-400 mb-8">Click the orb to start. To interrupt, just start talking.</p>
            <div
              onClick={handleAvatarClick}
              className="cursor-pointer"
              aria-label={
                assistantState === 'idle' ? 'Start conversation' : 
                assistantState === 'speaking' ? 'Interrupt assistant and start listening' : 'Stop conversation'
              }
            >
                <AssistantAvatar state={assistantState} />
            </div>
            <p className="mt-4 text-sm text-gray-500 h-6" role="status" aria-live="polite">
                {assistantState === 'listening' && 'Listening...'}
                {assistantState === 'thinking' && 'Thinking...'}
                {assistantState === 'speaking' && 'Speaking... (Talk to interrupt)'}
                {assistantState === 'idle' && 'Click to activate'}
            </p>
        </div>

        <div className="w-full max-w-4xl h-1/2 overflow-y-auto p-4 bg-gray-800/50 rounded-t-lg" ref={chatContainerRef}>
            {conversation.length === 0 ? (
                 <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Conversation will appear here...</p>
                 </div>
            ) : (
                conversation.map((msg, index) => <ChatMessage key={index} message={msg} />)
            )}
        </div>
    </div>
  );
};

export default App;
