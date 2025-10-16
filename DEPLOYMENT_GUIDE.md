# Chat App Deployment Guide

## Required Environment Variables for Vercel

Add these in your Vercel dashboard (Settings > Environment Variables):

### Server Environment Variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=production
```

## Deployment Commands:

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy to production:**
   ```bash
   vercel --prod
   ```

3. **After deployment, update client/.env.production with your actual Vercel URL:**
   ```
   VITE_BACKEND_URL=https://your-actual-vercel-url.vercel.app
   ```

4. **Redeploy after updating the URL:**
   ```bash
   vercel --prod
   ```

## MongoDB Atlas Setup:
1. Go to MongoDB Atlas
2. Network Access > Add IP Address > Allow access from anywhere (0.0.0.0/0)
3. Database Access > Create database user with read/write permissions

## Cloudinary Setup:
1. Sign up at cloudinary.com
2. Get your cloud name, API key, and API secret from dashboard
3. Add them to Vercel environment variables

## Troubleshooting:
- If deployment fails, check Vercel function logs
- Ensure all environment variables are set correctly
- Make sure MongoDB allows connections from anywhere
- Socket.IO should work automatically with Vercel serverless functions