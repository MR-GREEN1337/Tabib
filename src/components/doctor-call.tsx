import { useEffect, useState, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface ResponseData {
  result: string;
  is_severe: string;
  audio: {
    data: string;
    contentType: string;
  };
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function CallDoctor() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isSevere, setIsSevere] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mounted = useRef<boolean>(true);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mounted.current = true;
    
    // Create audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create audio element
    audioRef.current = new Audio();
    
    audioRef.current.addEventListener('ended', handleAudioEnded);
    audioRef.current.addEventListener('error', handleAudioError);
    
    return () => {
      mounted.current = false;
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    // Cancel any ongoing audio playback
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch (error) {
        console.error('Error waiting for play promise:', error);
      }
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    if (audioRef.current) {
      audioRef.current.removeEventListener('ended', handleAudioEnded);
      audioRef.current.removeEventListener('error', handleAudioError);
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    if (audioContextRef.current?.state !== 'closed') {
      try {
        await audioContextRef.current?.close();
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }

    // Revoke any existing object URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
  };

  const handleAudioEnded = () => {
    if (mounted.current) {
      setIsPlaying(false);
      startRecording();
    }
  };

  const handleAudioError = (e: Event) => {
    console.error('Audio playback error:', e);
    if (mounted.current) {
      setError('Error playing audio response');
      setIsPlaying(false);
    }
  };

  const playAudio = async (audioData: string) => {
    try {
      if (!audioRef.current || !mounted.current) return;

      // Clean up previous audio
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (error) {
          console.error('Error waiting for previous play promise:', error);
        }
      }

      audioRef.current.pause();
      
      // Revoke any existing object URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      // Convert base64 to blob
      const byteCharacters = atob(audioData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      if (!mounted.current) {
        URL.revokeObjectURL(url);
        return;
      }

      // Set up audio element
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      
      setIsPlaying(true);
      
      // Store the play promise
      playPromiseRef.current = audioRef.current.play();
      await playPromiseRef.current;
      
      // Clear the promise reference after it completes
      playPromiseRef.current = null;
    } catch (error) {
      console.error('Error playing audio:', error);
      if (mounted.current) {
        setError('Error playing audio response');
        setIsPlaying(false);
      }
      playPromiseRef.current = null;
    }
  };

  const sendToBackend = async (message: string): Promise<void> => {
    if (!mounted.current) return;
    
    setIsLoading(true);
    setError("");
    setIsSevere(false);

    try {
      stopRecording();
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: ResponseData = await response.json();
      
      if (!mounted.current) return;

      if (data.result) {
        setResponse(data.result);
        setIsSevere(data.is_severe === "true");
      }

      if (data.audio?.data && data.audio?.contentType === "audio/mp3") {
        await playAudio(data.audio.data);
      }
    } catch (error) {
      console.error("Error sending data to backend:", error);
      if (mounted.current) {
        setError("Error processing request");
        setIsPlaying(false);
      }
    }
    if (mounted.current) {
      setIsLoading(false);
    }
  };

  const handleResult = (event: any): void => {
    if (!mounted.current) return;
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      interimTranscript += event.results[i][0].transcript;
    }
    setTranscript(interimTranscript);

    silenceTimerRef.current = setTimeout(() => {
      if (mounted.current) {
        sendToBackend(interimTranscript);
        setTranscript("");
      }
    }, 2000);
  };

  const startRecording = () => {
    if (!mounted.current) return;

    try {
      setError("");
      setIsRecording(true);
      setTranscript("");

      const SpeechRecognition = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
        
      if (!SpeechRecognition) {
        throw new Error("Speech recognition is not supported in this browser");
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (mounted.current) {
          setError(`Recognition error: ${event.error}`);
          setIsRecording(false);
        }
      };

      recognitionRef.current.onresult = handleResult;
      recognitionRef.current.onend = () => {
        console.log("Recognition ended");
        if (mounted.current) {
          setIsRecording(false);
        }
      };

      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      if (mounted.current) {
        setError(error instanceof Error ? error.message : "Error starting recognition");
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleToggleRecording = () => {
    if (!isRecording && !isPlaying) startRecording();
    else if (isRecording) stopRecording();
  };

  const handleFindDoctors = () => {
    window.open("https://www.google.com/maps/search/doctors+near+me", "_blank");
  };

  return (
    <main className="flex flex-col items-center h-[600px] bg-gray-100 p-4">
      <ScrollArea >
      {error && (
        <div className="w-full max-w-2xl p-4 mb-4 bg-red-100 text-red-700 rounded-lg text-center">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="w-full max-w-2xl p-4 mb-4 bg-blue-100 text-blue-700 rounded-lg text-center">
          Processing...
        </div>
      )}

      {isSevere && (
        <Alert variant="destructive" className="w-full max-w-2xl mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Emergency Medical Attention Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-4">
            <p>This situation requires immediate medical attention. Please seek emergency care or consult a healthcare provider immediately.</p>
            <Button 
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleFindDoctors}
            >
              Find Nearest Doctors
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        {(isRecording || transcript || response) && (
          <div className="p-4">
            <div className="flex flex-col space-y-4">
              {isRecording && (
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">Listening...</p>
                </div>
              )}
              
              {transcript && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg text-gray-700">{transcript}</p>
                </div>
              )}
              
              {response && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg text-gray-800">{response}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 flex justify-center">
          <button
            onClick={handleToggleRecording}
            disabled={isPlaying || isLoading}
            className={`
              flex items-center justify-center
              rounded-full w-32 h-32
              text-white font-bold
              transition-all duration-200
              ${isRecording 
                ? "bg-red-500 hover:bg-red-600 prominent-pulse" 
                : "bg-blue-500 hover:bg-blue-600"
              }
              ${(isPlaying || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isRecording ? "Stop" : "Start"}
          </button>
        </div>
      </div>
    </ScrollArea>
    </main>
  );
}