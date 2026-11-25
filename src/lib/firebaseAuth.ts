import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

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

// Standard Google Sign-In without sensitive YouTube OAuth scopes so Google never
// blocks users with an "unverified app / unsafe" warning screen.
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

export interface AuthUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

function toProfile(user: User): AuthUserProfile {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export const initAuth = (
  onSignedIn: (profile: AuthUserProfile) => void,
  onSignedOut: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      onSignedIn(toProfile(user));
    } else {
      onSignedOut();
    }
  });
};

export const googleSignIn = async (): Promise<AuthUserProfile> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return toProfile(result.user);
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      throw new Error(
        'Firebase Authentication henüz etkinleştirilmemiş. Firebase Console → Authentication → Sign-in method bölümünden Google girişini açın.'
      );
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'Bu alan adı Firebase yetkilendirilmiş domainler listesinde değil. Firebase Console → Authentication → Settings → Authorized domains kısmına sitenizin adresini ekleyin.'
      );
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error(
        'Google giriş penceresi tamamlanmadan kapatıldı. Tekrar deneyebilirsiniz.'
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error(
        'Tarayıcınız giriş penceresini engelledi. Lütfen açılır pencerelere izin verip tekrar deneyin.'
      );
    }
    throw err;
  }
};

export const getAccessToken = (): string | null => {
  return null;
};

export const logout = async (): Promise<void> => {
  await auth.signOut();
};
