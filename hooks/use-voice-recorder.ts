import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecorderProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder({ onTranscript, onError }: UseVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Speech-to-text using Web Speech API
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      onError?.(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onTranscript, onError]);

  // Audio recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Send to server for transcription
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
          const response = await fetch(`${apiUrl}/voice-transcribe`, {
            method: 'POST',
            body: formData,
          });

          console.log('[v0] Voice transcription response:', response.status);

          if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);

          const data = await response.json();
          console.log('[v0] Transcribed text:', data.text);
          onTranscript(data.text);
        } catch (error) {
          console.error('[v0] Voice transcription error:', error);
          onError?.(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      onError?.('Microphone access denied');
    }
  }, [onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    isListening,
    startRecording,
    stopRecording,
    startListening,
  };
}
