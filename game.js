const app = document.getElementById("app");

let playerName = "";
let lobbyCode = "";
let playerId = localStorage.getItem("wizardPlayerId") ||
               Math.random().toString(36).substr(2, 9);
localStorage.setItem("wizardPlayerId", playerId);

let lobbyRef;

// ================= START =================
showStart();

function showStart() {
  app.innerHTML = `
    <h2>Wizard Online</h2>
    <input id="name" placeholder="Dein Name"><br>
    <button onclick="createLobby()">Lobby erstellen</button><br><br>
    <input id="code" placeholder="Lobby-Code">
    <button onclick="joinLobby()">Lobby beitreten</button>
  `;
}

// ================= LOBBY =================
function createLobby() {
  playerName = document.getElementById("name").value.trim();
  if (!playerName) return alert("Name eingeben");

  lobbyCode = Math.random().toString(36).substr(2, 5).toUpperCase();
  lobbyRef = db.ref("lobbies/" + lobbyCode);

  lobbyRef.set({
    host: playerId,
    state: "waiting",
    round: 1,
    players: {
      [playerId]: { name: playerName, score: 0 }
    }
  });

  enterLobby();
}

function joinLobby() {
  playerName = document.getElementById("name").value.trim();
  lobbyCode = document.getElementById("code").value.trim().toUpperCase();
  if (!playerName || !lobbyCode) return alert("Name & Code eingeben");

  lobbyRef = db.ref("lobbies/" + lobbyCode);

  lobbyRef.once("value", snap => {
    if (!snap.exists()) return alert("Lobby nicht gefunden");

    lobbyRef.child("players/" + playerId).set({
      name: playerName,
      score: 0
    });

    enterLobby();
  });
}

// ================= LOBBY LISTENER =================
function enterLobby() {
  lobbyRef.on("value", snap => {
    const data = snap.val();
    if (!data) return;

    if (data.state === "waiting") renderLobby(data);
    if (data.state === "round") renderRound(data);
  });
}

// ================= LOBBY UI =================
function renderLobby(data) {
  const players = Object.values(data.players || {});
  const isHost = data.host === playerId;

  app.innerHTML = `
    <h2>Lobby ${lobbyCode}</h2>
    <h3>Spieler (${players.length}/6)</h3>
    ${players.map(p => `<div>${p.name}</div>`).join("")}
    ${isHost && players.length >= 3
      ? `<button onclick="startRound()">Runde starten</button>`
      : `<p>Warte auf Host…</p>`
    }
  `;
}

// ================= RUNDE START =================
function startRound() {
  lobbyRef.once("value", snap => {
    const data = snap.val();
    if (data.host !== playerId) return;

    const players = Object.keys(data.players);
    const round = data.round;

    const deck = createDeck();
    shuffle(deck);

    const hands = {};
    players.forEach(pid => hands[pid] = []);

    for (let i = 0; i < round; i++) {
      players.forEach(pid => {
        hands[pid].push(deck.pop());
      });
    }

    const trump = deck.pop() || null;

    lobbyRef.update({
      state: "round",
      trump,
      hands
    });
  });
}

// ================= RUNDE UI =================
function renderRound(data) {
  const myHand = data.hands[playerId] || [];

  app.innerHTML = `
    <h2>Runde ${data.round}</h2>
    <h3>Trumpf: ${renderCard(data.trump)}</h3>
    <h3>Deine Karten</h3>
    <div>${myHand.map(renderCard).join("")}</div>
    <p>Ansagephase folgt…</p>
  `;
}

// ================= KARTEN =================
function createDeck() {
  const deck = [];
  const colors = ["blue", "green", "yellow", "red"];

  colors.forEach(c => {
    for (let v = 1; v <= 13; v++) {
      deck.push({ color: c, value: v });
    }
  });

  for (let i = 0; i < 4; i++) {
    deck.push({ special: "wizard" });
    deck.push({ special: "fool" });
  }

  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderCard(card) {
  if (!card) return "–";
  if (card.special === "wizard") return "🧙";
  if (card.special === "fool") return "🤡";
  return `<span class="card ${card.color}">${card.value}</span>`;
}
