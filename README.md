# Chat App - Deployment Guide

## Prerequisites
1. GitHub account
2. Vercel account (sign up at vercel.com)
3. MongoDB Atlas account for database

## Step-by-Step Deployment Process

### 1. Prepare Environment Variables
Create these environment variables in Vercel dashboard:

**Server Environment Variables:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret key
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- `NODE_ENV` - Set to "production"

### 2. Update Client Environment
Update `client/.env.production` with your Vercel app URL:
```
VITE_BACKEND_URL=https://your-app-name.vercel.app
```

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI (Automatic)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel login`
3. Run: `vercel --prod`
4. Follow the prompts

#### Option B: Using GitHub (Recommended)
1. Push your code to GitHub repository
2. Go to vercel.com and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables in Vercel dashboard
6. Deploy

### 4. Configure Domain (Optional)
- Add custom domain in Vercel dashboard
- Update `VITE_BACKEND_URL` with your custom domain

## Important Notes
- Socket.IO will work automatically with Vercel's serverless functions
- Make sure all environment variables are set correctly
- The app will be available at your Vercel URL

## Troubleshooting
- Check Vercel function logs for server errors
- Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Verify all environment variables are set correctly