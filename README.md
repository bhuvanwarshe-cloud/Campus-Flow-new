# 🏫 CampusFlow

Campus Flow is a comprehensive campus management platform designed to streamline administrative tasks, enhance communication between students and teachers, and provide real-time insights into academic performance.

## 🚀 Features

- **Role-Based Access Control**: Secure login for Admin, Teacher, and Student roles.
- **Real-time Updates**: Instant notifications for marks, attendance, and announcements using Supabase Realtime.
- **Academic Management**: 
  - Class scheduling and enrollment management.
  - Marks entry and performance tracking.
  - Attendance recording and reporting.
- **Communication**: Announcement system and file sharing for course materials.
- **Performance**: Pagination for large datasets and optimized database queries.
- **Security**: Rate limiting, Helmet security headers, and secure authentication.

## 🏗 Architecture

For a detailed overview of the system architecture, database schema, and data flow, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠 Tech Stack

### Frontend
- **React** (Vite)
- **TypeScript**
- **Tailwind CSS** & **Shadcn UI**
- **Recharts** for data visualization
- **Lucide React** for icons
- **Supabase Client** for auth & realtime

### Backend
- **Node.js** & **Express**
- **Supabase** (PostgreSQL) for database & auth
- **Helmet** & **Rate Limit** for security
- **Winston** & **Morgan** for logging
- **Multer** for file handling
- **Jest** & **Supertest** for testing

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase project (URL & Keys)

### Environment Setup

1. **Backend**: Create `Backend/.env`
   ```env
   PORT=5000
   NODE_ENV=development
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:3000
   ```

2. **Frontend**: Create `Frontend/.env`
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:5000
   ```

### Installation

```bash
# Install Backend Dependencies
cd Backend
npm install

# Install Frontend Dependencies
cd ../Frontend
npm install
```

### Running the Application

**Backend:**
```bash
cd Backend
npm start    # Production
npm run dev  # Development
```

**Frontend:**
```bash
cd Frontend
npm run dev
```

## 🧪 Testing

Run backend API tests:
```bash
cd Backend
npm test
```

## 📦 Deployment

The backend includes `ecosystem.config.js` for PM2 deployment.
```bash
pm2 start ecosystem.config.js
```

## 📄 License
MIT
