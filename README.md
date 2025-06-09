# WebSocket Chat App

A **real-time chat application** where users can create or join chat rooms and communicate instantly.

## 🛠️ Tech Stack

| Layer    | Tech                           |
| -------- | ------------------------------ |
| Frontend | Next.js, React                 |
| Backend  | Rust, Tokio, Tokio-Tungstenite |
| Protocol | WebSocket (JSON payloads)      |


---

## 📂 Project Structure

```
/frontend      → Next.js frontend
/src     → Rust WebSocket server (Tokio + Tokio-Tungstenite)
```

---

## ✨ Features

* Create or join unique chat rooms
* Real-time bi-directional messaging via WebSocket
* Scalable, asynchronous WebSocket server written in Rust
* Modern, responsive frontend using Next.js

---

## 🚀 Getting Started

### 1️⃣ Backend (Rust WebSocket Server)

#### Requirements:

* Rust ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install))
* Cargo

#### Run the server:

```bash
cargo run
```

By default, the server listens on: `ws://localhost:8080`

---

### 2️⃣ Frontend (Next.js)

#### Requirements:

* Node.js (LTS recommended)
* npm or yarn

#### Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

### 📡 WebSocket Communication

* **Connect:** `ws://localhost:8080`

* **Protocol Overview:**

  * Client sends `{"action": "create", "room": "<room_name>"}` to create a room
  * Client sends `{"action": "join", "room": "<room_name>"}` to join a room
  * Chat messages: `{"action": "message", "content": "<your_message>"}`

* **Server responds:** JSON with status updates and broadcasted messages.

---

## 📌 TODO / Future Enhancements

* User authentication
* Persistent chat history (DB integration)
* Typing indicators / online users list
* Deployment setup (Docker/Nginx)

---


