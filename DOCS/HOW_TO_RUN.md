# How to Run Spy Mystery

This application is a full-stack web game built with React, Express, and Socket.IO. 

## Local Development

To run the game locally on your machine for development:

1.  **Clone the repository** (if applicable) or download the files.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`. It uses `tsx` to run the TypeScript server and Vite middleware to serve the frontend.

## Deployment on a VPS (Virtual Private Server)

To run this in a production environment like a VPS:

### 1. Build the Application
Before deploying, you need to compile the TypeScript code and the React frontend into production-ready chunks:
```bash
npm run build
```
This generates:
-   `dist/`: Static assets for the frontend.
-   `dist/server.cjs`: A bundled CommonJS version of your server.

### 2. Start for Production
Run the bundled server using Node.js:
```bash
npm run start
```
Note: You may want to use a process manager like **PM2** to keep the app running:
```bash
npm install -g pm2
pm2 start dist/server.cjs --name "spy-game"
```

### 3. Nginx / Reverse Proxy Configuration
Since the app runs on port 3000, you should use Nginx to point your domain to it.
Example Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cloud Run / Docker

If you want to deploy to Google Cloud Run or any Docker-based platform:

1.  **Build the Docker Image**:
    Use a `Dockerfile` that installs dependencies, builds the app, and runs `npm run start`.
2.  **Expose Port 3000**:
    Ensure your container listens on the port expected by the platform (usually provided via `$PORT` environment variable, but this app is hardcoded to 3000 for local/preview compatibility).

## Gameplay Features
-   **Multiplayer**: Join with a 6-digit code.
-   **Secret Roles**: Be a Secret Agent (know the location) or the Spy (trying to find out).
-   **Accusations**: Any player can trigger an "Emergency Meeting" to vote on a suspect.
-   **Spy Guessing**: The Spy can win instantly by clicking on the correct location in the "Potential Locations" list if they've figured it out.
-   **Real-time Updates**: Powered by Socket.IO for seamless synchronized gameplay.

## Technical Overview
-   **Frontend**: React + Tailwind CSS + Lucide Icons + Framer Motion.
-   **Backend**: Express.js + Socket.IO for real-time multiplayer.
-   **Database**: In-memory storage. 
-   **Styling**: High-contrast "Tactical Dark" theme with `motion` animations for a polished feel.
