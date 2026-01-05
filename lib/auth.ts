// Authentication utilities using Supabase

import { createBrowserClient, supabaseAdmin } from './supabase/client'

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  requestBalance: number;
  referralCode?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const auth = {
  async login(email: string, password: string): Promise<User> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const supabase = createBrowserClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Login failed');
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile');
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      avatar: profile.avatar_url,
      role: profile.role || 'user',
      createdAt: new Date(profile.created_at),
      requestBalance: profile.request_balance || 0,
      referralCode: profile.referral_code,
    };
  },

  async signup(email: string, password: string, name: string, referralCode?: string): Promise<User> {
    if (!email || !password || !name) {
      throw new Error('All fields are required');
    }

    const supabase = createBrowserClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Signup failed');
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile');
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      avatar: profile.avatar_url,
      role: profile.role || 'user',
      createdAt: new Date(profile.created_at),
      requestBalance: profile.request_balance || 0,
      referralCode: profile.referral_code,
    };
  },

  async logout(): Promise<void> {
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = createBrowserClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      avatar: profile.avatar_url,
      role: profile.role || 'user',
      createdAt: new Date(profile.created_at),
      requestBalance: profile.request_balance || 0,
      referralCode: profile.referral_code,
    };
  },
};
