import React, { useState } from "react";
import { Camera, Send, Loader2, AlertCircle } from "lucide-react";
import { CameraButton } from "@/components/camera-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  is_severe?: boolean;
}

export function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello, what medical problem can I help you with?",
      is_severe: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  const handleSend = async () => {
    if (input.trim() === "" && imageUrls.length === 0) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          imageUrls: imageUrls,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.result,
        is_severe: data.is_severe,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in AI response generation:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        is_severe: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setImageUrls([]);
    }
  };

  const handleImageCapture = (imageSrc: string) => {
    setImageUrls((prev) => [...prev, imageSrc]);
    setShowWebcam(false);
  };


  const handleFindDoctors = () => {
    window.open("https://www.google.com/maps/search/doctors+near+me", "_blank");
  };

  return (
    <div className="flex h-[600px] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Medical Assistant
        </h2>
        {loading && (
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-6">
        {messages.map((message, index) => (
          <React.Fragment key={`msg-${index}`}>
            <div
              className={`flex animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`relative max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.images?.map((image, imgIndex) => (
                  <img
                    key={imgIndex}
                    src={image}
                    alt={`Uploaded content ${imgIndex + 1}`}
                    className="mt-2 max-h-48 w-auto rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
            {message.is_severe && (
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
          </React.Fragment>
        ))}
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <button
            onClick={() => setShowWebcam((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <Camera className="h-5 w-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && imageUrls.length === 0)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {imageUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Preview ${index + 1}`}
                className="h-32 w-auto rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {showWebcam && (
        <CameraButton
          imgSrc={imageUrls[0]}
          setImgSrc={handleImageCapture}
          setShowWebcam={setShowWebcam}
        />
      )}
    </div>
  );
}

export default Chat;
