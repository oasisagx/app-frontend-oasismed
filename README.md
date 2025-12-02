# Oasis Med - Frontend Interface

React + TypeScript + Vite frontend for Oasis Med medical platform.

## 🚀 Deployment to Vercel

### Prerequisites

1. GitHub account
2. Vercel account (connected to GitHub)
3. Backend API already deployed on AWS

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/eomed-interface.git

# Push to GitHub
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables (see below)
6. Click "Deploy"

### Step 3: Configure Custom Domain

1. In Vercel project settings, go to "Domains"
2. Add your custom domain: `oasismed.oasisagx.com`
3. Follow Vercel's instructions to configure DNS

## ⚙️ Environment Variables

Configure these in Vercel Project Settings > Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | AWS API Gateway URL | `https://your-api-id.execute-api.sa-east-1.amazonaws.com` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `sa-east-1_XXXXXXXXX` |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | `xxxxxxxxxxxxxxxxxxxx` |
| `VITE_COGNITO_REGION` | AWS Region | `sa-east-1` |

### Current Values (for reference)

```env
VITE_API_BASE_URL=https://vxfnw2ane5.execute-api.sa-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=sa-east-1_AQwN1JaVZ
VITE_COGNITO_CLIENT_ID=58vhdo6p4bnipujsk2p2pdqsq
VITE_COGNITO_REGION=sa-east-1
```

## 🔗 Routes

After deployment, your app will be available at:

- **Login**: `https://www.oasismed.oasisagx.com/login`
- **Main**: `https://www.oasismed.oasisagx.com/main`
- **Other routes**: Same domain with corresponding paths

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Create .env file with variables above
# (copy values from Environment Variables section)

# Start development server
npm run dev
```

The dev server runs at `http://localhost:5173` with API proxy configured.

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

## 🔧 Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```
