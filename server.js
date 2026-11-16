const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static("docs"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "MVS Duels 3D" }));

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const waiting = { "1v1": [], "2v2": [], "3v3": [] };
const MAX = { "1v1": 2, "2v2": 4, "3v3": 6 };
const ROUND_SECONDS = 90;

function publicRoom(room) {
  return {
    id: room.id, mode: room.mode, status: room.status,
    seconds: room.seconds,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, role: p.role, team: p.team,
      x: p.x, z: p.z, score: p.score, ready: p.ready
    }))
  };
}
function emitRoom(room) { io.to(room.id).emit("roomState", publicRoom(room)); }
function startRound(room) {
  if (room.players.size < MAX[room.mode]) return;
  room.status = "playing"; room.seconds = ROUND_SECONDS;
  let i = 0;
  for (const p of room.players.values()) {
    p.team = i % 2 === 0 ? "red" : "blue";
    p.role = p.team === "red" ? "Asesino" : "Sheriff";
    p.x = p.team === "red" ? -5 : 5;
    p.z = (i % 3 - 1) * 2;
    p.ready = true;
    i++;
  }
  emitRoom(room);
}
function leaveRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  socket.leave(roomId);
  socket.data.roomId = null;
  if (room) {
    room.players.delete(socket.id);
    if (room.players.size === 0) rooms.delete(roomId);
    else {
      if (room.status === "playing") {
        room.status = "waiting";
        room.seconds = ROUND_SECONDS;
        for (const p of room.players.values()) { p.role = "Esperando"; p.ready = false; }
      }
      emitRoom(room);
    }
  }
}
function findRoom(mode) {
  for (const room of rooms.values())
    if (room.mode === mode && room.status === "waiting" && room.players.size < MAX[mode]) return room;
  const id = "MVS-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const room = { id, mode, status: "waiting", seconds: ROUND_SECONDS, players: new Map() };
  rooms.set(id, room);
  return room;
}

io.on("connection", socket => {
  socket.emit("hello", { message: "Conectado al servidor MVS Duels 3D" });

  socket.on("joinQueue", ({ name, mode }) => {
    if (!["1v1", "2v2", "3v3"].includes(mode)) return;
    leaveRoom(socket);
    const safeName = String(name || "Jugador").replace(/[<>]/g, "").slice(0, 16);
    const room = findRoom(mode);
    const team = room.players.size % 2 === 0 ? "red" : "blue";
    room.players.set(socket.id, {
      id: socket.id, name: safeName, role: "Esperando", team,
      x: team === "red" ? -5 : 5, z: 0, score: 0, ready: false
    });
    socket.data.roomId = room.id;
    socket.join(room.id);
    socket.emit("joined", { roomId: room.id, mode });
    emitRoom(room);
    if (room.players.size === MAX[mode]) startRound(room);
  });

  socket.on("move", ({ x, z }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.status !== "playing") return;
    const p = room.players.get(socket.id);
    if (!p) return;
    p.x = Math.max(-10, Math.min(10, Number(x) || 0));
    p.z = Math.max(-7, Math.min(7, Number(z) || 0));
    socket.to(room.id).emit("playerMoved", { id: socket.id, x: p.x, z: p.z });
    // Regla segura de captura por contacto: sin armas ni daño.
    if (p.role === "Asesino") {
      for (const target of room.players.values()) {
        if (target.role === "Sheriff" && Math.hypot(p.x-target.x, p.z-target.z) < 1.15) {
          p.score++;
          room.status = "finished";
          io.to(room.id).emit("roundOver", { winner: "red", reason: "¡El equipo rojo atrapó al Sheriff!" });
          emitRoom(room);
          break;
        }
      }
    }
  });

  socket.on("disconnect", () => leaveRoom(socket));
});

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.status !== "playing") continue;
    room.seconds--;
    if (room.seconds <= 0) {
      room.status = "finished";
      io.to(room.id).emit("roundOver", { winner: "blue", reason: "¡El Sheriff resistió hasta que terminó el tiempo!" });
    }
    emitRoom(room);
  }
}, 1000);

server.listen(PORT, () => console.log(`MVS Duels 3D escuchando en ${PORT}`));
