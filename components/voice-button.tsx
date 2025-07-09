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

function PureVoiceButton({
  status,
  setInput,
}: {
  status: UseChatHelpers['status'];
  setInput: UseChatHelpers['setInput'];
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
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

  const processAudioChunks = useCallback(async () => {
    if (audioChunks.length === 0) return;

    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    
    // For now, just show that recording was captured
    // In a real implementation, you would send this to a speech-to-text service
    toast.success('Voice recording captured! (Speech-to-text not implemented yet)');
    
    setAudioChunks([]);
  }, [audioChunks]);

  useEffect(() => {
    if (!isRecording && audioChunks.length > 0) {
      processAudioChunks();
    }
  }, [isRecording, audioChunks, processAudioChunks]);

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
    
    // Mobile: require 1 second long press to start recording
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPressing(false);
      startRecording();
    }, 1000);
  }, [startRecording]);

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
    
    // Stop recording immediately if currently recording
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

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
    
    // Stop recording immediately if currently recording
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

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
      <Button
        data-testid="voice-button"
        className={cx(
          "rounded-md p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200",
          isRecording ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700" : "",
          isLongPressing ? "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700" : ""
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
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onContextMenu={handleContextMenu}
        disabled={status !== 'ready'}
        variant="ghost"
      >
        <Mic size={14} className={cx(
          isRecording ? "text-white" : "",
          isLongPressing ? "text-white" : ""
        )} />
      </Button>
      
      {(isRecording || isLongPressing) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
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