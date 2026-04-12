'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isListening, startListening } = useVoiceRecorder({
    onTranscript: (text) => {
      onTranscript(text);
      setShowFeedback(false);
    },
    onError: (err) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    },
  });

  return (
    <div className="relative">
      <Button
        onClick={() => {
          setShowFeedback(true);
          startListening();
        }}
        disabled={disabled || isListening}
        size="icon"
        variant="outline"
        className="rounded-full w-10 h-10"
        title="Click to speak"
      >
        {isListening ? (
          <Volume2 className="w-4 h-4 animate-pulse text-primary" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {showFeedback && isListening && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-primary text-primary-foreground text-xs rounded-lg whitespace-nowrap">
          Listening...
        </div>
      )}

      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
