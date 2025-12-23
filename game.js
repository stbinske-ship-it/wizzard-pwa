const app = document.getElementById("app");

// =================== PLAYER ID ===================
let urlParams = new URLSearchParams(window.location.search);
let playerId = urlParams.get("player");
if (!playerId) {
    playerId = localStorage.getItem("wizardPlayerId") || sessionStorage.getItem("wizardPlayerId");
    if (!playerId) {
        playerId = Math.random().toString(36).substr(2, 9);
        try { localStorage.setItem("wizardPlayerId", playerId); } catch(e){}
        try { sessionStorage.setItem("wizardPlayerId", playerId); } catch(e){}
    }
}

// =================== VARS ===================
let playerName = "";
let lobbyCode = "";
let lobbyRef;

// =================== START ===================
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

// =================== LOBBY ===================
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
    }).then(() => enterLobby());
}

function joinLobby() {
    playerName = document.getElementById("name").value.trim();
    lobbyCode = document.getElementById("code").value.trim().toUpperCase();
    if (!playerName || !lobbyCode) return alert("Name & Code eingeben");

    lobbyRef = db.ref("lobbies/" + lobbyCode);

    // Prüfen ob Lobby existiert
    lobbyRef.once("value").then(snap => {
        if (!snap.exists()) return alert("Lobby nicht gefunden");

        lobbyRef.child("players/" + playerId).set({
            name: playerName,
            score: 0
        }).then(() => enterLobby());
    });
}

// =================== LOBBY LISTENER ===================
function enterLobby() {
    if (!lobbyRef) return;

    lobbyRef.on("value", snap => {
        const data = snap.val();
        if (!data) return;

        switch (data.state) {
            case "waiting": renderLobby(data); break;
            case "round": renderRound(data); break;
            case "play": renderPlay(data); break;
            case "endRound": renderEndRound(data); break;
            case "finished": renderFinished(data); break;
        }
    });
}

// =================== LOBBY UI ===================
function renderLobby(data) {
    const players = Object.values(data.players || {});
    const isHost = data.host === playerId;

    app.innerHTML = `
    <h2>Lobby ${lobbyCode}</h2>
    <h3>Spieler (${players.length}/6)</h3>
    ${players.map(p => `<div>${p.name}</div>`).join("")}
    ${isHost && players.length >= 3
        ? `<button onclick="startRound()">Runde starten</button>`
        : `<p>Warte auf Host…</p>`}
  `;
}

// =================== RUNDE START ===================
function startRound() {
    lobbyRef.once("value").then(snap => {
        const data = snap.val();
        if (!data || data.host !== playerId) return;

        const players = Object.keys(data.players);
        const round = data.round;

        const deck = createDeck();
        shuffle(deck);

        const hands = {};
        players.forEach(pid => hands[pid] = []);

        for (let i = 0; i < round; i++) {
            players.forEach(pid => hands[pid].push(deck.pop()));
        }

        const trump = deck.pop() || null;

        lobbyRef.update({
            state: "round",
            trump,
            hands,
            predictions: {},
            played: {},
            trick: [],
        });
    });
}

// =================== ANSAGEPHASE ===================
function renderRound(data) {
    const myHand = data.hands[playerId] || [];
    const predictions = data.predictions || {};
    const players = Object.keys(data.players);
    const isHost = data.host === playerId;

    const allPredicted = Object.keys(predictions).length === players.length;

    app.innerHTML = `
    <h2>Runde ${data.round}</h2>
    <h3>Trumpf: ${renderCard(data.trump)}</h3>
    <h3>Deine Karten</h3>
    <div>${myHand.map(renderCard).join("")}</div>
    <h3>Ansage</h3>
    ${predictions[playerId] === undefined
        ? `<input id="prediction" type="number" min="0" max="${data.round}">
           <button onclick="submitPrediction()">Ansage bestätigen</button>`
        : `<p>Ansage abgegeben ✅</p>`}
    ${allPredicted
        ? `<p>Alle Ansagen sind da ✔</p>
           ${isHost ? '<button onclick="startPlay()">Stichphase starten</button>' : '<p>Warte auf Host für Stichphase…</p>'}`
        : `<p>Warte auf andere Spieler…</p>`}
  `;
}

function submitPrediction() {
    const value = parseInt(document.getElementById("prediction").value);
    if (isNaN(value)) return alert("Bitte Zahl eingeben");

    lobbyRef.child("predictions/" + playerId).set(value);
}

// =================== STICHPHASE ===================
function startPlay() {
    lobbyRef.update({ state: "play", trick: [], played: {} });
}

function renderPlay(data) {
    const myHand = data.hands[playerId] || [];
    const played = data.played || {};
    const trick = data.trick || [];

    app.innerHTML = `
    <h2>Runde ${data.round} – Stichphase</h2>
    <h3>Trumpf: ${renderCard(data.trump)}</h3>
    <h3>Deine Karten</h3>
    <div>
      ${myHand.map((c, i) =>
        `<span class="card ${c.color||''}" onclick="playCard(${i})">
          ${c.special? (c.special==='wizard'?'🧙':'🤡') : c.value}
        </span>`).join('')}
    </div>
    <h3>Aktueller Stich</h3>
    ${trick.map(p => `<div>${data.players[p.pid].name}: ${renderCard(p.card)}</div>`).join("")}
  `;
}

function playCard(index) {
    lobbyRef.once("value").then(snap => {
        const data = snap.val();
        if (!data) return;
        const hand = data.hands[playerId];
        const card = hand[index];

        hand.splice(index,1);
        data.hands[playerId] = hand;

        const trick = data.trick || [];
        trick.push({ pid: playerId, card });

        const played = data.played || {};
        played[playerId] = card;

        let update = { hands: data.hands, trick, played };

        if (Object.keys(played).length === Object.keys(data.players).length) {
            const winnerId = calculateTrickWinner(trick, data.trump);
            update.state = "endRound";
            update.trickWinner = winnerId;
        }

        lobbyRef.update(update);
    });
}

// =================== STICH AUSWERTEN ===================
function renderEndRound(data) {
    const winnerId = data.trickWinner;
    const winnerName = data.players[winnerId].name;

    let players = data.players;
    let roundPred = data.predictions || {};
    const round = data.round;

    Object.keys(players).forEach(pid=>{
        if(!players[pid].tricks) players[pid].tricks=0;
        if(pid===winnerId) players[pid].tricks++;
        const pred = roundPred[pid];
        if(pred===players[pid].tricks){
            players[pid].score += 20 + pred*10;
        }
        players[pid].tricks=0;
    });

    const nextRound = round+1;
    const newState = nextRound>20 ? "finished" : "waiting";

    app.innerHTML = `
    <h2>Stich beendet</h2>
    <p>Gewinner: ${winnerName}</p>
    <h3>Scores:</h3>
    ${Object.values(players).map(p=>`<div>${p.name}: ${p.score}</div>`).join("")}
    ${newState==="waiting" ? `<button onclick="startRound()">Nächste Runde</button>` : `<p>Spiel beendet!</p>`}
  `;

    lobbyRef.update({players, round: nextRound, state: newState, played:{}, trick:[]});
}

// =================== SPIEL BEENDET ===================
function renderFinished(data){
    app.innerHTML = `<h2>Spiel beendet!</h2>
    <h3>Endstand:</h3>
    ${Object.values(data.players).map(p=>`<div>${p.name}: ${p.score}</div>`).join("")}`;
}

// =================== KARTEN ===================
function createDeck() {
    const deck = [];
    const colors = ["blue", "green", "yellow", "red"];
    colors.forEach(c=>{for(let v=1;v<=13;v++){deck.push({color:c,value:v})}});
    for(let i=0;i<4;i++){deck.push({special:"wizard"});deck.push({special:"fool"});}
    return deck;
}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}}
function renderCard(card){if(!card)return "–";if(card.special==="wizard")return "🧙";if(card.special==="fool")return "🤡";return `<span class="card ${card.color}">${card.value}</span>`}

// =================== STICH GEWINNER ===================
function calculateTrickWinner(trick, trump){
    let leadColor = null;
    let winner = trick[0];
    trick.forEach((p,i)=>{
        const c = p.card;
        if(i===0 && !c.special) leadColor = c.color;
        if(c.special==="wizard"){winner=p; return;}
        if(winner.card.special==="wizard") return;
        if(trump && c.color===trump.color && winner.card.color!==trump.color){winner=p;return;}
        if(c.color===winner.card.color && c.value>winner.card.value){winner=p;}
    });
    return winner.pid;
}
