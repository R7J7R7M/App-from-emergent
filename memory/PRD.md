# Piggie Points - Product Requirements Document

## Overview
Piggie Points is a cute, pinkish motivation & rewards app designed to encourage daily healthy habits through gamified task completion, point collection, and a spin-wheel reward system.

## Core Features

### 1. Daily Tasks System
- **4 Default Tasks** (always present):
  - 20 Min Walk (1 pt, timer-based)
  - 1 Hour Gym (3 pts, timer-based)
  - Wake Before 6 AM (5 pts, time-check)
  - Zero Sugar Day (1 pt, manual)
- **Custom Tasks**: Add new tasks with configurable points, type (manual/timer/wake_check), and duration
- **Timer Mode**: Built-in countdown timer for walk & gym tasks with completion validation
- **Wake-up Check**: Verifies time for wake-up tasks

### 2. Piggie Points Currency
- Points earned per task completion
- **4-Day Streak Bonus**: Points doubled when 4+ consecutive active days
- Running total displayed on home dashboard

### 3. Spin Wheel Rewards
- Spin wheel game to redeem rewards using accumulated points
- 8 default rewards (Hug, Snack, Movie Night, Gift, Spa Day, Shopping, Dream Date, Weekend Getaway)
- Custom rewards can be added with emoji, description, and point cost
- Points deducted when reward is won

### 4. Goals (Short-term & Long-term)
- Create goals with target point thresholds
- Progress bars showing completion
- Separate sections for short-term and long-term goals

### 5. Monitor Mode (Boyfriend View)
- PIN-protected access (default: 1234)
- Dashboard showing: user stats, today's completions, recent activity, rewards redeemed
- Accessible from login screen or settings

### 6. Personal Photo Backgrounds
- Upload personal photos (base64 storage)
- Photo gallery management in settings
- Delete photos via thumbnail tap

### 7. Customization
- Add custom tasks, rewards, and photos via Settings
- Configurable task types and point values

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React Native Expo (SDK 54) with Expo Router
- **Storage**: MongoDB for all data persistence
- **Auth**: Simple name + PIN authentication

## API Endpoints
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/today/{user_id}` - Today's tasks with completion status
- `POST /api/tasks/complete/{user_id}` - Complete a task
- `POST /api/tasks` - Create custom task
- `GET /api/rewards` - Get rewards catalog
- `POST /api/rewards/spin/{user_id}` - Spin the wheel
- `GET/POST /api/goals/{user_id}` - CRUD goals
- `GET/POST /api/photos` - Photo management
- `POST /api/monitor/login` - Monitor PIN auth
- `GET /api/monitor/dashboard` - Monitor stats

## Future Enhancements
- Push notifications for task reminders
- Couple leaderboard / shared progress view
- Achievement badges for milestones
- Weekly/monthly statistics charts
- Custom background photo rotation on home screen
