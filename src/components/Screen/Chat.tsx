"use client";

import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

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

const socketUrl = process.env.NEXT_BASE_URL || "http://localhost:7623";

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [messageContainerHeight, setMessageContainerHeight] =
    useState<number>(0);
  const [isClient, setIsClient] = useState<boolean>(false);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setIsClient(true);

    try {
      const storedSocketId = sessionStorage.getItem("socketId");

      socketRef.current = storedSocketId
        ? io(socketUrl, { query: { socketId: storedSocketId } })
        : io(socketUrl);

      // Wait for the socket to connect before accessing the ID
      socketRef.current.on("connect", () => {
        if (socketRef.current && !storedSocketId) {
          const newSocketId = socketRef.current.id;
          if (newSocketId) {
            // Check if ID exists
            sessionStorage.setItem("socketId", newSocketId);
          }
        }
      });

      socketRef.current.on("message", (data: ServerMessage) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { ...data, timestamp: new Date(data.timestamp) },
        ]);
      });

      socketRef.current.on("connect_error", (error: Error) => {
        console.error("Socket connection error:", error);
      });
    } catch (error) {
      console.error("Socket initialization error:", error);
    }

    const updateHeight = () => {
      const headerHeight = 100;
      const footerHeight = 100;
      const padding = 32;
      const availableHeight =
        window.innerHeight - headerHeight - footerHeight - padding;
      setMessageContainerHeight(Math.max(300, availableHeight));
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("message");
        socketRef.current.off("connect_error");
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
    if (input.trim() && socketRef.current?.id) {
      // Check if socket ID exists
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
                <div className="border border-blue-300 flex justify-end h-3 relative">
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
        <div className="flex">
          <input
            className="flex-grow border rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            maxLength={1000}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={sendMessage}
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
