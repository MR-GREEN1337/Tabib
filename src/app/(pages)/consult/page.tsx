"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, MicVocal, MapPinned, ArrowLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Chat from "@/components/chat";
import CallDoctor from "@/components/doctor-call";

export function MedicalAssistant() {
  const [activeTab, setActiveTab] = useState<string>("chat");

  return (
    <>
      <Button
        variant="outline"
        className="hidden md:flex items-center mb-4 bg-transparent text-white absolute top-16 left-4 z-200"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="w-full max-w-4xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TooltipProvider>
            <div className="flex justify-center">
              <TabsList className="grid grid-cols-2 h-16 mb-4 max-w-lg w-full justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value="chat"
                      className="text-2xl data-[state=active]:bg-blue-100"
                    >
                      <MessageCircle />
                      <span className="sr-only">Chat Consultation</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Chat Consultation</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value="audio"
                      className="text-2xl data-[state=active]:bg-blue-100"
                    >
                      <MicVocal />
                      <span className="sr-only">Audio Consultation</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Audio Consultation</p>
                  </TooltipContent>
                </Tooltip>
              </TabsList>
            </div>
          </TooltipProvider>

          <TabsContent value="chat">
            <div className="flex justify-center">
              <Card className="w-full max-w-2xl">
                <CardContent className="p-0 relative">
                  <Button
                    variant="ghost"
                    className="md:hidden absolute left-4 top-4 z-10"
                    onClick={() => window.history.back()}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex justify-center">
                    <Chat />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audio">
            <div className="flex justify-center">
              <Card className="w-full max-w-2xl">
                <CardContent className="p-6 space-y-4">
                  <CallDoctor />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default MedicalAssistant;
