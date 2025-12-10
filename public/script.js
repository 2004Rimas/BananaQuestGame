document.addEventListener("DOMContentLoaded", () => {
  const playerNameInput = document.getElementById("playerName");
  const submitBtn = document.getElementById("submitScore");
  const status = document.getElementById("status");
  const leaderboardDiv = document.getElementById("leaderboard");
  const userArea = document.getElementById("userArea");
  let currentUser = null;

  // Check login status
  async function checkAuth() {
    const res = await fetch("/auth/status");
    const json = await res.json();
    if (json.loggedIn) {
      currentUser = json.username;
      userArea.innerHTML = `Welcome, <strong>${currentUser}</strong> | <a id="logoutBtn" href="#">Logout</a>`;
      document.getElementById("logoutBtn").addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/logout");
        window.location.reload();
      });
    } else {
      currentUser = null;
      userArea.innerHTML = `<a href="/login.html">Login</a> | <a href="/signup.html">Sign up</a>`;
    }
  }

  // Load leaderboard
  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const data = await res.json();
      leaderboardDiv.innerHTML = data.length
        ? data
            .map((p, i) => `<p>${i + 1}. <strong>${p.name}</strong> — ${p.score} pts</p>`)
            .join("")
        : "<p>No scores yet. Be the first!</p>";
    } catch (err) {
      console.error(err);
      leaderboardDiv.innerHTML = "<p>Failed to load leaderboard</p>";
    }
  }

  // Save score
  async function saveScore(player, score) {
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, score }),
      });

      if (res.status === 401) {
        status.textContent = "You must log in to save your score.";
        setTimeout(() => (window.location.href = "/login.html"), 1200);
        return;
      }

      const json = await res.json();
      if (res.ok && json.success) {
        status.textContent = "✅ Score saved!";
        await loadLeaderboard();
      } else {
        status.textContent = "❌ Failed to save score: " + (json.message || "Unknown error");
      }
    } catch (err) {
      console.error("Save error:", err);
      status.textContent = "Network error when saving score";
    }
  }

  // Simulate a random score for testing (you can connect it to the puzzle later)
  submitBtn.addEventListener("click", async () => {
    let player = playerNameInput.value.trim() || currentUser;
    if (!player) {
      status.textContent = "Enter your name or log in first.";
      return;
    }
    const score = Math.floor(Math.random() * 100) + 1; // Random score
    status.textContent = `Saving score ${score}...`;
    await saveScore(player, score);
  });

  // Initialize
  checkAuth();
  loadLeaderboard();
});

// ===== Simple Banana Puzzle System =====
const puzzles = [
  { q: "3 bananas + 2 bananas = ?", a: "5" },
  { q: "🍌🍌🍌 - 🍌 = ?", a: "2" },
  { q: "2 + 3 * 2 = ?", a: "8" },
  { q: "Banana has 6 letters. Half of it?", a: "3" },
  { q: "10 bananas / 5 = ?", a: "2" },
];

let currentPuzzle = {};
let score = 0;

function loadNewPuzzle() {
  currentPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  document.getElementById("questionText").textContent = currentPuzzle.q;
  document.getElementById("answerInput").value = "";
  document.getElementById("gameMessage").textContent = "";
}

document.getElementById("checkAnswer").addEventListener("click", () => {
  const userAns = document.getElementById("answerInput").value.trim();
  if (!userAns) return;

  if (userAns === currentPuzzle.a) {
    score += 10; // reward for correct answer
    document.getElementById("gameMessage").textContent = `✅ Correct! Your score: ${score}`;
    document.getElementById("gameMessage").style.color = "green";
  } else {
    document.getElementById("gameMessage").textContent = `❌ Wrong! Try again.`;
    document.getElementById("gameMessage").style.color = "red";
    score = Math.max(0, score - 2);
  }

  // Update backend only if correct
  if (userAns === currentPuzzle.a) {
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) console.log("Score saved:", data.score);
      })
      .catch(err => console.error("Save error:", err));
  }

  setTimeout(loadNewPuzzle, 1500);
});

// Load first puzzle when page loads
loadNewPuzzle();
