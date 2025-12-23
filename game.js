const app = document.getElementById("app");

let playerName = "";
let lobbyCode = "";
let playerId = Math.random().toString(36).substr(2, 9);

// UI Start
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

// Lobby erstellen
function createLobby() {
  playerName = document.getElementById("name").value.trim();
  if (!playerName) return alert("Name eingeben");

  lobbyCode = Math.random().toString(36).substr(2, 5).toUpperCase();

  db.ref("lobbies/" + lobbyCode).set({
    host: playerId,
    players: {
      [playerId]: { name: playerName }
    },
    state: "waiting"
  });

  enterLobby();
}

// Lobby beitreten
function joinLobby() {
  playerName = document.getElementById("name").value.trim();
  lobbyCode = document.getElementById("code").value.trim().toUpperCase();

  if (!playerName || !lobbyCode) return alert("Name & Code eingeben");

  db.ref("lobbies/" + lobbyCode).once("value", snap => {
    if (!snap.exists()) return alert("Lobby nicht gefunden");

    db.ref(`lobbies/${lobbyCode}/players/${playerId}`).set({
      name: playerName
    });

    enterLobby();
  });
}

// Lobby Ansicht
function enterLobby() {
  const lobbyRef = db.ref("lobbies/" + lobbyCode);

  app.innerHTML = `
    <h2>Lobby ${lobbyCode}</h2>
    <div id="players"></div>
    <button id="startBtn" onclick="startGame()" style="display:none">
      Spiel starten
    </button>
  `;

  lobbyRef.on("value", snap => {
    const data = snap.val();
    if (!data) return;

    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = "<h3>Spieler:</h3>";

    const players = Object.values(data.players || {});
    players.forEach(p => {
      playersDiv.innerHTML += `<div>${p.name}</div>`;
    });

    // Host darf starten
    if (data.host === playerId && players.length >= 3) {
      document.getElementById("startBtn").style.display = "inline-block";
    }
  });
}

// Spielstart (Platzhalter)
function startGame() {
  db.ref(`lobbies/${lobbyCode}/state`).set("game");
  app.innerHTML = "<h2>Spiel startet…</h2>";
}
