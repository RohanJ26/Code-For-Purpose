'use client';

import { useCallback } from 'react';
import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

function stripForSpeech(s: string): string {
  return s
    .replace(/https?:\/\/\S+/g, ' link ')
    .replace(/[^\p{L}\p{N}\s.,%$+\-:;'"()]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type MessageSpeechButtonProps = {
  text: string;
  messageId: string;
  speakingId: string | null;
  setSpeakingId: (id: string | null) => void;
  variant?: 'default' | 'onPrimary';
};

export function MessageSpeechButton({
  text,
  messageId,
  speakingId,
  setSpeakingId,
  variant = 'default',
}: MessageSpeechButtonProps) {
  const isSpeaking = speakingId === messageId;
  const clean = stripForSpeech(text);
  const isPlaceholder = /processing your request/i.test(text) || text.trim().startsWith('⏳');
  const canSpeak = clean.length > 2 && !isPlaceholder;

  const toggle = useCallback(() => {
    if (!canSpeak || typeof window === 'undefined') return;
    const syn = window.speechSynthesis;
    if (isSpeaking) {
      syn.cancel();
      setSpeakingId(null);
      return;
    }
    syn.cancel();
    setSpeakingId(messageId);

    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 0.98;
    u.pitch = 1;

    const pickVoice = () => {
      const voices = syn.getVoices();
      const v =
        voices.find((x) => /Google .*(English|en-US)|Microsoft (Aria|Jenny|Guy|Davis)/i.test(x.name)) ||
        voices.find((x) => x.lang?.toLowerCase().startsWith('en'));
      if (v) u.voice = v;
    };

    pickVoice();
    if (syn.getVoices().length === 0) {
      const onVoices = () => {
        pickVoice();
        syn.removeEventListener('voiceschanged', onVoices);
      };
      syn.addEventListener('voiceschanged', onVoices);
    }

    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    syn.speak(u);
  }, [canSpeak, clean, isSpeaking, messageId, setSpeakingId]);

  const iconClass =
    variant === 'onPrimary'
      ? 'text-primary-foreground/90'
      : 'text-muted-foreground hover:text-foreground';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 shrink-0 rounded-full ${variant === 'onPrimary' ? 'hover:bg-primary-foreground/15' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      disabled={!canSpeak}
      aria-label={isSpeaking ? 'Stop reading aloud' : 'Read message aloud'}
      title={isSpeaking ? 'Stop' : 'Listen'}
    >
      {isSpeaking ? (
        <Square className={`h-3.5 w-3.5 ${iconClass}`} />
      ) : (
        <Volume2 className={`h-3.5 w-3.5 ${iconClass}`} />
      )}
    </Button>
  );
}
