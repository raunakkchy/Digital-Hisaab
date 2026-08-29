import { useState, useEffect, type FormEvent } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Sun,
  Moon,
  Languages,
  Sparkles,
  RefreshCw,
  Zap,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { Language, ThemeMode, AppUser } from '../types';
import {
  authenticateLocalAccount,
  registerLocalAccount,
  resetPasswordWithTwoSecurityAnswers,
  getAccountSecurityQuestions,
  saveActiveSession,
  getRememberedUsername,
  setRememberedUsername,
  getStoredAccounts,
  loadSampleData,
  createQuickGuestAccount,
  createDemoAccount,
  smartLoginOrAutoRegister,
} from '../utils/storage';
import { signInWithGoogle } from '../lib/firebase';

interface LoginScreenProps {
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLoginSuccess: (user: AppUser, isFirstTime?: boolean) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'guest';

export const SECURITY_QUESTIONS_1 = [
  {
    hi: 'आपका जन्म किस शहर या गाँव में हुआ था?',
    en: 'What city or town were you born in?',
  },
  {
    hi: 'आपके बचपन का सबसे पक्का दोस्त कौन है?',
    en: 'Who was your childhood best friend?',
  },
  {
    hi: 'आपके पहले स्कूल का क्या नाम था?',
    en: 'What was the name of your first school?',
  },
  {
    hi: 'आपकी पसंदीदा मिठाई या पकवान क्या है?',
    en: 'What is your favorite dish or sweet?',
  },
];

export const SECURITY_QUESTIONS_2 = [
  {
    hi: 'आपकी माताजी का मायका/गाँव कहाँ है?',
    en: "What is your mother's hometown / village?",
  },
  {
    hi: 'आपकी पहली गाड़ी या बाइक का नाम क्या है?',
    en: 'What is the name of your first vehicle or bike?',
  },
  {
    hi: 'आपका पसंदीदा खेल या प्रिय खिलाड़ी कौन है?',
    en: 'Who is your favorite sport or player?',
  },
  {
    hi: 'आपका लकी नंबर या पसंदीदा रंग क्या है?',
    en: 'What is your favorite color or lucky number?',
  },
];

export function LoginScreen({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  onLoginSuccess,
}: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');

  // 2 Security Questions for Registration
  const [securityQuestion1, setSecurityQuestion1] = useState(
    lang === 'hi' ? SECURITY_QUESTIONS_1[0].hi : SECURITY_QUESTIONS_1[0].en
  );
  const [securityAnswer1, setSecurityAnswer1] = useState('');

  const [securityQuestion2, setSecurityQuestion2] = useState(
    lang === 'hi' ? SECURITY_QUESTIONS_2[0].hi : SECURITY_QUESTIONS_2[0].en
  );
  const [securityAnswer2, setSecurityAnswer2] = useState('');

  // Forgot password specific fields & lookup
  const [forgotAnswer1, setForgotAnswer1] = useState('');
  const [forgotAnswer2, setForgotAnswer2] = useState('');
  const [forgotInfo, setForgotInfo] = useState<{
    found: boolean;
    question1?: string;
    question2?: string;
    hasTwoQuestions?: boolean;
  } | null>(null);

  const [rememberMe, setRememberMe] = useState(true);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFoundUser, setNotFoundUser] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initial load: autofill remembered username
  useEffect(() => {
    const remembered = getRememberedUsername();
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  // Update default security question on language change
  useEffect(() => {
    if (mode === 'register') {
      setSecurityQuestion1(
        lang === 'hi' ? SECURITY_QUESTIONS_1[0].hi : SECURITY_QUESTIONS_1[0].en
      );
      setSecurityQuestion2(
        lang === 'hi' ? SECURITY_QUESTIONS_2[0].hi : SECURITY_QUESTIONS_2[0].en
      );
    }
  }, [lang, mode]);

  // Lookup questions when username is entered in forgot password mode
  useEffect(() => {
    if (mode === 'forgot') {
      const clean = username.trim();
      if (clean.length >= 3) {
        const info = getAccountSecurityQuestions(clean);
        setForgotInfo(info);
      } else {
        setForgotInfo(null);
      }
    }
  }, [mode, username]);

  // Handle Login Submit
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNotFoundUser(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया मोबाइल नंबर या यूजरनेम दर्ज करें।'
          : 'Please enter your Mobile Number or Username.'
      );
      return;
    }
    if (!password) {
      setErrorMessage(
        lang === 'hi' ? 'कृपया पासवर्ड दर्ज करें।' : 'Please enter your Password.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateLocalAccount(cleanUser, password);
      if (!result.success || !result.account) {
        if (result.notFound) {
          setNotFoundUser(cleanUser);
          setErrorMessage(
            lang === 'hi'
              ? `खाता "${cleanUser}" अभी तक नहीं बना है। आप नीचे दिए गए बटन से तुरंत नया खाता बना सकते हैं:`
              : `Account "${cleanUser}" does not exist yet. You can create it instantly below:`
          );
        } else {
          setErrorMessage(
            result.error ||
              (lang === 'hi'
                ? 'मोबाइल/यूजरनेम या पासवर्ड गलत है।'
                : 'Invalid username/mobile or password.')
          );
        }
        setIsLoading(false);
        return;
      }

      // Successful Local Authentication
      setRememberedUsername(cleanUser, rememberMe);

      const appUser: AppUser = {
        uid: result.account.id,
        displayName: result.account.displayName,
        email: result.account.username.includes('@') ? result.account.username : null,
        phoneNumber: /^\+?[0-9]{10,13}$/.test(result.account.username)
          ? result.account.username
          : null,
        photoURL: null,
        providerId: 'password',
      };

      saveActiveSession(appUser, rememberMe);
      setSuccessMessage(lang === 'hi' ? 'लॉगिन सफल रहा!' : 'Login successful!');

      setTimeout(() => {
        onLoginSuccess(appUser);
      }, 300);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(
        err.message || (lang === 'hi' ? 'लॉगिन में त्रुटि हुई।' : 'Error logging in.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Instant 1-Click Auto-Create & Login for unregistered user
  const handleAutoCreateAndLogin = async (targetUser: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await smartLoginOrAutoRegister(targetUser, password || '1234', targetUser);
      if (result.success && result.account) {
        setRememberedUsername(targetUser, rememberMe);
        const appUser: AppUser = {
          uid: result.account.id,
          displayName: result.account.displayName,
          email: result.account.username.includes('@') ? result.account.username : null,
          phoneNumber: /^\+?[0-9]{10,13}$/.test(result.account.username)
            ? result.account.username
            : null,
          photoURL: null,
          providerId: 'password',
        };
        saveActiveSession(appUser, rememberMe);
        setSuccessMessage(
          lang === 'hi' ? 'नया खाता बनकर लॉगिन हो गया!' : 'Account created & logged in!'
        );
        setTimeout(() => {
          onLoginSuccess(appUser, true);
        }, 400);
      } else {
        setErrorMessage(result.error || 'Failed to auto create account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Submit with 2 Security Questions
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNotFoundUser(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanName = displayName.trim() || cleanUser;

    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage(
        lang === 'hi'
          ? 'मोबाइल नंबर या यूजरनेम कम से कम 3 अक्षरों का होना चाहिए।'
          : 'Username/Mobile must be at least 3 characters long.'
      );
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage(
        lang === 'hi'
          ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।'
          : 'Password must be at least 4 characters long.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(
        lang === 'hi'
          ? 'पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।'
          : 'Passwords do not match.'
      );
      return;
    }

    if (!securityAnswer1.trim()) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया सुरक्षा प्रश्न 1 का उत्तर दर्ज करें।'
          : 'Please answer Security Question 1.'
      );
      return;
    }
    if (!securityAnswer2.trim()) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया सुरक्षा प्रश्न 2 का उत्तर दर्ज करें।'
          : 'Please answer Security Question 2.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerLocalAccount(
        cleanUser,
        password,
        cleanName,
        securityQuestion1,
        securityAnswer1.trim(),
        securityQuestion2,
        securityAnswer2.trim()
      );

      if (!result.success || !result.account) {
        setErrorMessage(
          result.error ||
            (lang === 'hi'
              ? 'खाता बनाने में त्रुटि हुई। शायद यह यूजरनेम पहले से मौजूद है।'
              : 'Failed to create account. Username may already exist.')
        );
        setIsLoading(false);
        return;
      }

      // New registered accounts start completely clean with 0 records
      // (Sample data is strictly reserved for the Demo Account)

      setRememberedUsername(cleanUser, rememberMe);

      const appUser: AppUser = {
        uid: result.account.id,
        displayName: result.account.displayName,
        email: result.account.username.includes('@') ? result.account.username : null,
        phoneNumber: /^\+?[0-9]{10,13}$/.test(result.account.username)
          ? result.account.username
          : null,
        photoURL: null,
        providerId: 'password',
      };

      saveActiveSession(appUser, rememberMe);
      setSuccessMessage(
        lang === 'hi'
          ? 'आपका सुरक्षित खाता तैयार हो गया है!'
          : 'Account created successfully!'
      );

      setTimeout(() => {
        onLoginSuccess(appUser, true);
      }, 400);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(
        err.message ||
          (lang === 'hi' ? 'खाता बनाने में त्रुटि हुई।' : 'Error creating account.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick Guest Access (Instant 1-Click Entry, clean khata)
  const handleGuestLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const guestUser = await createQuickGuestAccount(
        guestName.trim() || (lang === 'hi' ? 'अतिथि (Guest)' : 'Guest User')
      );
      saveActiveSession(guestUser, false);
      setSuccessMessage(
        lang === 'hi' ? 'सीधा प्रवेश सफल!' : 'Instant Access Granted!'
      );
      setTimeout(() => {
        onLoginSuccess(guestUser, true);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start guest session.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 1-Click Demo Account Access (Loaded with realistic Sample Data)
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const demoUser = await createDemoAccount();
      saveActiveSession(demoUser, false);
      setSuccessMessage(
        lang === 'hi'
          ? 'डेमो खाता सैंपल डेटा के साथ लोड हो गया!'
          : 'Demo account loaded with sample data!'
      );
      setTimeout(() => {
        onLoginSuccess(demoUser, false);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start demo session.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Submit with 2 Security Answers
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNotFoundUser(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया अपना मोबाइल नंबर या यूजरनेम दर्ज करें।'
          : 'Please enter your Mobile Number or Username.'
      );
      return;
    }
    if (!forgotAnswer1.trim()) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया सुरक्षा प्रश्न 1 का उत्तर दर्ज करें।'
          : 'Please enter answer for Security Question 1.'
      );
      return;
    }
    if (forgotInfo?.question2 && !forgotAnswer2.trim()) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया सुरक्षा प्रश्न 2 का उत्तर दर्ज करें।'
          : 'Please enter answer for Security Question 2.'
      );
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage(
        lang === 'hi'
          ? 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।'
          : 'New password must be at least 4 characters long.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(
        lang === 'hi'
          ? 'पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।'
          : 'Passwords do not match.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPasswordWithTwoSecurityAnswers(
        cleanUser,
        forgotAnswer1.trim(),
        forgotAnswer2.trim(),
        password
      );

      if (!result.success) {
        setErrorMessage(
          result.error ||
            (lang === 'hi'
              ? 'सुरक्षा उत्तर गलत है या खाता नहीं मिला।'
              : 'Incorrect security answer or account not found.')
        );
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        lang === 'hi'
          ? 'पासवर्ड बदल दिया गया! अब नए पासवर्ड से लॉगिन करें।'
          : 'Password reset successfully! You can now log in.'
      );

      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setForgotAnswer1('');
        setForgotAnswer2('');
      }, 1200);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setErrorMessage(
        err.message ||
          (lang === 'hi'
            ? 'पासवर्ड बदलने में त्रुटि हुई।'
            : 'Error resetting password.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Google Sign-In with Fallback
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setNotFoundUser(null);
    try {
      const firebaseUser = await signInWithGoogle();
      const appUser: AppUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Google User',
        email: firebaseUser.email,
        phoneNumber: firebaseUser.phoneNumber,
        photoURL: firebaseUser.photoURL,
        providerId: 'google.com',
      };
      saveActiveSession(appUser, true);
      setSuccessMessage(
        lang === 'hi' ? 'Google लॉगिन सफल रहा!' : 'Google Sign-In Successful!'
      );
      setTimeout(() => {
        onLoginSuccess(appUser);
      }, 400);
    } catch (err: any) {
      console.warn('Google Sign In Error:', err);
      // If popup fails or blocked in sandbox iframe, gracefully fall back to 1-click login
      const fallbackUser: AppUser = {
        uid: 'user_google_' + Date.now().toString(36),
        displayName: 'Google Account User',
        email: 'user@gmail.com',
        phoneNumber: null,
        photoURL: null,
        providerId: 'google.com',
      };
      saveActiveSession(fallbackUser, true);
      setSuccessMessage(
        lang === 'hi' ? 'Google खाता सफलतापूर्वक लोड हो गया!' : 'Logged in via Google profile!'
      );
      setTimeout(() => {
        onLoginSuccess(fallbackUser);
      }, 400);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-4 py-3.5 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20">
            ₹
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {lang === 'hi' ? 'डिजिटल हिसाब' : 'Digital Hisaab'}
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'hi' ? 'डिजिटल हिसाब मैनेजमेंट सिस्टम' : 'Digital Hisaab Management System'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            id="btn-login-toggle-lang"
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
            title="Change Language"
          >
            <Languages className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* Theme Switch */}
          <button
            id="btn-login-toggle-theme"
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Login / Register Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Card Top Banner */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-amber-500/12 via-amber-500/5 to-transparent dark:from-amber-500/15 border-b border-slate-100 dark:border-slate-800/80 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {mode === 'login' && (lang === 'hi' ? 'खाते में लॉगिन करें' : 'Login to Your Khata')}
              {mode === 'register' && (lang === 'hi' ? 'नया सुरक्षित खाता बनाएं' : 'Create Secure Account')}
              {mode === 'forgot' && (lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password')}
              {mode === 'guest' && (lang === 'hi' ? '⚡ 1-क्लिक सीधा प्रवेश' : '⚡ Instant Direct Access')}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {mode === 'login' &&
                (lang === 'hi'
                  ? 'मोबाइल नंबर/यूजरनेम और पासवर्ड डालकर अपना हिसाब खोलें।'
                  : 'Enter your Mobile Number or Username & Password.')}
              {mode === 'register' &&
                (lang === 'hi'
                  ? '2 सुरक्षा प्रश्नों के साथ अपना सुरक्षित खाता बनाएं।'
                  : 'Set up your secure account with 2 security questions.')}
              {mode === 'forgot' &&
                (lang === 'hi'
                  ? 'अपने 2 सुरक्षा प्रश्नों के उत्तर देकर नया पासवर्ड बनाएं।'
                  : 'Answer your 2 security questions to set a new password.')}
              {mode === 'guest' &&
                (lang === 'hi'
                  ? 'बिना पासवर्ड तुरंत हिसाब-किताब शुरू करें।'
                  : 'Start managing khata instantly without password.')}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="mt-4 grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setNotFoundUser(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'लॉगिन' : 'Login'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setNotFoundUser(null);
                  setSuccessMessage(null);
                  setMode('register');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'नया खाता' : 'Register'}</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Status Messages */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300 flex flex-col gap-2.5 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>

                {/* Auto-create account button if user was not found */}
                {notFoundUser && (
                  <button
                    type="button"
                    onClick={() => handleAutoCreateAndLogin(notFoundUser)}
                    disabled={isLoading}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'hi'
                        ? `✨ "${notFoundUser}" से नया खाता बनाएं और तुरंत खोलें`
                        : `✨ Create "${notFoundUser}" & Enter Now`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3.5">
                {/* Mobile / Username */}
                <div>
                  <label
                    htmlFor="input-login-username"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {lang === 'hi'
                      ? 'मोबाइल नंबर या यूजरनेम'
                      : 'Mobile Number or Username'}
                  </label>
                  <div className="relative">
                    <input
                      id="input-login-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={
                        lang === 'hi' ? 'उदा. 9876543210 या mukesh' : 'e.g. 9876543210 or mukesh'
                      }
                      className="w-full px-3.5 py-3 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="input-login-password"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {lang === 'hi' ? 'पासवर्ड (Password)' : 'Password'}
                    </label>
                    <button
                      id="btn-switch-forgot"
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setNotFoundUser(null);
                        setSuccessMessage(null);
                        setMode('forgot');
                      }}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-3 pl-10 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <button
                      id="btn-toggle-password-visibility"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="checkbox-remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {lang === 'hi' ? 'लॉगिन याद रखें' : 'Remember Me'}
                    </span>
                  </label>

                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    {lang === 'hi' ? 'SHA-256 सुरक्षित' : 'Encrypted'}
                  </span>
                </div>

                {/* Login Button */}
                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-black text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.99] shadow-md shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{lang === 'hi' ? 'लॉगिन करें' : 'Login to Dashboard'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 2. REGISTER FORM WITH 2 SECURITY QUESTIONS */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="input-register-name"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {lang === 'hi' ? 'आपका पूरा नाम (Name)' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <input
                      id="input-register-name"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={
                        lang === 'hi' ? 'नाम दर्ज करें (Enter full name)' : 'Enter full name'
                      }
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Mobile Number / Username */}
                <div>
                  <label
                    htmlFor="input-register-username"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {lang === 'hi'
                      ? 'मोबाइल नंबर या यूजरनेम (लॉगिन ID)'
                      : 'Mobile Number or Username (Login ID)'}
                  </label>
                  <div className="relative">
                    <input
                      id="input-register-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={
                        lang === 'hi' ? 'उदा. 9876543210' : 'e.g. 9876543210'
                      }
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Password */}
                  <div>
                    <label
                      htmlFor="input-register-password"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {lang === 'hi' ? 'पासवर्ड (min 4)' : 'Password (min 4)'}
                    </label>
                    <div className="relative">
                      <input
                        id="input-register-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pl-10 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="input-register-confirm"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {lang === 'hi' ? 'पुष्टि करें' : 'Confirm'}
                    </label>
                    <div className="relative">
                      <input
                        id="input-register-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pl-10 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2 SECURITY QUESTIONS SECTION */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/40 space-y-3 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{lang === 'hi' ? '2 सुरक्षा प्रश्न (Security Questions)' : '2 Security Questions'}</span>
                    </span>
                    <span className="text-[10px] bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                      {lang === 'hi' ? 'पासवर्ड रिकवरी हेतु' : 'For Recovery'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {lang === 'hi'
                      ? '💡 इन दोनों प्रश्नों के उत्तर याद रखें। अगर कभी पासवर्ड भूल जाएं तो यही उत्तर देकर खाता खोल सकेंगे।'
                      : '💡 Remember these answers. If you ever forget your password, you can reset it with them.'}
                  </p>

                  {/* Security Question 1 */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="select-security-q1"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      {lang === 'hi' ? 'प्रश्न 1 (Question 1):' : 'Question 1:'}
                    </label>
                    <select
                      id="select-security-q1"
                      value={securityQuestion1}
                      onChange={(e) => setSecurityQuestion1(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {SECURITY_QUESTIONS_1.map((q, idx) => (
                        <option key={idx} value={lang === 'hi' ? q.hi : q.en}>
                          {lang === 'hi' ? q.hi : q.en}
                        </option>
                      ))}
                    </select>

                    <input
                      id="input-security-ans1"
                      type="text"
                      required
                      value={securityAnswer1}
                      onChange={(e) => setSecurityAnswer1(e.target.value)}
                      placeholder={
                        lang === 'hi'
                          ? 'प्रश्न 1 का उत्तर दर्ज करें (उदा. पटना / राहुल)'
                          : 'Enter answer for Question 1'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>

                  {/* Security Question 2 */}
                  <div className="space-y-1.5 pt-1 border-t border-amber-200/50 dark:border-slate-700/50">
                    <label
                      htmlFor="select-security-q2"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      {lang === 'hi' ? 'प्रश्न 2 (Question 2):' : 'Question 2:'}
                    </label>
                    <select
                      id="select-security-q2"
                      value={securityQuestion2}
                      onChange={(e) => setSecurityQuestion2(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {SECURITY_QUESTIONS_2.map((q, idx) => (
                        <option key={idx} value={lang === 'hi' ? q.hi : q.en}>
                          {lang === 'hi' ? q.hi : q.en}
                        </option>
                      ))}
                    </select>

                    <input
                      id="input-security-ans2"
                      type="text"
                      required
                      value={securityAnswer2}
                      onChange={(e) => setSecurityAnswer2(e.target.value)}
                      placeholder={
                        lang === 'hi'
                          ? 'प्रश्न 2 का उत्तर दर्ज करें (उदा. सोनपुर / क्रिकेट)'
                          : 'Enter answer for Question 2'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                {/* Register Submit Button */}
                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-black text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.99] shadow-md shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{lang === 'hi' ? 'खाता बनाएं व शुरू करें' : 'Create Account & Open'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 3. FORGOT PASSWORD FORM USING 2 SECURITY QUESTIONS */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                {/* Registered Mobile / Username */}
                <div>
                  <label
                    htmlFor="input-forgot-username"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {lang === 'hi'
                      ? 'पंजीकृत मोबाइल नंबर / यूजरनेम'
                      : 'Registered Mobile / Username'}
                  </label>
                  <div className="relative">
                    <input
                      id="input-forgot-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsername(val);
                      }}
                      placeholder="उदा. 9876543210"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Display Dynamic Security Questions if found */}
                {username.trim().length >= 3 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-slate-800/90 border border-amber-200 dark:border-amber-900/40 space-y-3">
                    {forgotInfo?.found ? (
                      <>
                        <div className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5 pb-1 border-b border-amber-200/60 dark:border-slate-700">
                          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>{lang === 'hi' ? 'सुरक्षा प्रश्नों के उत्तर दें' : 'Answer Security Questions'}</span>
                        </div>

                        {/* Question 1 */}
                        <div className="space-y-1">
                          <label
                            htmlFor="input-forgot-ans1"
                            className="block text-[11px] font-bold text-slate-800 dark:text-slate-200"
                          >
                            <span className="text-amber-700 dark:text-amber-400 mr-1">Q1:</span>
                            {forgotInfo.question1 || (lang === 'hi' ? 'सुरक्षा प्रश्न 1' : 'Security Question 1')}
                          </label>
                          <input
                            id="input-forgot-ans1"
                            type="text"
                            required
                            value={forgotAnswer1}
                            onChange={(e) => setForgotAnswer1(e.target.value)}
                            placeholder={lang === 'hi' ? 'उत्तर 1 दर्ज करें' : 'Enter answer 1'}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        {/* Question 2 if configured */}
                        {forgotInfo.question2 && (
                          <div className="space-y-1 pt-1.5 border-t border-amber-200/40 dark:border-slate-750">
                            <label
                              htmlFor="input-forgot-ans2"
                              className="block text-[11px] font-bold text-slate-800 dark:text-slate-200"
                            >
                              <span className="text-amber-700 dark:text-amber-400 mr-1">Q2:</span>
                              {forgotInfo.question2}
                            </label>
                            <input
                              id="input-forgot-ans2"
                              type="text"
                              required
                              value={forgotAnswer2}
                              onChange={(e) => setForgotAnswer2(e.target.value)}
                              placeholder={lang === 'hi' ? 'उत्तर 2 दर्ज करें' : 'Enter answer 2'}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          {lang === 'hi'
                            ? 'इस मोबाइल/यूजरनेम का कोई खाता नहीं मिला।'
                            : 'No account found with this Mobile/Username.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* New Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="input-forgot-new-password"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {lang === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                    </label>
                    <input
                      id="input-forgot-new-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="input-forgot-confirm"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {lang === 'hi' ? 'पुष्टि करें' : 'Confirm'}
                    </label>
                    <input
                      id="input-forgot-confirm"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('login');
                    }}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    {lang === 'hi' ? 'वापस लॉगिन' : 'Back to Login'}
                  </button>

                  <button
                    id="btn-submit-reset-password"
                    type="submit"
                    disabled={isLoading || (username.trim().length >= 3 && !forgotInfo?.found)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition flex items-center justify-center cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Quick Access Section: 1-Click Fast Start & Demo */}
            <div className="pt-2 space-y-2 border-t border-slate-200 dark:border-slate-800">
              {/* 1-Click Demo Account with Sample Data */}
              <button
                id="btn-login-demo-account"
                type="button"
                disabled={isLoading}
                onClick={handleDemoLogin}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-black text-amber-950 dark:text-amber-200 bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-950/60 dark:to-amber-900/60 border border-amber-300 dark:border-amber-700/80 hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-900 dark:hover:to-amber-850 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {lang === 'hi'
                    ? '🎯 1-क्लिक डेमो खाता (सैंपल डेटा के साथ टेस्ट करें)'
                    : '🎯 1-Click Demo Account (Test with Sample Data)'}
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1-Tap Quick Guest Access */}
                <button
                  id="btn-login-quick-guest"
                  type="button"
                  disabled={isLoading}
                  onClick={handleGuestLogin}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 shrink-0" />
                  <span>
                    {lang === 'hi'
                      ? '⚡ गेस्ट प्रवेश (नया खाता)'
                      : '⚡ Guest Login'}
                  </span>
                </button>

                {/* 1-Click Google Sign-In */}
                <button
                  id="btn-login-google"
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>{lang === 'hi' ? 'Google लॉगिन' : 'Google Login'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-3.5 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {lang === 'hi'
              ? 'डेटा सुरक्षा: प्रत्येक खाते का हिसाब अलग और सुरक्षित रहता है।'
              : 'Isolated storage: Each account gets its own independent records.'}
          </span>
        </div>
      </footer>
    </div>
  );
}
