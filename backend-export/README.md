# NexarOS Backend

Standalone backend server for NexarOS gaming platform. This can be deployed to Railway, Render, Heroku, or any Node.js hosting platform.

## Requirements

- Node.js 18 or higher
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

3. Configure your environment variables (see Environment Variables section below)

4. Start the server:
```bash
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `BASE_URL` | Backend API URL | Yes |
| `FRONTEND_URL` | Frontend app URL (for CORS) | Yes |
| `SESSION_SECRET` | Secret key for JWT tokens | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret API key | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable API key | Yes |
| `RESEND_API_KEY` | Resend email API key | No |
| `FROM_EMAIL` | Email sender address | No |

## Deployment to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository or upload this folder
3. Add the environment variables in Railway's dashboard
4. Deploy

Railway will automatically:
- Detect the Node.js project
- Run `npm install`
- Start with `npm start`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `PATCH /api/auth/profile` - Update profile (requires auth)

### Games & Store
- `GET /api/games` - Get all games
- `GET /api/store` - Get store games
- `POST /api/store/purchase` - Purchase a game (requires auth)

### Subscriptions (Nexar+)
- `POST /api/subscription/create-checkout` - Create Stripe checkout session
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/webhooks/stripe` - Stripe webhook endpoint

### Social Features
- `GET /api/friends` - Get friends list
- `POST /api/friends/request` - Send friend request
- `GET /api/messages/:friendId` - Get messages
- `POST /api/messages/:friendId` - Send message

### Cloud Saves
- `GET /api/cloud` - Get cloud saves
- `POST /api/cloud` - Upload save
- `DELETE /api/cloud/:saveId` - Delete save

## Data Storage

This backend uses file-based JSON storage in the `data/` directory. For production, consider migrating to a proper database like PostgreSQL.

## File Structure

```
├── index.js              # Main entry point
├── routes.js             # All API routes
├── stripeClient.js       # Stripe client configuration
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── utils/
│   ├── fileDb.js         # JSON file database utilities
│   └── email.js          # Email sending with Resend
├── data/                 # JSON data storage
├── uploads/
│   └── avatars/          # Avatar image uploads
└── shared/
    └── config.json       # System configuration
```

## License

MIT
