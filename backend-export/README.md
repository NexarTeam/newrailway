# NexarOS Backend

Standalone backend API for the NexarOS gaming console operating system.

## Structure

```
backend-export/
├── server/
│   ├── index.ts          # Entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Storage interface
│   ├── stripeClient.ts   # Stripe integration
│   ├── middleware/
│   │   └── auth.ts       # JWT authentication
│   ├── utils/
│   │   ├── fileDb.ts     # File-based database
│   │   └── email.ts      # Email via Resend
│   └── data/             # JSON data files
├── shared/
│   ├── config.json       # System configuration
│   └── schema.ts         # Data schemas
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure your environment variables in `.env`

4. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Friends
- `GET /api/friends` - Get friends list
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/requests` - Get pending requests
- `POST /api/friends/accept` - Accept friend request

### Messages
- `GET /api/messages/:friendId` - Get conversation
- `POST /api/messages` - Send message

### Wallet
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/create-checkout` - Create Stripe checkout

### Developer Portal
- `GET /api/developer/status` - Get developer status
- `POST /api/developer/apply` - Apply as developer
- `GET /api/developer/games` - Get developer's games
- `POST /api/developer/game/create` - Create new game

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port (default: 5000) | No |
| SESSION_SECRET | JWT signing secret | Yes |
| RESEND_API_KEY | Resend API key for emails | Yes |
| STRIPE_SECRET_KEY | Stripe secret key | Optional |

## Notes

- This backend uses file-based JSON storage (no database required)
- Data is stored in `server/data/` directory
- Avatar uploads are stored in `server/uploads/avatars/`
