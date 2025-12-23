// ================= ANSAGEPHASE =================
function renderRound(data) {
  const myHand = data.hands[playerId] || [];
  const predictions = data.predictions || {};
  const players = Object.keys(data.players);

  const allPredicted = Object.keys(predictions).length === players.length;

  app.innerHTML = `
    <h2>Runde ${data.round}</h2>
    <h3>Trumpf: ${renderCard(data.trump)}</h3>
    <h3>Deine Karten</h3>
    <div>${myHand.map(renderCard).join("")}</div>
    <h3>Ansage</h3>
    ${
      predictions[playerId] === undefined
        ? `<input id="prediction" type="number" min="0" max="${data.round}">
           <button onclick="submitPrediction()">Ansage bestätigen</button>`
        : `<p>Ansage abgegeben ✅</p>`
    }
    ${
      allPredicted
        ? `<p>Alle Ansagen sind da ✔</p>
           ${data.host === playerId ? '<button onclick="startPlay()">Stichphase starten</button>' : '<p>Warte auf Host für Stichphase…</p>'}`
        : `<p>Warte auf andere Spieler…</p>`
    }
  `;
}

function submitPrediction() {
  const value = parseInt(document.getElementById("prediction").value);
  if (isNaN(value)) return alert("Bitte Zahl eingeben");

  lobbyRef.child("predictions/" + playerId).set(value);
  // kein direktes rendern! Listener erledigt das für alle
}
