
import React from 'react';

interface VoiceSelectorProps {
    voices: SpeechSynthesisVoice[];
    currentVoice: SpeechSynthesisVoice | null;
    onVoiceChange: (voice: SpeechSynthesisVoice) => void;
    disabled: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voices, currentVoice, onVoiceChange, disabled }) => {
    const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedVoiceName = event.target.value;
        const voice = voices.find(v => v.name === selectedVoiceName);
        if (voice) {
            onVoiceChange(voice);
        }
    };

    const englishVoices = voices.filter(v => v.lang.startsWith('en-'));

    return (
        <div className="flex items-center gap-3">
            <label htmlFor="voice-selector" className="text-gray-400 text-sm font-medium flex-shrink-0">
                Assistant Voice
            </label>
            <div className="relative w-full">
                <select
                    id="voice-selector"
                    value={currentVoice?.name || ''}
                    onChange={handleVoiceChange}
                    disabled={disabled || englishVoices.length === 0}
                    className="appearance-none w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5 pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Select assistant voice"
                >
                    {englishVoices.length === 0 ? (
                        <option value="">Loading voices...</option>
                    ) : (
                        englishVoices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                                {`${voice.name} (${voice.lang})`}
                            </option>
                        ))
                    )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
