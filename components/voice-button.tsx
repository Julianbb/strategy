'use client';

import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
} from 'react';
import { toast } from 'sonner';
import { Mic } from 'lucide-react';

import { Button } from './ui/button';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useModelSettings } from '@/hooks/use-model-settings';

function PureVoiceButton({
  status,
  setInput,
}: {
  status: UseChatHelpers['status'];
  setInput: UseChatHelpers['setInput'];
}) {
  const modelSettings = useModelSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingMimeType, setRecordingMimeType] = useState<string>('audio/webm');
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isCancelZone, setIsCancelZone] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [wasCancelled, setWasCancelled] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use a supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'; // fallback
      
      const recorder = new MediaRecorder(stream, { mimeType });
      setRecordingMimeType(mimeType);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      setWasCancelled(false);

      // Start the recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);

      // Auto-stop after 60 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
          setMediaRecorder(null);
        }
        
        // Clear all timers
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        setRecordingTime(0);
        toast.info('Recording stopped automatically after 60 seconds');
      }, 60000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }

    // Clear all timers
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    setRecordingTime(0);
  }, [mediaRecorder]);

  const cancelRecording = useCallback(() => {
    // Set cancelled state first to prevent processing
    setWasCancelled(true);
    // Clear audio chunks immediately to prevent processing
    setAudioChunks([]);
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }

    // Clear all timers
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    setRecordingTime(0);
    setIsCancelZone(false);
    toast.info('Recording cancelled');
  }, [mediaRecorder]);

  const processAudioChunks = useCallback(async () => {
    if (audioChunks.length === 0 || wasCancelled) return;

    // Drop recordings shorter than 1 second
    if (recordingTime < 1.0) {
      setAudioChunks([]);
      return;
    }

    const audioBlob = new Blob(audioChunks, { type: recordingMimeType });
    
    try {
      const formData = new FormData();
      const fileExtension = recordingMimeType.includes('webm') ? 'webm' : 'mp4';
      formData.append('audio', audioBlob, `recording.${fileExtension}`);
      formData.append('model', modelSettings.getSttModel());

      const response = await fetch('/api/voice-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const { text } = await response.json();
      setInput(text);
      toast.success('Voice transcribed successfully!');
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Failed to transcribe audio');
    }
    
    setAudioChunks([]);
  }, [audioChunks, setInput, recordingMimeType, wasCancelled, recordingTime]);

  useEffect(() => {
    if (!isRecording && audioChunks.length > 0 && !wasCancelled) {
      processAudioChunks();
    }
  }, [isRecording, audioChunks, processAudioChunks, wasCancelled]);

  const handleClick = useCallback(() => {
    // Only handle clicks on desktop (non-touch devices)
    if (isTouchDevice) return;
    
    // Desktop: click to toggle recording
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, isTouchDevice]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTouchDevice(true);
    setIsTouchActive(true);
    setIsLongPressing(true);
    setTouchStartY(e.touches[0].clientY);
    setIsCancelZone(false);
    
    // Mobile: require 500ms long press to start recording
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPressing(false);
      startRecording();
    }, 500);
  }, [startRecording]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isRecording && !isLongPressing) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    
    // If dragged up more than 60px, enter cancel zone
    if (deltaY > 60) {
      setIsCancelZone(true);
    } else {
      setIsCancelZone(false);
    }
  }, [isRecording, isLongPressing, touchStartY]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear the long press timeout if still waiting
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    setIsLongPressing(false);
    setIsTouchActive(false);
    
    // Cancel recording if in cancel zone, otherwise stop normally
    if (isRecording) {
      if (isCancelZone) {
        cancelRecording();
      } else {
        stopRecording();
      }
    }
    
    setIsCancelZone(false);
  }, [isRecording, isCancelZone, stopRecording, cancelRecording]);

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear the long press timeout if still waiting
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    setIsLongPressing(false);
    setIsTouchActive(false);
    
    // Cancel recording on touch cancel
    if (isRecording) {
      cancelRecording();
    }
    
    setIsCancelZone(false);
  }, [isRecording, cancelRecording]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const progressPercentage = (recordingTime / 60) * 100;
  const radius = 14; // Keep radius consistent, scaling is handled by CSS transform
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className={cx(
      "relative transition-transform duration-200 ease-out",
      isTouchActive ? "scale-[3]" : "scale-100"
    )}>
      {isCancelZone && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
          Release to cancel
        </div>
      )}
      <Button
        ref={buttonRef}
        data-testid="voice-button"
        className={cx(
          "rounded-md p-3 h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200",
          isRecording && !isCancelZone ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700" : "",
          isLongPressing ? "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700" : "",
          isCancelZone ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800" : ""
        )}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none'
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onContextMenu={handleContextMenu}
        disabled={status !== 'ready'}
        variant="ghost"
      >
        <Mic size={18} className={cx(
          isRecording || isCancelZone ? "text-white" : "",
          isLongPressing ? "text-white" : ""
        )} />
      </Button>
      
      {(isRecording || isLongPressing) && (
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          viewBox="0 0 32 32"
        >
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-white opacity-80"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '16px 16px',
              transition: 'stroke-dashoffset 0.1s ease-out'
            }}
          />
        </svg>
      )}
    </div>
  );
}

export const VoiceButton = memo(PureVoiceButton);