import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

const resolvedFirebaseConfig = {
  ...firebaseConfig,
  ...(import.meta.env.VITE_FIREBASE_API_KEY
    ? { apiKey: import.meta.env.VITE_FIREBASE_API_KEY }
    : {}),
  ...(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    ? { authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN }
    : {}),
  ...(import.meta.env.VITE_FIREBASE_PROJECT_ID
    ? { projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID }
    : {}),
  ...(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    ? { storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET }
    : {}),
  ...(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    ? { messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID }
    : {}),
  ...(import.meta.env.VITE_FIREBASE_APP_ID
    ? { appId: import.meta.env.VITE_FIREBASE_APP_ID }
    : {}),
};

const app = initializeApp(resolvedFirebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of YOUTUBE_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'consent select_account',
  include_granted_scopes: 'true',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthRequired?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthRequired?.(user);
      }
    } else {
      cachedAccessToken = null;
      onAuthRequired?.(null);
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Google oturumundan YouTube erişim jetonu alınamadı. Lütfen izinleri onaylayarak tekrar deneyin.'
      );
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      throw new Error(
        'Firebase Authentication henüz etkinleştirilmemiş. Firebase Console → Authentication → Sign-in method bölümünden "Get started" deyip Google girişini açın.'
      );
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'Bu alan adı Firebase yetkilendirilmiş domainler listesinde değil. Firebase Console → Authentication → Settings → Authorized domains kısmına sitenizin adresini ekleyin.'
      );
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error(
        'Google giriş penceresi tamamlanmadan kapatıldı. Tekrar deneyebilir veya kanal @handle adınızı yazarak bağlanabilirsiniz.'
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error(
        'Tarayıcınız giriş penceresini engelledi. Lütfen açılır pencerelere izin verip tekrar deneyin.'
      );
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut();
};
