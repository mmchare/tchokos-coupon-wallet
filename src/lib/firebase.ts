// Firebase configuration for JinBao Smart Market
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

// Firebase configuration for JinBao
const firebaseConfig = {
  apiKey: "AIzaSyDLo_h439EITxQkDpoVGIc-kGzC1NQMWbg",
  authDomain: "jinbao-acdd4.firebaseapp.com",
  projectId: "jinbao-acdd4",
  storageBucket: "jinbao-acdd4.firebasestorage.app",
  messagingSenderId: "87467089868",
  appId: "1:87467089868:web:e8c3ec85bc91e72bf40769",
  measurementId: "G-BWM0PNDQJ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure auth language to French
auth.languageCode = 'fr';

// Setup invisible reCAPTCHA verifier
export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired');
    }
  });
  return verifier;
};

// Send OTP via Firebase
export const sendFirebaseOTP = async (
  phoneNumber: string, 
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  // Format phone number for Cameroon if needed
  let formattedPhone = phoneNumber.replace(/\s/g, '');
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.startsWith('237')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+237' + formattedPhone;
    }
  }
  
  return signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
};

export default app;
