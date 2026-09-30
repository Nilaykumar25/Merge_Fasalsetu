# Firebase Deployment Guide

This document explains how to deploy AnnaVriddhi to Firebase Hosting.

## Prerequisites

1. **Firebase CLI installed globally**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created**: `annavriddhi-a5d62`

3. **Logged into Firebase**
   ```bash
   firebase login
   ```

## Deployment Steps

### 1. Build the Production Bundle

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

### 2. Test Locally (Optional)

```bash
firebase serve
```

Visit `http://localhost:5000` to test the production build locally.

### 3. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting:annavriddhi
```

Or use the shorthand:

```bash
npm run deploy
```

### 4. Access Your Site

After deployment, your site will be available at:
- **Primary URL**: https://annavriddhi.web.app
- **Alternate URL**: https://annavriddhi.firebaseapp.com

## Configuration Files

- **`.firebaserc`**: Contains Firebase project configuration
- **`firebase.json`**: Defines hosting configuration including:
  - Public directory (`dist`)
  - Rewrites for SPA routing
  - Cache headers for static assets

## Firebase Features Enabled

### Authentication
- ✅ Email/Password authentication
- ✅ Google Sign-In
- ✅ Facebook Sign-In
- ✅ Integrated with Supabase for farmer profile storage

### Analytics
- ✅ Google Analytics enabled (ID: G-EM935DCMTP)

### Hosting
- ✅ Fast CDN delivery
- ✅ Automatic SSL
- ✅ Custom domain support (can be configured)

## Environment Variables

Make sure your `.env` file has the correct production values:

```env
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_USE_MOCKS=false
VITE_SUPABASE_URL=https://qsbjnjxemnnvvfmvjxzs.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npm run build`
- Ensure all dependencies are installed: `npm install`

### Authentication Not Working
1. Check Firebase console > Authentication > Sign-in methods
2. Enable Email/Password, Google, and Facebook providers
3. Add authorized domains in Firebase console

### 404 Errors on Page Refresh
- This is handled by the `rewrites` configuration in `firebase.json`
- All routes redirect to `index.html` for client-side routing

## Continuous Deployment

You can set up GitHub Actions for automatic deployment:

1. Generate a Firebase token:
   ```bash
   firebase login:ci
   ```

2. Add the token to GitHub Secrets as `FIREBASE_TOKEN`

3. Create `.github/workflows/deploy.yml` for auto-deployment

## Support

For issues, check:
- [Firebase Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Console](https://console.firebase.google.com/project/annavriddhi-a5d62)
