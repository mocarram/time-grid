# TimeGrid 🌍⏰

A beautiful world clock application for tracking time across different timezones with an intuitive interface.

## ✨ Features

- **Multiple Workspaces**: Organize timezones into different workspaces (Work, Travel, Family, etc.)
- **Drag & Drop**: Reorder timezones easily with smooth animations
- **Time Travel**: Set a specific time to see what time it would be across all zones
- **Smart Reference**: Set any timezone as your reference point
- **URL Sharing**: Share your workspace and time state via URL
- **User Authentication**: Sign in to sync your data across all devices
- **Cloud Sync**: Automatic synchronization with real-time status indicators
- **Offline First**: Works great offline, syncs when online
- **Shareable Links**: Generate URLs to share your setup with others
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Dark Mode**: Beautiful dark mode for night owls
- **Customizable**: Add any city or timezone you need

## 🔐 Authentication & Sync

TimeGrid includes authentication for persistent data storage:

- **Hybrid Storage**: Data stays in localStorage for speed, syncs to cloud for persistence
- **Cross-Device Sync**: Access your workspaces from any device
- **Real-time Status**: Visual indicators show sync status
- **Privacy First**: Your data is securely stored and only accessible to you
## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Add your Kinde auth configuration (optional - app works without auth)
3. Start the development server

## 🏗️ Tech Stack

- **Next.js** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Kinde Auth** - Authentication & user management
- **Shadcn UI** - Accessible component primitives
- **dnd-kit** - Drag and drop functionality
- **date-fns-tz** - Timezone handling
- **Lucide React** - Beautiful icons
- **Zod** - Schema validation
- **IoRedis** - Redis client for caching (optional)

## 📱 Usage

1. **Create Workspaces**: Organize your timezones by purpose
2. **Add Timezones**: Search and add cities from around the world
3. **Set Reference**: Choose your primary timezone
4. **Time Travel**: Use the time selector to plan across zones
5. **Sign In**: Authenticate to sync across devices
6. **Share**: Generate URLs to share your setup with others

## 🔄 Data Architecture

- **Primary**: localStorage for instant access
- **Secondary**: Cloud database for authenticated users
- **Sync Strategy**: Manual with conflict resolution
- **Offline Support**: Full functionality without internet

---

Built with ❤️ for global teams and travelers.