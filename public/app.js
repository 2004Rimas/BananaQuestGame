document.addEventListener("DOMContentLoaded", () => {

  const bananaImg = document.getElementById("bananaImg");
  const answerInput = document.getElementById("answerInput");
  const answerBtn = document.getElementById("answerBtn");
  const puzzleFeedback = document.getElementById("puzzleFeedback");
  const leaderboardEl = document.getElementById("leaderboard");
  const myScoresEl = document.getElementById("myScores");
  const headerActions = document.getElementById("headerActions");

  let correctSolution = null;

  // ---- AUTH CHECK ----
  async function checkAuth() {
    const r = await fetch("/api/user-status");
    const data = await r.json();

    // Not logged in?
    if (!data.loggedIn) {
      window.location.href = "/login.html";
      return;
    }

    // Logged in
    headerActions.innerHTML = `
      <span class="hint">Welcome, <strong>${data.name}</strong></span>
      <button class="btn" id="logoutBtn">Logout</button>
    `;

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/logout");
      window.location.href = "/login.html";
    });
  }

  // ---- LOAD PUZZLE ----
  async function loadPuzzle() {
    try {
      const r = await fetch("/banana-json");
      const data = await r.json();

      bananaImg.src = data.question;
      correctSolution = Number(data.solution);

      answerInput.value = "";
      puzzleFeedback.textContent = "";
    } catch (err) {
      puzzleFeedback.textContent = "Failed to load puzzle.";
      puzzleFeedback.style.color = "red";
    }
  }

  // ---- ANSWER SUBMIT ----
  answerBtn.addEventListener("click", async () => {
  const userAnswer = Number(answerInput.value);

  if (!Number.isFinite(userAnswer)) {
    puzzleFeedback.textContent = "Enter a numeric answer.";
    puzzleFeedback.style.color = "#d32f2f";
    return;
  }

  if (userAnswer === correctSolution) {
    puzzleFeedback.textContent = "Correct! 🎉 Saving score...";
    puzzleFeedback.style.color = "#2e7d32";

    // Use some logic for score. Here: submit the puzzle's solution as the score
    const scoreToSend = Number(correctSolution); // or use your points variable

    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: scoreToSend })
    });

    const json = await res.json();
    console.log("/api/save response:", json);

    if (!res.ok) {
      puzzleFeedback.textContent = json.message || "Failed to save score";
      puzzleFeedback.style.color = "#d32f2f";
      return;
    }

    loadLeaderboard();
    loadMyScores();
    setTimeout(loadPuzzle, 1000);
  } else {
    puzzleFeedback.textContent = "Wrong answer. Try again!";
    puzzleFeedback.style.color = "#d32f2f";
  }
});

  // ---- LEADERBOARD ----
  async function loadLeaderboard() {
    const r = await fetch("/api/leaderboard");
    const data = await r.json();

    leaderboardEl.innerHTML = "";
    data.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "leaderboard-item";
      div.innerHTML = `<span>${i + 1}. ${p.name}</span><span>${p.score} pts</span>`;
      leaderboardEl.appendChild(div);
    });
  }

  // ---- MY SCORES ----
  async function loadMyScores() {
    const r = await fetch("/api/my-scores");
    if (!r.ok) {
      myScoresEl.innerHTML = "<p class='hint'>Login to see your scores.</p>";
      return;
    }

    const data = await r.json();
    myScoresEl.innerHTML = "";

    data.scores.forEach((s, i) => {
      const p = document.createElement("p");
      const d = new Date(s.createdAt).toLocaleString();
      p.textContent = `${i + 1}. Score: ${s.score} — ${d}`;
      myScoresEl.appendChild(p);
    });
  }

  // ---- INIT ----
  checkAuth();
  loadPuzzle();
  loadLeaderboard();
  loadMyScores();

});
