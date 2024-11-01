"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const navigateToConsult = () => {
    setIsAnimating(true); // Start the car animation
    setTimeout(() => {
      router.push("/consult");
    }, 900); // Delay navigation by 900ms
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white font-sans overflow-hidden">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-24 space-y-8 relative">
        <h1 className="text-5xl font-extrabold text-center sm:text-6xl md:text-7xl tracking-tight">
          Assess and Respond <br />{" "}
          <span className="text-indigo-400">Real-Time Situations</span>
        </h1>
        <p className="text-lg text-center text-gray-300 max-w-2xl px-6">
          Chat and camera-based support to evaluate emergencies, with instant
          access to nearest hospitals or doctors.
        </p>
        <Button
          className="relative px-6 py-3 text-lg font-semibold text-white bg-indigo-500 rounded-lg overflow-hidden
       hover:bg-indigo-400 active:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-300 
       transition duration-200 ease-in-out"
          onClick={navigateToConsult}
        >
          {/* Emergency Car Animation */}
          <span
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 transition-transform duration-700 ease-in-out 
                 ${isAnimating ? "translate-x-full" : "-translate-x-10"}`}
          >
            🚑
          </span>
          <span className="relative">Get Started</span>
        </Button>

        {/* Waterman Image */}
        <div className="absolute right-0 z-10 hidden md:block mt-[-20px] mr-[-20px] md:mt-[-40px] md:mr-[-40px] lg:mt-[-60px] lg:ml-[-60px]">
          <Image
            src="/waterman.png" // Ensure this path is correct
            alt="Waterman"
            width={300} // Adjust the width as needed
            height={300} // Adjust the height as needed
            className="object-contain max-w-full h-auto" // Ensure responsiveness
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-r from-gray-800 to-gray-900 px-6">
        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-indigo-300">App Features</h2>
            <ul className="space-y-4 text-gray-300">
              <li>
                📷 <span className="font-semibold">Capture Images</span>: Use
                the camera to send photos for quick assessment.
              </li>
              <li>
                💬 <span className="font-semibold">Live Chat</span>: Communicate
                your needs directly through a chat interface.
              </li>
              <li>
                📍 <span className="font-semibold">Find Help Nearby</span>:
                Instantly access hospitals and doctors via Google Maps.
              </li>
            </ul>
          </div>
          <div className="relative w-full h-80">
            <Image
              src="/emergency-response.jpg"
              alt="Emergency response illustration"
              layout="fill"
              objectFit="cover"
              className="rounded-lg shadow-lg max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="flex items-center justify-center py-16 bg-black relative">
      <Button
          className="relative px-6 py-3 text-lg font-semibold text-white bg-indigo-500 rounded-lg overflow-hidden
       hover:bg-indigo-400 active:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-300 
       transition duration-200 ease-in-out"
          onClick={navigateToConsult}
        >
          {/* Emergency Car Animation */}
          <span
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 transition-transform duration-700 ease-in-out 
                 ${isAnimating ? "translate-x-full" : "-translate-x-10"}`}
          >
            🚑
          </span>
          <span className="relative">Start a consultation</span>
        </Button>
      </section>

      <footer className="py-3 text-center text-gray-400 bg-gray-900">
        <div className="flex flex-col md:flex-row items-center justify-center md:space-y-0 md:space-x-4">
          <p className="text-sm">
            &copy; 2024 MongoDB AI Hackathon: Code for a Cause
          </p>
          <div className="flex items-center space-x-3 bg-gray-200 hover:bg-gray-300 px-2 rounded-lg">
            <Image
              src="/mongodb.png"
              alt="MongoDB Logo"
              width={100}
              height={100}
              className="inline-block"
            />
            <Image
              src="/aws.png"
              alt="AWS Logo"
              width={40}
              height={40}
              className="inline-block"
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
