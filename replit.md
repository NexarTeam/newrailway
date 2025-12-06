# NexarOS - Gaming Console Operating System

## Overview

NexarOS is a futuristic gaming console operating system built as a web-based prototype that mimics Xbox/PlayStation UI systems. The application features a dark theme with signature red accent colors (#d00024) and provides a complete gaming launcher experience including game library management, store integration, download management, user accounts, social features, and cloud saves.

The system is designed to eventually be wrapped in Electron for desktop deployment, but currently runs as a full-stack web application in development environments like Replit.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, built using Vite as the build tool

**UI Component System**:
- Shadcn/ui component library with Radix UI primitives for accessibility
- Tailwind CSS for styling with custom design tokens
- Framer Motion for animations and transitions
- Custom "Nexar" branded components in `client/src/components/nexar/`

**State Management**:
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state (`AuthProvider`)
- Local component state with React hooks
- JWT tokens stored in localStorage for session persistence

**Routing**: 
- Wouter for lightweight client-side routing
- Page-based navigation controlled by sidebar component
- Authentication guards for protected routes

**Design System**:
- Dark mode by default (#000000, #111111 backgrounds)
- Red accent color (#d00024) for brand consistency
- Console-like interface with smooth animations
- Controller-friendly navigation patterns
- Responsive layouts with mobile considerations

**Key Pages**:
- Home (featured carousel, continue playing, quick actions)
- Library (game management with filters and sorting)
- Store (browse and download games)
- Downloads (active download management)
- Settings (system configuration)
- Profile, Friends, Messages, Achievements (social features)
- Cloud Saves (save file management)

### Backend Architecture

**Framework**: Express.js running on Node.js

**API Design**: RESTful endpoints under `/api/*` namespace

**Authentication**:
- JWT-based authentication with 7-day token expiry
- bcryptjs for password hashing
- Auth middleware for protected routes
- Manual implementation (no Passport or session middleware in active use)

**Data Storage**: 
- File-based JSON storage in `server/data/` directory
- Utility functions in `server/utils/fileDb.ts` for CRUD operations
- No database server required in current implementation
- Designed for easy migration to PostgreSQL with Drizzle ORM (schema defined but not actively used)

**Data Models**:
- Users (id, email, username, passwordHash, avatarUrl, bio, createdAt)
- Friends (friend requests and relationships)
- Messages (direct messaging between users)
- Achievements (user achievement tracking)
- Cloud Saves (game save file storage)

**API Endpoints**:
- `/api/auth/register` - User registration
- `/api/auth/login` - User authentication
- `/api/auth/me` - Get current user
- `/api/auth/profile` - Update user profile
- `/api/friends/*` - Friend management
- `/api/messages/*` - Messaging system
- `/api/achievements` - Achievement tracking
- `/api/cloud` - Cloud save management

**Server Architecture**:
- Development mode uses Vite middleware for HMR
- Production mode serves static built files from `dist/public`
- Separate build process bundles server code with esbuild
- HTTP server wraps Express for potential WebSocket upgrades

### External Dependencies

**Database & ORM**:
- Drizzle ORM configured for PostgreSQL (schema defined in `shared/schema.ts`)
- Database not actively used; prepared for future migration from JSON files
- Connection string expected via `DATABASE_URL` environment variable

**Authentication**:
- jsonwebtoken - JWT token generation and verification
- bcryptjs - Password hashing
- Custom middleware implementation

**UI Libraries**:
- Radix UI - Headless UI primitives (dialogs, dropdowns, popovers, etc.)
- Framer Motion - Animation library
- Lucide React - Icon system
- Tailwind CSS - Utility-first CSS framework
- shadcn/ui - Pre-built component patterns

**Development Tools**:
- Vite - Frontend build tool and dev server
- esbuild - Server bundling for production
- TypeScript - Type safety across the stack
- tsx - TypeScript execution for development

**Third-Party Services**:
- None currently integrated
- Mock update checker (ready for real OTA update system)

**File Upload**:
- Avatar URL support (external hosting expected)

**Session Management**:
- JWT tokens with 7-day expiration
- Token stored client-side in localStorage
- Authorization header: `Bearer <token>`

**Environment Variables**:
- `DATABASE_URL` - PostgreSQL connection (prepared but not required)
- `SESSION_SECRET` - JWT signing secret (defaults to "nexaros-secret-key-2024")
- `NODE_ENV` - Environment flag (development/production)