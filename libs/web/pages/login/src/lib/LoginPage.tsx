import {
  Alert,
  AlertColor,
  Button,
  Card,
  CardContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { emailSchema, newPasswordSchema, userNameSchema } from '@nba/dtos-auth';
import { ErrorCode } from '@nba/enums';
import {
  ApiError,
  firebaseAuth,
  firebaseCodeOf,
  invalidFields,
  signOutOfFirebase,
  useLogin,
  useSession,
  useSignUp,
} from '@nba/web-core';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router';
import { object, ref, string } from 'yup';
import type { LoginField, LoginStep } from './types';
import './login-page.scss';

const EMPTY: Record<LoginField, string> = {
  name: '',
  email: '',
  password: '',
  repeatPassword: '',
};

// The fields of each step with a form. Firebase checks the password; a new one must pass ours first, typed twice
// (a typo would lock them out of the new account until they reset it).
const schemas = {
  login: object({ email: emailSchema, password: string().required() }),
  signUp: object({
    name: userNameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    repeatPassword: string().oneOf([ref('password')]),
  }),
  name: object({ name: userNameSchema }),
  reset: object({ email: emailSchema }),
};

const titles: Record<LoginStep, string> = {
  login: 'Welcome back',
  signUp: 'Create your account',
  verify: 'Verify your email',
  name: 'Finish signing up',
  reset: 'Reset password',
};

const labels: Record<LoginField, string> = {
  name: 'Name',
  email: 'Email',
  password: 'Password',
  repeatPassword: 'Confirm password',
};

const submitLabels: Record<LoginStep, string> = {
  login: 'Log in',
  signUp: 'Sign up',
  verify: 'Continue',
  name: 'Sign up',
  reset: 'Send link',
};

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const INVALID_CREDENTIALS = 'Wrong email or password';
const EMAIL_TAKEN = 'This email is already registered';
const INVALID_EMAIL = 'Enter a valid email address';

const fieldMessage = (field: LoginField, step: LoginStep): string => {
  if (field === 'email') return INVALID_EMAIL;
  if (field === 'password' && step === 'signUp') {
    return 'Password must be at least 8 characters';
  }
  if (field === 'repeatPassword') return "The passwords don't match";
  return 'Required';
};

// Firebase's refusals as the page says them. With email enumeration protection (new projects' default), a wrong
// password and an unknown email are both invalid-credential.
const firebaseMessages: Record<string, string> = {
  'auth/invalid-credential': INVALID_CREDENTIALS,
  'auth/invalid-login-credentials': INVALID_CREDENTIALS,
  'auth/wrong-password': INVALID_CREDENTIALS,
  'auth/user-not-found': INVALID_CREDENTIALS,
  'auth/email-already-in-use': EMAIL_TAKEN,
  'auth/invalid-email': INVALID_EMAIL,
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/user-disabled': 'This account is disabled.',
  'auth/network-request-failed':
    "Couldn't reach the server. Check your connection and try again.",
};

// From the API, a 409 is an email whose user is linked to another account.
const errorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.status === 409
      ? EMAIL_TAKEN
      : GENERIC_ERROR
    : (firebaseMessages[firebaseCodeOf(error) ?? ''] ?? GENERIC_ERROR);

interface Notice {
  severity: AlertColor;
  text: string;
}

// Log in or sign up (the card's two tabs) with Firebase (email and password), then with the API, whose session sends
// the page on (the redirect below). Every account's email is verified first (Firebase emails a link), and an account
// that has no user yet (its sign-up never reached the API) is asked for a name.
export function LoginPage() {
  const session = useSession();
  const login = useLogin();
  const signUp = useSignUp();
  const [step, setStep] = useState<LoginStep>('login');
  const [values, setValues] = useState(EMPTY);
  const [invalid, setInvalid] = useState<LoginField[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isBusy, setBusy] = useState(false);
  // The Firebase account the steps after a form are about, and the name its sign-up gave (null: it logged in).
  const [account, setAccount] = useState<User | null>(null);
  const [signUpName, setSignUpName] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  const go = (next: LoginStep) => {
    setStep(next);
    setInvalid([]);
    setNotice(null);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
    } catch (error) {
      setNotice({ severity: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  // In with the account (its session), or to the step it needs first.
  const enter = async (user: User, name: string | null) => {
    setAccount(user);
    const idToken = await user.getIdToken();
    try {
      if (name === null) await login.mutateAsync({ idToken });
      else await signUp.mutateAsync({ idToken, name });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === ErrorCode.EMAIL_NOT_VERIFIED) return go('verify');
      if (error.status === 404) return go('name');
      throw error;
    }
  };

  // Once the link was opened, Firebase says so, and a new token too (the one before still says unverified).
  const continueVerified = async () => {
    const user = account as User;
    await user.reload();
    if (!user.emailVerified) {
      return setNotice({
        severity: 'info',
        text: "Your email isn't verified yet. Open the link we sent, then try again.",
      });
    }
    await user.getIdToken(true);
    await enter(user, signUpName);
  };

  const resend = () =>
    run(async () => {
      await sendEmailVerification(account as User);
      setNotice({ severity: 'success', text: 'We sent a new link' });
    });

  const backToLogin = () => {
    if (account) signOutOfFirebase().catch(() => undefined);
    setAccount(null);
    go('login');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step === 'verify') return run(continueVerified);
    const fields = await invalidFields<LoginField>(schemas[step], values);
    setInvalid(fields);
    if (fields.length) return;
    const email = emailSchema.cast(values.email);
    await run(async () => {
      switch (step) {
        case 'login': {
          const { user } = await signInWithEmailAndPassword(
            await firebaseAuth(),
            email,
            values.password,
          );
          setSignUpName(null);
          return enter(user, null);
        }
        case 'signUp': {
          const { user } = await createUserWithEmailAndPassword(
            await firebaseAuth(),
            email,
            values.password,
          );
          await sendEmailVerification(user);
          setAccount(user);
          setSignUpName(values.name);
          return go('verify');
        }
        case 'name':
          return enter(account as User, values.name);
        case 'reset':
          // The same answer whether or not the email has an account.
          await sendPasswordResetEmail(await firebaseAuth(), email);
          return setNotice({
            severity: 'success',
            text: 'If this email has an account, we sent it a link to reset the password.',
          });
      }
    });
  };

  const field = (name: LoginField, type: string, autoComplete: string) => (
    <TextField
      label={labels[name]}
      type={type}
      autoComplete={autoComplete}
      value={values[name]}
      onChange={(event) => setValues({ ...values, [name]: event.target.value })}
      error={invalid.includes(name)}
      helperText={invalid.includes(name) ? fieldMessage(name, step) : ' '}
      fullWidth
    />
  );

  const isForm = step === 'login' || step === 'signUp';

  return (
    <main className="login-page">
      <Card className="login-page__card">
        <CardContent>
          <Stack component="form" spacing={1} onSubmit={submit} noValidate>
            <Typography variant="h5" component="h1">
              {titles[step]}
            </Typography>
            {isForm && (
              <Tabs
                value={step}
                onChange={(_, next: LoginStep) => go(next)}
                variant="fullWidth"
                className="login-page__tabs"
              >
                <Tab
                  value="login"
                  label="Log in"
                  id="login-tab-login"
                  aria-controls="login-panel"
                />
                <Tab
                  value="signUp"
                  label="Sign up"
                  id="login-tab-signUp"
                  aria-controls="login-panel"
                />
              </Tabs>
            )}
            {/* Keyed by the step, so each step's fields come in anew: switching tabs shows. */}
            <Stack
              key={step}
              spacing={1}
              className="login-page__step"
              role={isForm ? 'tabpanel' : undefined}
              id={isForm ? 'login-panel' : undefined}
              aria-labelledby={isForm ? `login-tab-${step}` : undefined}
            >
              {step === 'verify' && (
                <div className="login-page__text">
                  <Typography>We sent a verification link to</Typography>
                  <Typography variant="subtitle1">{account?.email}</Typography>
                  <Typography color="text.secondary">
                    Open it, then come back here and click Continue.
                  </Typography>
                </div>
              )}
              {step === 'name' && (
                <Typography className="login-page__text">
                  All that's left is your name.
                </Typography>
              )}
              {step === 'reset' && (
                <Typography className="login-page__text">
                  We'll send you a link to choose a new password.
                </Typography>
              )}
              {(step === 'signUp' || step === 'name') &&
                field('name', 'text', 'name')}
              {(isForm || step === 'reset') && field('email', 'email', 'email')}
              {isForm &&
                field(
                  'password',
                  'password',
                  step === 'login' ? 'current-password' : 'new-password',
                )}
              {step === 'signUp' &&
                field('repeatPassword', 'password', 'new-password')}
              {step === 'login' && (
                <Button
                  size="small"
                  className="login-page__forgot"
                  onClick={() => go('reset')}
                >
                  Forgot your password?
                </Button>
              )}
              {notice && (
                <Alert severity={notice.severity}>{notice.text}</Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isBusy}
              >
                {submitLabels[step]}
              </Button>
              {step === 'verify' && (
                <Button variant="outlined" onClick={resend} disabled={isBusy}>
                  Send the link again
                </Button>
              )}
              {!isForm && (
                <Button onClick={backToLogin} disabled={isBusy}>
                  Back to log in
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </main>
  );
}
