# Oasis Med - Frontend Interface

React + TypeScript + Vite frontend for Oasis Med medical platform.

## ⚙️ Environment Variables

Configure these in Vercel Project Settings > Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | AWS API Gateway URL | `https://your-api-id.execute-api.sa-east-1.amazonaws.com` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `sa-east-1_XXXXXXXXX` |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | `xxxxxxxxxxxxxxxxxxxx` |
| `VITE_COGNITO_REGION` | AWS Region | `sa-east-1` |

### Current Values (for reference)

## 🔗 Routes

After deployment, your app will be available at:

- **Login**: `https://www.oasismed.oasisagx.com/login`
- **Main**: `https://www.oasismed.oasisagx.com/main`
- **Other routes**: Same domain with corresponding paths

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── context/        # React contexts (Auth, Patient, etc.)
├── hooks/          # Custom React hooks
├── layouts/        # Page layouts
├── lib/            # API services and utilities
├── pages/          # Route pages
└── types/          # TypeScript types
```