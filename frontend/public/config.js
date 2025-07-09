// Configuration for ngrok HTTPS access
// Replace these URLs with your actual ngrok URLs from http://localhost:4040
window.APP_CONFIG = {
  // Backend API URL (backend tunnel URL + /api)
  API_URL: 'http:/localhost:5000/api',
  // Socket URL (backend tunnel URL without /api)
  SOCKET_URL: 'http:/localhost:5000'
};

// Instructions:
// 1. Go to http://localhost:4040 to see your ngrok tunnels
// 2. Copy the backend tunnel URL (something like https://abc123.ngrok-free.app)
// 3. Replace YOUR_BACKEND_NGROK_URL with that URL
// 4. The frontend will be accessible at the frontend tunnel URL 