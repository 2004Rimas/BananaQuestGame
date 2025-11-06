// Get DOM elements
const questionText = document.getElementById("questionText");
const result = document.getElementById("result");
const startBtn = document.getElementById("startBtn");
const submitAnswer = document.getElementById("submitAnswer");
const playerName = document.getElementById("playerName");
const leaderboard = document.getElementById("leaderboard");
const bananaQuestion = document.getElementById("bananaQuestion");

// API configuration
const API_BASE_URL = 'http://localhost:4000';

// Debug logging helper
const debug = (message, data) => {
  console.log(`🍌 ${message}`, data || '');
};

let currentAnswer = "";
let score = 0;

// Start Game
startBtn.addEventListener("click", async () => {
  const name = playerName.value.trim();
  if (!name) return alert("Enter your name first!");

  bananaQuestion.classList.remove("hidden");
  startBtn.disabled = true;

  fetchQuestion();
});

// Fetch Banana API question
async function fetchQuestion() {
  const response = await fetch("https://marcconrad.com/uob/banana/api.php");
  const data = await response.json();
  questionText.innerHTML = `<img src="${data.question}" alt="Puzzle">`;
  currentAnswer = data.solution.toString();
}

// Submit answer
submitAnswer.addEventListener("click", async () => {
  const userAnswer = document.getElementById("answerInput").value;
  if (userAnswer === currentAnswer) {
    score += 10;
    result.textContent = `✅ Correct! Your score: ${score}`;
    await fetchQuestion();
  } else {
    result.textContent = `❌ Wrong! The answer was ${currentAnswer}`;
  }

  document.getElementById("answerInput").value = "";
  saveScore();
});

// Save player score to backend
async function saveScore() {
  if (score === 0) {
    displayMessage('Cannot save score: no points earned', 'error');
    return;
  }
  
  const name = playerName.value.trim();
  try {
    debug('Saving score:', { player: name, score });
    const response = await fetch(`${API_BASE_URL}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: name, score })
    });
    
    const data = await response.json();
    debug('Save response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save score');
    }
    
    displayMessage(`✅ Score saved! Your score: ${score}`, 'success');
    result.textContent += ' (Score saved! 💾)';
    await updateLeaderboard();
  } catch (error) {
    console.error('Error saving score:', error);
    displayMessage(`❌ Failed to save score: ${error.message}`, 'error');
    result.textContent += ' (Failed to save score)';
  }
}

// Fetch leaderboard
async function updateLeaderboard() {
  try {
    debug('Fetching leaderboard...');
    leaderboard.classList.add('refreshing');
    
    const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
    const players = await response.json();
    
    debug('Leaderboard data:', players);
    
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }
    
    if (!players || !players.length) {
      leaderboard.innerHTML = '<li class="no-scores">No scores yet. Be the first to play! 🎮</li>';
      return;
    }
    
    const currentScores = new Set([...leaderboard.querySelectorAll('li')].map(li => li.dataset.key));
    
    const newHTML = players
      .map((p, index) => `
        <li ${index < 3 ? 'class="top-3"' : ''} data-key="${p.name}-${p.score}">
          ${index + 1}. ${p.name}: ${p.score} points
          ${index === 0 ? ' 👑' : ''}
          ${index === 1 ? ' 🥈' : ''}
          ${index === 2 ? ' 🥉' : ''}
        </li>`)
      .join("");
    
    leaderboard.innerHTML = newHTML;
    
    // Highlight new scores
    leaderboard.querySelectorAll('li').forEach(li => {
      if (!currentScores.has(li.dataset.key)) {
        li.classList.add('new-score');
        setTimeout(() => li.classList.remove('new-score'), 2000);
      }
    });
    
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    leaderboard.innerHTML = '<li class="error">Failed to load leaderboard</li>';
  } finally {
    // Remove loading class
    leaderboard.classList.remove('refreshing');
  }
}

// Function to display messages
function displayMessage(msg, type = 'info') {
  let msgBox = document.getElementById('messageBox');
  if (!msgBox) {
    msgBox = document.createElement('div');
    msgBox.id = 'messageBox';
    msgBox.style.position = 'fixed';
    msgBox.style.top = '10px';
    msgBox.style.right = '10px';
    msgBox.style.padding = '10px 20px';
    msgBox.style.borderRadius = '5px';
    msgBox.style.fontWeight = 'bold';
    msgBox.style.zIndex = 1000;
    document.body.appendChild(msgBox);
  }

  msgBox.textContent = msg;
  msgBox.style.backgroundColor =
    type === 'success' ? '#4caf50' :
    type === 'error' ? '#f44336' : '#2196f3';
  msgBox.style.color = '#fff';
  msgBox.style.opacity = '1';

  // Fade out after 3 seconds
  setTimeout(() => {
    msgBox.style.transition = 'opacity 1s';
    msgBox.style.opacity = '0';
  }, 3000);
}

// Auto-refresh leaderboard every 10 seconds
let leaderboardInterval;

function startLeaderboardRefresh() {
  // Initial load
  updateLeaderboard();
  
  // Set up auto-refresh
  leaderboardInterval = setInterval(async () => {
    if (document.visibilityState === 'visible') {
      await updateLeaderboard();
    }
  }, 10000); // Refresh every 10 seconds
}

// Stop refresh when tab is closed
window.addEventListener('beforeunload', () => {
  if (leaderboardInterval) {
    clearInterval(leaderboardInterval);
  }
});

// Start initial refresh
startLeaderboardRefresh();
