import { useState, type FormEvent } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  Languages,
  UserPlus,
  LogIn,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Phone,
} from 'lucide-react';
import { Language, ThemeMode, AppUser } from '../types';
import {
  authenticateLocalAccount,
  registerLocalAccount,
  createQuickGuestAccount,
  createDemoAccount,
  getAccountSecurityQuestions,
  resetPasswordWithTwoSecurityAnswers,
} from '../utils/storage';
import { signInWithGoogle } from '../lib/firebase';

interface LoginScreenProps {
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLoginSuccess: (user: AppUser) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const SECURITY_QUESTIONS_1 = [
  'What is your birthplace or hometown?',
  'What is the name of your first school?',
  'What is your favorite food or sweet?',
  'What was your childhood nickname?',
];

const SECURITY_QUESTIONS_2 = [
  'What is your mother’s maiden name?',
  'What was your first vehicle or bike model?',
  'What is your favorite sport or hobby?',
  'What is your favorite color?',
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
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Security Questions (Register)
  const [question1, setQuestion1] = useState(SECURITY_QUESTIONS_1[0]);
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState(SECURITY_QUESTIONS_2[0]);
  const [answer2, setAnswer2] = useState('');

  // Forgot Password Steps
  const [forgotStep, setForgotStep] = useState<'username' | 'questions' | 'done'>('username');
  const [forgotQ1, setForgotQ1] = useState<string>('');
  const [forgotA1, setForgotA1] = useState<string>('');
  const [forgotQ2, setForgotQ2] = useState<string>('');
  const [forgotA2, setForgotA2] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Login
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage(lang === 'hi' ? 'कृपया मोबाइल नंबर या यूजरनेम दर्ज करें।' : 'Please enter mobile number or username.');
      return;
    }
    if (!password) {
      setErrorMessage(lang === 'hi' ? 'कृपया पासवर्ड दर्ज करें।' : 'Please enter password.');
      return;
    }

    setIsLoading(true);
    try {
      const authResult = await authenticateLocalAccount(cleanUser, password);
      if (authResult.success && authResult.account) {
        const appUser: AppUser = {
          uid: authResult.account.id,
          displayName: authResult.account.displayName,
          email: null,
          phoneNumber: cleanUser,
          photoURL: null,
          providerId: 'password',
        };

        setSuccessMessage(
          lang === 'hi'
            ? `स्वागत है, ${appUser.displayName}! लॉगिन सफल रहा।`
            : `Welcome back, ${appUser.displayName}! Logged in successfully.`
        );

        setTimeout(() => {
          onLoginSuccess(appUser);
        }, 300);
      } else {
        setErrorMessage(
          authResult.error ||
            (lang === 'hi' ? 'लॉगिन विफल रहा। कृपया जांचें।' : 'Login failed. Please check credentials.')
        );
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(lang === 'hi' ? 'प्रमाणीकरण में त्रुटि हुई।' : 'Authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanDisplay = displayName.trim() || cleanUser;

    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage(
        lang === 'hi'
          ? 'मोबाइल नंबर या यूजरनेम कम से कम 3 अक्षरों का होना चाहिए।'
          : 'Mobile or Username must be at least 3 characters.'
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
    if (!answer1.trim() || !answer2.trim()) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया दोनों सुरक्षा प्रश्नों के उत्तर दें (पासवर्ड भूलने पर काम आएंगे)।'
          : 'Please provide answers for both security questions.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const regResult = await registerLocalAccount(
        cleanUser,
        password,
        cleanDisplay,
        question1,
        answer1,
        question2,
        answer2
      );

      if (regResult.success && regResult.account) {
        const appUser: AppUser = {
          uid: regResult.account.id,
          displayName: regResult.account.displayName,
          email: null,
          phoneNumber: cleanUser,
          photoURL: null,
          providerId: 'password',
        };

        setSuccessMessage(
          lang === 'hi'
            ? 'खाता सफलतापूर्वक बन गया! आपका स्वागत है।'
            : 'Account created successfully! Welcome to Digital Hisaab.'
        );

        setTimeout(() => {
          onLoginSuccess(appUser);
        }, 400);
      } else {
        setErrorMessage(regResult.error || (lang === 'hi' ? 'रजिस्ट्रेशन विफल।' : 'Registration failed.'));
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(lang === 'hi' ? 'खाता बनाने में त्रुटि हुई।' : 'Error creating account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Find Account for Password Reset
  const handleForgotLookupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage(lang === 'hi' ? 'कृपया अपना मोबाइल/यूजरनेम दर्ज करें।' : 'Please enter your mobile or username.');
      return;
    }

    setIsLoading(true);
    try {
      const sec = await getAccountSecurityQuestions(cleanUser);
      if (!sec.found) {
        setErrorMessage(
          lang === 'hi'
            ? 'इस मोबाइल/यूजरनेम से कोई खाता नहीं मिला।'
            : 'No account found with this Mobile/Username.'
        );
        return;
      }

      setForgotQ1(sec.question1 || SECURITY_QUESTIONS_1[0]);
      setForgotQ2(sec.question2 || SECURITY_QUESTIONS_2[0]);
      setForgotStep('questions');
    } catch {
      setErrorMessage(lang === 'hi' ? 'खाता खोजने में त्रुटि हुई।' : 'Error looking up account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Answers & Set New Password
  const handleForgotResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotA1.trim()) {
      setErrorMessage(lang === 'hi' ? 'कृपया सुरक्षा उत्तर 1 दर्ज करें।' : 'Please enter Security Answer 1.');
      return;
    }
    if (forgotQ2 && !forgotA2.trim()) {
      setErrorMessage(lang === 'hi' ? 'कृपया सुरक्षा उत्तर 2 दर्ज करें।' : 'Please enter Security Answer 2.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMessage(lang === 'hi' ? 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' : 'New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(lang === 'hi' ? 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।' : 'New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const resetRes = await resetPasswordWithTwoSecurityAnswers(
        username.trim(),
        forgotA1.trim(),
        forgotA2.trim(),
        newPassword
      );

      if (resetRes.success) {
        setSuccessMessage(
          lang === 'hi'
            ? 'पासवर्ड सफलतापूर्वक बदल दिया गया! कृपया नए पासवर्ड से लॉगिन करें।'
            : 'Password reset successfully! Please login with your new password.'
        );
        setMode('login');
        setPassword('');
        setForgotStep('username');
      } else {
        setErrorMessage(resetRes.error || (lang === 'hi' ? 'सुरक्षा उत्तर गलत हैं।' : 'Incorrect security answers.'));
      }
    } catch (err) {
      setErrorMessage(lang === 'hi' ? 'पासवर्ड रीसेट करने में त्रुटि हुई।' : 'Error resetting password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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

      setSuccessMessage(lang === 'hi' ? 'Google लॉगिन सफल रहा!' : 'Google Sign-In Successful!');
      setTimeout(() => {
        onLoginSuccess(appUser);
      }, 300);
    } catch (err: any) {
      console.warn('Google Sign In Error:', err);
      setErrorMessage(
        err?.message?.includes('popup-closed-by-user')
          ? lang === 'hi'
            ? 'लॉगिन रद्द किया गया।'
            : 'Sign-in cancelled.'
          : lang === 'hi'
          ? 'Google लॉगिन में त्रुटि हुई।'
          : 'Google sign-in error.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Demo Account 1-Click
  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const demoUser = await createDemoAccount();
      setSuccessMessage(lang === 'hi' ? 'डेमो खाता लोड हो रहा है...' : 'Loading demo account...');
      setTimeout(() => {
        onLoginSuccess(demoUser);
      }, 300);
    } catch (err) {
      setErrorMessage('Failed to load demo account.');
      setIsLoading(false);
    }
  };

  // Handle Guest Mode 1-Click
  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const guestUser = await createQuickGuestAccount();
      setSuccessMessage(lang === 'hi' ? 'अतिथि खाता सक्रिय...' : 'Guest mode active...');
      setTimeout(() => {
        onLoginSuccess(guestUser);
      }, 300);
    } catch (err) {
      setErrorMessage('Failed to start guest session.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors">
      {/* Subtle Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Utilities */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-amber-500/20">
            ₹
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              {lang === 'hi' ? 'डिजिटल हिसाब' : 'Digital Hisaab'}
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {lang === 'hi' ? 'सुरक्षित खाता व ब्याज बही' : 'Secure Khata & Interest Ledger'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-2xs"
          >
            <Languages className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{lang === 'hi' ? 'English' : 'हिंदी'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-2xs"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl z-10 transition-colors">
        {/* Navigation Tabs (Login / Register) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-2xl mb-6 border border-slate-200 dark:border-slate-800/80">
            <button
              id="tab-mode-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'लॉगिन (Login)' : 'Sign In'}</span>
            </button>

            <button
              id="tab-mode-register"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'रजिस्टर (Sign Up)' : 'Create Account'}</span>
            </button>
          </div>
        )}

        {/* Title for Forgot Password */}
        {mode === 'forgot' && (
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'hi'
                ? 'सुरक्षा प्रश्नों के उत्तर देकर नया पासवर्ड बनाएं।'
                : 'Answer your security questions to create a new password.'}
            </p>
          </div>
        )}

        {/* Alerts / Error & Success */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === 'hi' ? 'मोबाइल नंबर / यूजरनेम' : 'Mobile / Username'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा. 9876543210 या rahul' : 'e.g. 9876543210 or username'}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {lang === 'hi' ? 'पासवर्ड (Password)' : 'Password'} *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotStep('username');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-98 shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'hi' ? 'लॉगिन हो रहा है...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'hi' ? 'लॉगिन करें' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'hi' ? 'पूरा नाम (Full Name)' : 'Full Name'} *
              </label>
              <input
                id="input-register-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={lang === 'hi' ? 'उदा. राहुल शर्मा' : 'e.g. Rahul Sharma'}
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'hi' ? 'मोबाइल नंबर / यूजरनेम' : 'Mobile / Username'} *
              </label>
              <input
                id="input-register-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'hi' ? 'पासवर्ड (Min 4)' : 'Password'} *
                </label>
                <input
                  id="input-register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'hi' ? 'पुष्टि पासवर्ड' : 'Confirm'} *
                </label>
                <input
                  id="input-register-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Security Questions */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'सुरक्षा प्रश्न (पासवर्ड रिकवरी)' : 'Security Questions'}</span>
              </div>

              <div>
                <select
                  value={question1}
                  onChange={(e) => setQuestion1(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 mb-1 focus:outline-none"
                >
                  {SECURITY_QUESTIONS_1.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  placeholder={lang === 'hi' ? 'उत्तर 1 दर्ज करें...' : 'Answer 1...'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <select
                  value={question2}
                  onChange={(e) => setQuestion2(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 mb-1 focus:outline-none"
                >
                  {SECURITY_QUESTIONS_2.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  placeholder={lang === 'hi' ? 'उत्तर 2 दर्ज करें...' : 'Answer 2...'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              id="btn-submit-register"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-98 shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'hi' ? 'खाता बन रहा है...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div>
            {forgotStep === 'username' && (
              <form onSubmit={handleForgotLookupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'hi' ? 'पंजीकृत मोबाइल / यूजरनेम दर्ज करें' : 'Enter Registered Mobile / Username'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition"
                >
                  {lang === 'hi' ? 'आगे बढ़ें →' : 'Continue →'}
                </button>
              </form>
            )}

            {forgotStep === 'questions' && (
              <form onSubmit={handleForgotResetSubmit} className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">{forgotQ1}</label>
                    <input
                      type="text"
                      required
                      value={forgotA1}
                      onChange={(e) => setForgotA1(e.target.value)}
                      placeholder={lang === 'hi' ? 'आपका उत्तर...' : 'Your answer...'}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {forgotQ2 && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">{forgotQ2}</label>
                      <input
                        type="text"
                        required
                        value={forgotA2}
                        onChange={(e) => setForgotA2(e.target.value)}
                        placeholder={lang === 'hi' ? 'आपका उत्तर...' : 'Your answer...'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'hi' ? 'पुष्टि करें' : 'Confirm'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition"
                >
                  {isLoading ? 'Resetting...' : lang === 'hi' ? 'नया पासवर्ड सहेजें' : 'Save New Password'}
                </button>
              </form>
            )}

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                {lang === 'hi' ? '← लॉगिन पेज पर वापस जाएं' : '← Back to Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* Divider & Other Sign-In Options */}
        {mode !== 'forgot' && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-bold uppercase">
                  {lang === 'hi' ? 'अन्य विकल्प' : 'or choose'}
                </span>
              </div>
            </div>

            {/* Google Login */}
            <button
              id="btn-google-login"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 dark:border-transparent font-bold text-xs flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer disabled:opacity-50 shadow-xs mb-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{lang === 'hi' ? 'Google से जारी रखें' : 'Continue with Google'}</span>
            </button>

            {/* Quick Demo & Guest Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-demo-login"
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Open Demo Account with Sample Data"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{lang === 'hi' ? 'डेमो खाता' : 'Demo Account'}</span>
              </button>

              <button
                id="btn-guest-login"
                type="button"
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Continue as Guest (Local Offline)"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{lang === 'hi' ? 'अतिथि मोड' : 'Guest Mode'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer Security Badge */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-6 z-10">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>
          {lang === 'hi'
            ? 'सुरक्षित एन्क्रिप्शन व अलग-अलग खाता डेटा अलगाव'
            : 'Encrypted Security & Isolated Khata Data'}
        </span>
      </div>
    </div>
  );
}
