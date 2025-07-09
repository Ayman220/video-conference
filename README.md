# Real-Time Video Conferencing System

A full-stack video conferencing application built with React.js, Node.js, WebRTC, and Socket.IO.

## 🚀 Features

### Frontend Features
- **User Authentication**: JWT-based sign up/login with password reset
- **Real-Time Video Conferencing**: WebRTC video calls with audio muting and screen sharing
- **Meeting Scheduling**: Calendar-based interface with unique meeting links
- **Real-Time Chat**: Socket.IO powered chat within meetings
- **Responsive Design**: Mobile-friendly interface with notifications
- **User Profile Management**: Update username and avatar

### Backend Features
- **RESTful APIs**: Complete CRUD operations for users and meetings
- **WebRTC Signaling**: Handle video communication signaling
- **Socket.IO Server**: Real-time chat and notifications
- **PostgreSQL Database**: Store users, meetings, and analytics

### Admin Panel
- **User Management**: CRUD operations for users
- **Analytics Dashboard**: Meeting statistics and visualizations
- **Meeting Logs**: View and export meeting data

## 🛠 Tech Stack

- **Frontend**: React.js, Socket.IO Client, WebRTC
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Real-time**: WebRTC, Socket.IO
- **Deployment**: Heroku (Backend), Netlify (Frontend), ElephantSQL (Database)

## 📁 Project Structure

```
video-conferencing-system/
├── frontend/                 # React.js frontend application
├── backend/                  # Node.js backend API
├── admin-panel/             # React.js admin dashboard
├── shared/                  # Shared types and utilities
└── docs/                    # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd video-conferencing-system
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install

   # Install admin panel dependencies
   cd ../admin-panel
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend (.env)
   cp backend/.env.example backend/.env
   
   # Frontend (.env)
   cp frontend/.env.example frontend/.env
   
   # Admin Panel (.env)
   cp admin-panel/.env.example admin-panel/.env
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb video_conferencing_db
   
   # Run migrations
   cd backend
   npm run migrate
   ```

5. **Start development servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from frontend directory)
   npm start
   
   # Start admin panel (from admin-panel directory)
   npm start
   ```

## 🌐 Deployment

### Backend Deployment (Heroku)
1. Create Heroku app
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy with Git

### Frontend Deployment (Netlify)
1. Connect GitHub repository
2. Set build settings
3. Configure environment variables
4. Deploy

### Database (ElephantSQL)
1. Create ElephantSQL account
2. Create PostgreSQL database
3. Update connection strings

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### Meeting Endpoints
- `GET /api/meetings` - Get user meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting details
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### WebRTC Signaling
- `POST /api/signaling/offer` - Handle WebRTC offer
- `POST /api/signaling/answer` - Handle WebRTC answer
- `POST /api/signaling/ice-candidate` - Handle ICE candidates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@videoconferencing.com or create an issue in the repository. 