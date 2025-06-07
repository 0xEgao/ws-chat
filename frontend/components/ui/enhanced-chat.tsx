"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Toaster, toast } from "sonner"
import { Menu, MessageCircle, Users, Wifi, WifiOff, Send, Plus } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

interface Message {
  sender: string
  content: string
  timestamp: Date
}

interface Room {
  name: string
  messages: Message[]
}

// Loading Component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="text-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-300 animate-spin animation-delay-150"></div>
            <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-pink-300 animate-spin animation-delay-300"></div>
          </div>
          <MessageCircle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Chat<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Hub</span>
          </h1>
          <p className="text-white/70 text-lg">Connecting to chat server...</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce animation-delay-100"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce animation-delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Message Skeleton
function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div className="space-y-2 max-w-[75%]">
            <div className="h-4 bg-gray-600/50 rounded w-20 animate-pulse"></div>
            <div className={`p-3 rounded-2xl ${i % 2 === 0 ? "bg-gray-700/50" : "bg-blue-600/50"}`}>
              <div className="h-4 bg-gray-500/50 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Chat() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoom, setCurrentRoom] = useState<string>("")
  const [newRoomName, setNewRoomName] = useState("")
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const handleMessage = useCallback(
    (message: string) => {
      console.log("Received message:", message)

      if (message.startsWith("ROOM_LIST:")) {
        const roomList = message.slice(10).split(",").filter(Boolean)
        setRooms((prevRooms) => {
          const existingRooms = new Map(prevRooms.map((r) => [r.name, r.messages]))
          return roomList.map((name) => ({
            name,
            messages: existingRooms.get(name) || [],
          }))
        })
        return
      }

      if (message.startsWith("MSG:")) {
        const [_, roomName, sender, content] = message.split(":")

        setRooms((prevRooms) => {
          const updatedRooms = [...prevRooms]
          const roomIndex = updatedRooms.findIndex((r) => r.name === roomName)

          if (roomIndex === -1) return prevRooms

          const newMessage = {
            sender: sender.trim(),
            content,
            timestamp: new Date(),
          }

          updatedRooms[roomIndex] = {
            ...updatedRooms[roomIndex],
            messages: [...updatedRooms[roomIndex].messages, newMessage],
          }

          return updatedRooms
        })
        return
      }

      const historyMatch = message.match(/^([^[]+)\s*\[([^\]]+)\]:\s*(.+)$/)
      if (historyMatch && currentRoom) {
        const [_, sender, timeStr, content] = historyMatch
        setRooms((prevRooms) => {
          const updatedRooms = [...prevRooms]
          const roomIndex = updatedRooms.findIndex((r) => r.name === currentRoom)

          if (roomIndex === -1) return prevRooms

          const [hours, minutes, seconds] = timeStr.split(":").map(Number)
          const timestamp = new Date()
          timestamp.setHours(hours, minutes, seconds)

          const newMessage = {
            sender: sender.trim(),
            content,
            timestamp,
          }

          updatedRooms[roomIndex] = {
            ...updatedRooms[roomIndex],
            messages: [...updatedRooms[roomIndex].messages, newMessage],
          }

          return updatedRooms
        })
      }
    },
    [currentRoom],
  )

  useEffect(() => {
    const websocket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080")

    websocket.onopen = () => {
      setIsConnected(true)
      setIsConnecting(false)
      toast.success("🎉 Connected to ChatHub", {
        description: "You can now start chatting!",
        duration: 3000,
      })
    }

    websocket.onclose = () => {
      setIsConnected(false)
      setIsConnecting(false)
      toast.error("❌ Disconnected from server", {
        description: "Trying to reconnect...",
        duration: 5000,
      })
    }

    websocket.onerror = () => {
      setIsConnected(false)
      setIsConnecting(false)
      toast.error("⚠️ Connection error", {
        description: "Failed to connect to the chat server",
        duration: 5000,
      })
    }

    websocket.onmessage = (event) => {
      handleMessage(event.data)
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }, [])

  const createRoom = async () => {
    if (!newRoomName || !ws) return

    setIsJoiningRoom(true)
    ws.send(`CREATE_ROOM:${newRoomName}`)
    setRooms((prev) => [...prev, { name: newRoomName, messages: [] }])
    setCurrentRoom(newRoomName)
    setNewRoomName("")

    // Simulate network delay
    setTimeout(() => setIsJoiningRoom(false), 500)

    toast.success(`🏠 Room "${newRoomName}" created!`, {
      description: "You can now start chatting in this room.",
    })
  }

  const joinRoom = async (roomName: string) => {
    if (!ws) return

    setIsJoiningRoom(true)

    setRooms((prev) => prev.map((room) => (room.name === roomName ? { ...room, messages: [] } : room)))

    setCurrentRoom(roomName)

    setRooms((prev) => {
      const roomExists = prev.some((r) => r.name === roomName)
      if (!roomExists) {
        return [...prev, { name: roomName, messages: [] }]
      }
      return prev
    })

    ws.send(`JOIN_ROOM:${roomName}`)

    // Simulate network delay
    setTimeout(() => setIsJoiningRoom(false), 500)
  }

  const leaveRoom = () => {
    if (!currentRoom || !ws) return
    ws.send(`LEAVE_ROOM:${currentRoom}`)
    setRooms((prev) => prev.map((room) => (room.name === currentRoom ? { ...room, messages: [] } : room)))
    setCurrentRoom("")
    toast.info("👋 Left the room")
  }

  const sendMessage = async () => {
    if (!message || !currentRoom || !username || !ws) return

    setIsSendingMessage(true)
    const messageToSend = `ROOM_MSG:${currentRoom}:${username}:${message}`
    ws.send(messageToSend)
    setMessage("")

    // Simulate network delay
    setTimeout(() => setIsSendingMessage(false), 300)
  }

  // Show loading screen while connecting
  if (isConnecting) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 sm:p-4 md:p-6">
      <Toaster richColors closeButton position="top-center" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Chat
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Hub</span>
              </h1>
              <p className="text-sm text-gray-400">Real-time messaging platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-6">
        {/* Sidebar */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 hidden md:block rounded-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-gray-100 text-xl font-bold flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-400" />
              Chat Rooms
            </CardTitle>
            <p className="text-sm text-gray-400">Join or create a room to start chatting</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
            <div className="flex space-x-2">
              <Input
                placeholder="New room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
              <Button
                onClick={createRoom}
                disabled={isJoiningRoom || !newRoomName}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all duration-200 hover:shadow-purple-500/25"
              >
                {isJoiningRoom ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2">
                {rooms.map((room) => (
                  <Button
                    key={room.name}
                    variant={currentRoom === room.name ? "default" : "ghost"}
                    className={`w-full justify-start font-medium rounded-lg transition-all duration-200 ${
                      currentRoom === room.name
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    } hover:scale-[1.02] active:scale-100`}
                    onClick={() => joinRoom(room.name)}
                    disabled={isJoiningRoom}
                  >
                    <span className="mr-2">#</span>
                    {room.name}
                    {room.messages.length > 0 && (
                      <Badge variant="secondary" className="ml-auto bg-gray-700 text-gray-300 text-xs">
                        {room.messages.length}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 col-span-1 md:col-span-3 rounded-xl overflow-hidden shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700/50 p-4 bg-gray-800/30">
            <div className="flex items-center space-x-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden p-2">
                    <Menu className="h-5 w-5 text-white" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[300px] p-0 bg-gray-900/95 backdrop-blur-md border-r border-gray-700/50"
                >
                  <div className="h-full">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-gray-100 text-xl font-bold flex items-center">
                        <Users className="w-5 h-5 mr-2 text-purple-400" />
                        Chat Rooms
                      </CardTitle>
                      <p className="text-sm text-gray-400">Join or create a room</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input
                        placeholder="Your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400"
                      />
                      <div className="flex space-x-2">
                        <Input
                          placeholder="New room name"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          className="bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400"
                        />
                        <Button
                          onClick={createRoom}
                          disabled={isJoiningRoom}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-[calc(100vh-300px)]">
                        <div className="space-y-2">
                          {rooms.map((room) => (
                            <Button
                              key={room.name}
                              variant={currentRoom === room.name ? "default" : "ghost"}
                              className={`w-full justify-start transition-all duration-200 ${
                                currentRoom === room.name
                                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                                  : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                              }`}
                              onClick={() => joinRoom(room.name)}
                              disabled={isJoiningRoom}
                            >
                              # {room.name}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <CardTitle className="text-gray-100 text-xl font-bold tracking-wide">
                  {currentRoom ? `#${currentRoom}` : "Select a room"}
                </CardTitle>
              </div>
            </div>
            {currentRoom && (
              <Button
                variant="destructive"
                onClick={leaveRoom}
                className="bg-red-600/80 hover:bg-red-700 shadow-lg transition-all duration-200"
              >
                Leave Room
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 h-[calc(100vh-220px)] flex flex-col">
            <ScrollArea className="flex-1 overflow-y-auto scroll-smooth">
              {isJoiningRoom && currentRoom ? (
                <MessageSkeleton />
              ) : (
                <div className="flex flex-col p-4 space-y-4">
                  {currentRoom &&
                    rooms
                      .find((r) => r.name === currentRoom)
                      ?.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex flex-col transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-2 ${
                            msg.sender === username ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[75%] shadow-lg relative backdrop-blur-sm ${
                              msg.sender === username
                                ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                                : "bg-gradient-to-br from-gray-700/80 to-gray-600/80 text-gray-100 border border-gray-600/30"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-4 mb-1">
                              <span className="font-semibold text-sm">{msg.sender}</span>
                              <span className="text-xs opacity-70">{msg.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className="break-words text-sm leading-relaxed">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                  {currentRoom && rooms.find((r) => r.name === currentRoom)?.messages.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-gray-400">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t border-gray-700/50 mt-auto bg-gray-800/30">
              <div className="flex space-x-2">
                <Input
                  placeholder={
                    !username
                      ? "Set your username first..."
                      : !currentRoom
                        ? "Join a room to start chatting..."
                        : "Type your message..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isSendingMessage && sendMessage()}
                  disabled={!currentRoom || !username || isSendingMessage}
                  className="bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!currentRoom || !username || !message || isSendingMessage}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 shadow-lg transition-all duration-200 hover:shadow-purple-500/25"
                >
                  {isSendingMessage ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
