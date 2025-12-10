# 🍌 Banana Quest Game

A fun banana-collecting game with Express backend and MongoDB integration for score tracking.

## 🎮 Features

- Interactive banana collecting game
- Real-time score tracking
- MongoDB integration for persistent leaderboard
- Express.js backend with API endpoints
- Modern UI with instant feedback

## 🚀 Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/YourUsername/BananaQuestGame.git
cd BananaQuestGame
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the project root:
```env
MONGO_URI=your_mongodb_connection_string
PORT=4000
```

4. **Start the server**
```bash
# Development mode with auto-reload
npm run dev

# OR Production mode
npm start
```

5. **Open the game**
Visit [http://localhost:4000](http://localhost:4000) in your browser

## 📝 API Endpoints

- `GET /api/leaderboard` - Get top scores
- `POST /api/save` - Save a new score

## 💻 Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Tools: nodemon, dotenv

## 🔧 Development

To run in development mode with auto-reload:
```bash
npm run dev
```

To test the API endpoints:
```bash
node testAPI.js
```

## 📦 Dependencies

- express: Web framework
- mongoose: MongoDB object modeling
- dotenv: Environment variables
- cors: Cross-origin resource sharing
- nodemon: Development auto-reload
