
// Wizard Online (Basis – lauffähig)
// Hinweis: Firebase-Konfiguration oben in index.html eintragen

const app = document.getElementById("app");
let playerId = crypto.randomUUID();
let lobbyRef = null;
let lobbyCode = "";

app.innerHTML = `
<h1>Wizard Online</h1>
<input id='name' placeholder='Name'><br><br>
<button onclick='createLobby()'>Lobby erstellen</button><br><br>
<input id='code' placeholder='Code'><br>
<button onclick='joinLobby()'>Beitreten</button>
`;

function createLobby(){
  lobbyCode = Math.random().toString(36).substr(2,5).toUpperCase();
  lobbyRef = db.ref("lobbies/"+lobbyCode);
  lobbyRef.set({players:{[playerId]:{name:name.value,score:0}},state:"waiting"});
  listen();
}

function joinLobby(){
  lobbyCode = code.value.toUpperCase();
  lobbyRef = db.ref("lobbies/"+lobbyCode);
  lobbyRef.once("value").then(s=>{
    if(!s.exists()) return alert("Lobby nicht gefunden");
    lobbyRef.child("players/"+playerId).set({name:name.value,score:0});
    listen();
  });
}

function listen(){
  lobbyRef.on("value",s=>{
    const d=s.val();
    if(!d) return;
    app.innerHTML = "<h2>Lobby "+lobbyCode+"</h2>"+Object.values(d.players).map(p=>p.name).join("<br>");
  });
}
