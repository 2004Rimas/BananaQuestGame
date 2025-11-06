// testAPI.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_RETRIES = 3;

// Add debug logging
const debug = (...args) => console.log('🔍', ...args);
const RETRY_DELAY = 2000; // 2 seconds

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryFetch(url, options = {}, retries = MAX_RETRIES) {
  try {
    // Add CORS headers
    options.headers = {
      ...options.headers,
      'Accept': 'application/json',
      'Origin': 'http://localhost:4000'
    };
    
    debug('Fetch attempt:', { url, options });
    const response = await fetch(url, options);
    debug('Response status:', response.status);
    
    const data = await response.json().catch(e => {
      debug('JSON parse error:', e);
      return null;
    });
    debug('Response data:', data);
    
    if (!response.ok) throw new Error(data?.message || `API request failed with status ${response.status}`);
    return data;
  } catch (err) {
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`);
      await delay(RETRY_DELAY);
      return retryFetch(url, options, retries - 1);
    }
    throw err;
  }
}

async function testSaveScore() {
  console.log('\n🎮 Testing Score Saving...');
  try {
    const testScore = Math.floor(Math.random() * 100);
    const playerName = `TestPlayer_${new Date().toISOString().slice(11,19)}`;
    
    debug('Sending score:', { player: playerName, score: testScore });
    debug('URL:', `${BASE_URL}/api/save`);
    
    const data = await retryFetch(`${BASE_URL}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: playerName, score: testScore })
    });
    
    console.log('✅ Score Saved Successfully:', {
      response: data,
      scoreSent: testScore
    });
    return true;
  } catch (err) {
    console.error('❌ Error Saving Score:', err.message);
    debug('Full error:', err);
    return false;
  }
}

async function testLeaderboard() {
  console.log('\n🏆 Testing Leaderboard...');
  try {
    const data = await retryFetch(`${BASE_URL}/api/leaderboard`);
    console.log('✅ Leaderboard Fetched Successfully:');
    console.table(data);
    return true;
  } catch (err) {
    console.error('❌ Error Fetching Leaderboard:', err.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log('📡 Testing connection to:', BASE_URL);
  
  let allPassed = true;
  
  // Test save score
  if (await testSaveScore()) {
    console.log('✅ Save Score Test: PASSED');
  } else {
    console.log('❌ Save Score Test: FAILED');
    allPassed = false;
  }
  
  // Test leaderboard
  if (await testLeaderboard()) {
    console.log('✅ Leaderboard Test: PASSED');
  } else {
    console.log('❌ Leaderboard Test: FAILED');
    allPassed = false;
  }
  
  console.log('\n=== Test Summary ===');
  if (allPassed) {
    console.log('🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);