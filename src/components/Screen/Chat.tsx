"use client";

import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "../ui/button";

interface Message {
  socketId: string;
  msg: string;
  timestamp: Date;
}

interface ServerMessage {
  socketId: string;
  msg: string;
  timestamp: string;
}

// Make sure to include the websocket protocol
const socketUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:7623";

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [messageContainerHeight, setMessageContainerHeight] = useState<number>(0);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  const messageEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setIsClient(true);

    try {
      const storedSocketId = sessionStorage.getItem("socketId");

      // Configure socket options
      const socketOptions = {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        ...(storedSocketId ? { query: { socketId: storedSocketId } } : {})
      };

      socketRef.current = io(socketUrl, socketOptions);

      // Connection event handlers
      socketRef.current.on("connect", () => {
        console.log("Socket connected successfully");
        setConnectionStatus('connected');
        
        if (socketRef.current && !storedSocketId) {
          const newSocketId = socketRef.current.id;
          if (newSocketId) {
            sessionStorage.setItem("socketId", newSocketId);
          }
        }
      });

      socketRef.current.on("disconnect", () => {
        console.log("Socket disconnected");
        setConnectionStatus('disconnected');
      });

      socketRef.current.on("connect_error", (error: Error) => {
        console.error("Socket connection error:", error);
        setConnectionStatus('error');
      });

      socketRef.current.on("message", (data: ServerMessage) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { ...data, timestamp: new Date(data.timestamp) },
        ]);
      });

      // Ping to verify connection
      socketRef.current.on("pong", () => {
        console.log("Received pong from server");
      });

      // const pingInterval = setInterval(() => {
      //   if (socketRef.current?.connected) {
      //     socketRef.current.emit("ping");
      //   }
      // }, 5000);

    } catch (error) {
      console.error("Socket initialization error:", error);
      setConnectionStatus('error');
    }

    const updateHeight = () => {
      const headerHeight = 100;
      const footerHeight = 100;
      const padding = 32;
      const availableHeight = window.innerHeight - headerHeight - footerHeight - padding;
      setMessageContainerHeight(Math.max(300, availableHeight));
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("message");
        socketRef.current.off("pong");
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() && socketRef.current?.id && socketRef.current?.connected) {
      const messageData: ServerMessage = {
        socketId: socketRef.current.id,
        msg: input.trim(),
        timestamp: new Date().toISOString(),
      };

      try {
        socketRef.current.emit("message", messageData);
        setInput("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      console.log("Socket not connected or message empty");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Chit Chat</h1>
      {connectionStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          Connection error. Please try refreshing the page.
        </div>
      )}
      {connectionStatus === 'disconnected' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-4">
          Disconnected. Attempting to reconnect...
        </div>
      )}
      <div className="w-full max-w-4xl bg-white rounded shadow p-4">
        <div
          className="overflow-y-auto border-b border-gray-200 mb-4"
          style={{ height: `${messageContainerHeight}px` }}
        >
          {messages.map((msg, index) => (
            <div
              key={`${msg.socketId}-${msg.timestamp.getTime()}-${index}`}
              className={`p-2 relative border-b flex ${
                msg.socketId === socketRef.current?.id
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs break-words px-5 pb-2 pt-3 rounded-2xl ${
                  msg.socketId === socketRef.current?.id
                    ? "bg-green-400 text-white rounded-br-none"
                    : "bg-gray-200 text-black rounded-bl-none"
                }`}
              >
                <span className="font-bold">Anonymous</span>
                <span className="block whitespace-pre-wrap text-black">{msg.msg}</span>
                <div className="flex justify-end h-3 relative">
                  <span className="block text-xs text-gray-500 absolute -right-2 -top-2">
                    {msg.timestamp.getHours().toString().padStart(2, "0")}:
                    {msg.timestamp.getMinutes().toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="flex-grow border rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            maxLength={1000}
          />
          <Button
            className="text-white px-4 py-2 rounded-r focus:outline-none focus:ring-2"
            onClick={sendMessage}
            disabled={!input.trim() || connectionStatus !== 'connected'}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;