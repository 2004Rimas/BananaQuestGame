# BananaQuestGame

Simple banana-collecting game with an Express + MongoDB backend.

Getting started

1. Install dependencies:

```powershell
npm install
```

2. Create a `.env` file at the project root (a sample `.env` is already present). Add your MongoDB connection string:

```
MONGODB_URI=your_mongodb_connection_string_here
```

3. Run in development (requires `nodemon` which is listed as a devDependency):

```powershell
npm run dev
```

Or run normally:

```powershell
npm start
```

Notes

- If `MONGODB_URI` is not set, the server will run but API endpoints for scores will be disabled.
- The frontend is located in `public/` and served as static assets by Express.

Next steps (suggested)

- Harden input validation and add rate-limiting.
- Add tests for API endpoints.
- Deploy the app (Heroku, Railway, Vercel serverless functions + MongoDB Atlas, etc.).
