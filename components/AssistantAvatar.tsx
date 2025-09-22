import React from 'react';
import type { AssistantState } from '../types';

interface AssistantAvatarProps {
  state: AssistantState;
}

const MicIcon = () => (
    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
);

const LoadingSpinner = () => (
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
);

const SpeakingIcon = () => (
    <div className="relative w-24 h-8 flex items-center justify-between">
        <div className="w-2 h-full bg-green-400 rounded-full animate-wavey delay-0"></div>
        <div className="w-2 h-full bg-green-400 rounded-full animate-wavey" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-full bg-green-400 rounded-full animate-wavey" style={{animationDelay: '0.2s'}}></div>
        <div className="w-2 h-full bg-green-400 rounded-full animate-wavey" style={{animationDelay: '0.3s'}}></div>
        <div className="w-2 h-full bg-green-400 rounded-full animate-wavey" style={{animationDelay: '0.4s'}}></div>
    </div>
);

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ state }) => {
  const baseClasses = "relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out border-4 shadow-2xl";
  
  let stateClasses = "bg-gray-700 border-gray-600";
  let content = <MicIcon />;

  switch (state) {
    case 'listening':
      stateClasses = "bg-blue-900/50 border-blue-500 animate-pulse";
      content = <MicIcon />;
      break;
    case 'thinking':
      stateClasses = "bg-purple-900/50 border-purple-500";
      content = <LoadingSpinner />;
      break;
    case 'speaking':
      stateClasses = "bg-green-900/50 border-green-500";
      content = <SpeakingIcon />;
      break;
    case 'idle':
    default:
      // default styles are fine
      break;
  }

  return (
    <div className={`${baseClasses} ${stateClasses}`}>
      {content}
       <style>{`
          @keyframes wavey {
              0%, 100% { transform: scaleY(0.3); background-color: #4ade80; }
              50% { transform: scaleY(1.0); background-color: #86efac; }
          }
          .animate-wavey { animation: wavey 1.2s infinite ease-in-out; }
      `}</style>
    </div>
  );
};
