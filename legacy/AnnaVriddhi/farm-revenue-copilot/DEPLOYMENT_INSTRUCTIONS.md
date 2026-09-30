# AnnaVriddhi Deployment Instructions

## Firebase Setup Complete ✅

Your app now has Firebase Authentication integrated with Google and Facebook sign-in options!

## What Was Added

### 1. Firebase SDK Integration
- Installed `firebase` package
- Created `src/lib/firebase.ts` with Firebase configuration
- Integrated Firebase Auth with Google and Facebook providers

### 2. Authentication Features
- ✅ Email/Password sign-in (via Supabase)
- ✅ Google Sign-In (via Firebase)
- ✅ Facebook Sign-In (via Firebase)
- ✅ Automatic sync between Firebase and Supabase
- ✅ Unified authentication context

### 3. UI Updates
- Added Google and Facebook sign-in buttons on the Auth screen
- Social login buttons with brand styling

### 4. Firebase Hosting Setup
- Created `.firebaserc` with project configuration
- Created `firebase.json` with hosting rules
- Added deployment scripts to `package.json`

## Before You Deploy

### 1. Enable Firebase Authentication Providers

Go to [Firebase Console](https://console.firebase.google.com/project/annavriddhi-a5d62/authentication/providers):

1. **Email/Password**: Enable it
2. **Google**: Enable and configure OAuth consent screen
3. **Facebook**: Enable and add App ID and App Secret from Facebook Developers

### 2. Add Authorized Domains

In Firebase Console > Authentication > Settings > Authorized domains, add:
- `localhost` (for development)
- Your production domain (e.g., `annavriddhi.web.app`)

### 3. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 4. Login to Firebase

```bash
firebase login
```

## Deploy to Firebase

### Option 1: Automated Deployment

```bash
cd frontend
npm run deploy
```

This will:
1. Build the production bundle
2. Deploy to Firebase Hosting at `annavriddhi.web.app`

### Option 2: Manual Steps

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting:annavriddhi
```

### Option 3: Preview Channel (for testing)

```bash
npm run deploy:preview
```

This creates a temporary preview URL for testing before going live.

## Post-Deployment

### 1. Test Authentication

Visit your deployed site and test:
- Email/Password sign-in
- Google sign-in
- Facebook sign-in

### 2. Configure Facebook App

If Facebook login doesn't work:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Add your Firebase Auth domain to Valid OAuth Redirect URIs:
   ```
   https://annavriddhi-a5d62.firebaseapp.com/__/auth/handler
   ```

### 3. Update Environment Variables

Make sure your production `.env` has:
```env
VITE_API_BASE_URL=https://your-production-backend.com/api
VITE_USE_MOCKS=false
```

## URLs After Deployment

- **Production Site**: https://annavriddhi.web.app
- **Alternate URL**: https://annavriddhi.firebaseapp.com
- **Firebase Console**: https://console.firebase.google.com/project/annavriddhi-a5d62

## Troubleshooting

### Build Errors
```bash
npm install
npm run build
```

### Firebase CLI Not Found
```bash
npm install -g firebase-tools
firebase --version
```

### Authentication Not Working
1. Check Firebase Console > Authentication > Sign-in methods
2. Verify authorized domains include your deployment URL
3. Check browser console for specific error messages

### Need Help?
- [Firebase Docs](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)

## Next Steps

1. **Custom Domain**: Add a custom domain in Firebase Console > Hosting
2. **Analytics**: View user analytics in Firebase Console > Analytics
3. **Performance**: Monitor performance in Firebase Console > Performance
4. **CI/CD**: Set up GitHub Actions for automatic deployment

---

**Note**: The current setup keeps Supabase for database operations and uses Firebase only for authentication and hosting. This hybrid approach gives you the best of both platforms!
