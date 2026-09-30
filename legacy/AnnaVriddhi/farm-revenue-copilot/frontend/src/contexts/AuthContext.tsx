import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type Farmer, type UserSettings } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { 
  auth as firebaseAuth, 
  googleProvider 
} from '../lib/firebase';
import {
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { isDemoAccount, getDemoFarmer, DEMO_EMAIL, DEMO_PASSWORD } from '../services/demoDataService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  farmer: Farmer | null;
  userSettings: UserSettings | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, farmerData: Partial<Farmer>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  authProvider: 'supabase' | 'firebase' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<'supabase' | 'firebase' | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    let supabaseUnsubscribe: (() => void) | undefined;
    let firebaseUnsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        // Try Supabase first
        console.log('AuthProvider: Getting session from Supabase...');
        const { data } = await supabase.auth.getSession();
        console.log('AuthProvider: Session received:', { hasSession: !!data.session, hasUser: !!data.session?.user });
        
        if (data.session?.user) {
          setAuthProvider('supabase');
          setSession(data.session);
          setUser(data.session.user);
          console.log('AuthProvider: Loading farmer data for Supabase user:', data.session.user.id);
          await loadFarmerData(data.session.user.id, data.session.user.email);
        }
      } catch (err) {
        console.error('AuthProvider: Error initializing Supabase auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Supabase auth state changed:', event, { hasSession: !!session });
      if (session?.user) {
        setAuthProvider('supabase');
        setSession(session);
        setUser(session.user);
        await loadFarmerData(session.user.id, session.user.email);
      } else if (authProvider === 'supabase' && localStorage.getItem('is_demo_account') !== 'true') {
        // Only clear state for real Supabase users, not demo accounts
        setSession(null);
        setUser(null);
        setFarmer(null);
        setUserSettings(null);
        setAuthProvider(null);
        localStorage.removeItem('farmer_id');
        localStorage.removeItem('is_demo_account');
      }
    });
    supabaseUnsubscribe = () => authListener?.subscription.unsubscribe();

    // Listen for Firebase auth changes
    firebaseUnsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      console.log('AuthProvider: Firebase auth state changed:', { hasUser: !!firebaseUser, email: firebaseUser?.email });
      if (firebaseUser && authProvider !== 'supabase') {
        setAuthProvider('firebase');
        // Create a minimal User object compatible with Supabase User type
        const supabaseCompatibleUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          app_metadata: {},
          user_metadata: {
            name: firebaseUser.displayName,
            avatar_url: firebaseUser.photoURL,
          },
          aud: 'authenticated',
          created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
        } as User;
        
        setUser(supabaseCompatibleUser);
        // Sync with Supabase and create/load farmer profile
        await syncFirebaseUserToSupabase(firebaseUser);
      } else if (!firebaseUser && authProvider === 'firebase') {
        setUser(null);
        setFarmer(null);
        setUserSettings(null);
        setAuthProvider(null);
        localStorage.removeItem('farmer_id');
      }
    });

    return () => {
      supabaseUnsubscribe?.();
      firebaseUnsubscribe?.();
    };
  }, [authProvider]);

  const syncFirebaseUserToSupabase = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('Syncing Firebase user to Supabase:', firebaseUser.uid);
      
      // Set loading to show we're syncing
      setLoading(true);
      
      // Firebase UIDs are strings, but Supabase auth_user_id expects UUID
      // We need to check if farmer exists by Firebase UID
      const { data: existingFarmer, error: fetchError} = await supabase
        .from('farmers')
        .select('*')
        .eq('auth_user_id', firebaseUser.uid)
        .maybeSingle();  // Use maybeSingle() to avoid error if no match

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching farmer:', fetchError);
        throw new Error(`Database query failed: ${fetchError.message}`);
      }

      if (existingFarmer) {
        console.log('Existing farmer found:', existingFarmer.id);
        setFarmer(existingFarmer);
        localStorage.setItem('farmer_id', existingFarmer.id);
        
        // Load settings — table may not exist yet, ignore errors
        let settingsData = null;
        try {
          const res = await supabase
            .from('user_settings')
            .select('*')
            .eq('farmer_id', existingFarmer.id)
            .maybeSingle();
          settingsData = res.data ?? null;
        } catch {
          // table doesn't exist yet — safe to ignore
        }
        
        setUserSettings(settingsData || null);
      } else {
        console.log('Creating new farmer profile for Firebase user');
        
        // Create new farmer profile with ONLY columns that exist in the actual table
        // Based on backend/src/models/schema.sql: id, name, phone, state, district, land_area_ac, created_at
        const { data: newFarmer, error: insertError } = await supabase
          .from('farmers')
          .insert({
            auth_user_id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            phone: firebaseUser.phoneNumber || null,
            state: null,  // Optional
            district: null,  // Optional
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating farmer:', insertError);
          throw new Error(`Failed to create farmer profile: ${insertError.message}`);
        }

        if (newFarmer) {
          console.log('New farmer created:', newFarmer.id);
          setFarmer(newFarmer);
          localStorage.setItem('farmer_id', newFarmer.id);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error syncing Firebase user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync user profile';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const loadFarmerData = async (userId: string, userEmail?: string | null) => {
    try {
      // Check if this is the demo account
      if (isDemoAccount(userEmail)) {
        console.log('Loading demo farmer data');
        const demoFarmer = getDemoFarmer(userId);
        setFarmer(demoFarmer);
        localStorage.setItem('farmer_id', demoFarmer.id);
        localStorage.setItem('is_demo_account', 'true');
        return;
      }

      // Clear demo flag for real users
      localStorage.removeItem('is_demo_account');

      // Fetch farmer profile for real users
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (farmerError && farmerError.code !== 'PGRST116') {
        console.error('Error loading farmer:', farmerError);
        // Don't throw - allow app to continue
        return;
      }

      setFarmer(farmerData || null);

      // Store farmer ID in localStorage for API client
      if (farmerData) {
        localStorage.setItem('farmer_id', farmerData.id);
      } else {
        localStorage.removeItem('farmer_id');
      }

      // Fetch user settings
      if (farmerData) {
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('farmer_id', farmerData.id)
          .maybeSingle();

        if (settingsError && settingsError.code !== 'PGRST116') {
          // Silently ignore 404 — user_settings table may not exist yet in this deployment
          if (!settingsError.message?.includes('404') && settingsError.code !== '42P01') {
            console.error('Error loading settings:', settingsError);
          }
        }

        setUserSettings(settingsData || null);
      }
    } catch (err) {
      console.error('Error loading farmer data:', err);
      // Don't throw - allow app to continue without farmer data
    }
  };

  const signUp = async (email: string, password: string, farmerData: Partial<Farmer>) => {
    try {
      setError(null);
      setLoading(true);

      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');

      // Create farmer profile — only real columns: name, phone, state, district, land_area_ac
      const { error: farmerError } = await supabase.from('farmers').insert({
        auth_user_id: authData.user.id,
        name: farmerData.name || '',
        phone: farmerData.phone,
        state: farmerData.state,
        district: farmerData.district,
        land_area_ac: farmerData.total_area_acres ?? farmerData.land_area_ac,
      });

      if (farmerError) throw farmerError;

      setUser(authData.user);
      await loadFarmerData(authData.user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // Handle demo account locally — no Supabase call needed
      if (isDemoAccount(email)) {
        if (password !== DEMO_PASSWORD) {
          throw new Error('Invalid demo credentials');
        }
        // Set demo flag immediately so the Supabase auth listener doesn't clear state
        localStorage.setItem('is_demo_account', 'true');
        const demoUserId = 'demo-user-001';
        const demoUser: User = {
          id: demoUserId,
          email: DEMO_EMAIL,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User;
        setUser(demoUser);
        setSession(null);
        setAuthProvider('supabase'); // treat as logged-in
        await loadFarmerData(demoUserId, DEMO_EMAIL);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned from signin');

      setSession(data.session);
      setUser(data.user);
      await loadFarmerData(data.user.id, data.user.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Initiating Google sign-in...');
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      console.log('Google sign-in successful:', result.user.email);
      
      setAuthProvider('firebase');
      
      // Create Supabase-compatible user object
      const supabaseCompatibleUser: User = {
        id: result.user.uid,
        email: result.user.email,
        app_metadata: {},
        user_metadata: {
          name: result.user.displayName,
          avatar_url: result.user.photoURL,
        },
        aud: 'authenticated',
        created_at: result.user.metadata.creationTime || new Date().toISOString(),
      } as User;
      
      setUser(supabaseCompatibleUser);
      
      // Sync with Supabase and create/load farmer profile
      await syncFirebaseUserToSupabase(result.user);
      
      console.log('Google sign-in complete, user synced');
    } catch (err) {
      console.error('Google sign-in error:', err);
      const message = err instanceof Error ? err.message : 'Google sign in failed';
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      
      const isDemo = localStorage.getItem('is_demo_account') === 'true';

      // Sign out from both providers
      if (authProvider === 'supabase' && !isDemo) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else if (authProvider === 'firebase') {
        await firebaseSignOut(firebaseAuth);
      }

      setSession(null);
      setUser(null);
      setFarmer(null);
      setUserSettings(null);
      setAuthProvider(null);
      
      // Clear farmer ID and demo flag from localStorage
      localStorage.removeItem('farmer_id');
      localStorage.removeItem('is_demo_account');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    farmer,
    userSettings,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user && !!farmer,
    authProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
