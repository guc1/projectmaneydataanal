'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Loader2, LogOut, Plus, Users } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AuthMode = 'login' | 'register';

interface RegisterFormState {
  username: string;
  password: string;
  staffCode: string;
  image: string;
}

interface LoginFormState {
  username: string;
  password: string;
}

function formatErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as { error?: unknown };
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const values = Object.values(error as Record<string, unknown>);
      const message = values
        .flatMap((value) => {
          if (typeof value === 'string') return value;
          if (Array.isArray(value)) {
            return value.filter((item): item is string => typeof item === 'string');
          }
          return [];
        })
        .join(' ');
      if (message) {
        return message;
      }
    }
  }

  return fallback;
}

export function AccountSwitcher() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    username: '',
    password: '',
    staffCode: '',
    image: ''
  });
  const [registerImageName, setRegisterImageName] = useState('');
  const [loginForm, setLoginForm] = useState<LoginFormState>({ username: '', password: '' });

  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  const activeAccountName = session?.user?.name ?? session?.user?.username ?? 'Sign in';
  const activeAccountImage = session?.user?.image ?? null;
  const hasActiveAccount = !!session?.user?.id;

  const activeInitials = useMemo(() => {
    if (!hasActiveAccount) {
      return 'NA';
    }

    return activeAccountName
      .split(' ')
      .map((part) => part.trim().charAt(0))
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [activeAccountName, hasActiveAccount]);

  const togglePanel = () => {
    setError(null);
    setIsOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!registerForm.image) {
      setError('Please select a PNG profile image.');
      return;
    }

    const normalizedUsername = registerForm.username.trim().toLowerCase();

    if (!normalizedUsername) {
      setError('Enter a valid username.');
      return;
    }

    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: registerForm.username.trim(),
          password: registerForm.password,
          staffCode: registerForm.staffCode.trim(),
          image: registerForm.image
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(formatErrorMessage(payload, 'Registration failed.'));
      }

      const signInResult = await signIn('credentials', {
        username: normalizedUsername,
        password: registerForm.password,
        redirect: false
      });

      if (signInResult?.error) {
        const message =
          signInResult.error === 'CredentialsSignin'
            ? 'Invalid username or password.'
            : signInResult.error;
        throw new Error(message);
      }

      await update();
      router.refresh();
      setRegisterForm({ username: '', password: '', staffCode: '', image: '' });
      setRegisterImageName('');
      setMode('login');
      closePanel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = loginForm.username.trim().toLowerCase();

    if (!normalizedUsername) {
      setError('Enter your username to continue.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const signInResult = await signIn('credentials', {
        username: normalizedUsername,
        password: loginForm.password,
        redirect: false
      });

      if (signInResult?.error) {
        const message =
          signInResult.error === 'CredentialsSignin'
            ? 'Invalid username or password.'
            : signInResult.error;
        throw new Error(message);
      }

      await update();
      router.refresh();
      setLoginForm({ username: '', password: '' });
      closePanel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setRegisterForm((prev) => ({ ...prev, image: '' }));
      setRegisterImageName('');
      return;
    }

    if (file.type !== 'image/png') {
      setError('Profile image must be a PNG file.');
      setRegisterForm((prev) => ({ ...prev, image: '' }));
      setRegisterImageName('');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setRegisterForm((prev) => ({ ...prev, image: reader.result }));
        setRegisterImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={togglePanel}
        className="flex items-center gap-2"
      >
        {status === 'loading' || isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : activeAccountImage ? (
          <img src={activeAccountImage} alt={activeAccountName} className="h-6 w-6 rounded-full object-cover" />
        ) : hasActiveAccount ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-foreground/80">
            {activeInitials}
          </div>
        ) : (
          <Users className="h-4 w-4" />
        )}
        <span className="text-sm font-medium text-foreground">
          {status === 'loading' ? 'Loading…' : activeAccountName}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border/60 bg-popover p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <p className="text-sm font-semibold text-foreground">Workspace access</p>
            <button
              type="button"
              onClick={closePanel}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Close
            </button>
          </div>

          {isAuthenticated ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                {activeAccountImage ? (
                  <img src={activeAccountImage} alt={activeAccountName} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-foreground/80">
                    {activeInitials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeAccountName}</p>
                  <p className="text-xs text-muted-foreground">@{session?.user?.username}</p>
                  <p className="text-[11px] text-muted-foreground">You are signed in to this workspace.</p>
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center text-sm"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  setError(null);
                  try {
                    await signOut({ redirect: false });
                    await update();
                    router.refresh();
                    closePanel();
                  } catch (err) {
                    console.error(err);
                    setError('Failed to sign out.');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`text-xs font-medium transition ${
                    mode === 'login' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign in
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`text-xs font-medium transition ${
                    mode === 'register' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Create account
                </button>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-2">
                  <Input
                    placeholder="Username"
                    value={loginForm.username}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                    required
                    autoComplete="username"
                    disabled={isLoading}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-2">
                  <Input
                    placeholder="Choose a username"
                    value={registerForm.username}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                    required
                    autoComplete="username"
                    disabled={isLoading}
                  />
                  <Input
                    type="password"
                    placeholder="Create a password"
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <Input
                    placeholder="Staff access code"
                    value={registerForm.staffCode}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, staffCode: event.target.value }))}
                    required
                    disabled={isLoading}
                  />
                  <div className="space-y-2">
                    <Input type="file" accept="image/png" onChange={handleImageSelection} disabled={isLoading} />
                    {registerImageName && (
                      <p className="text-[11px] text-muted-foreground">Selected image: {registerImageName}</p>
                    )}
                    {registerForm.image && (
                      <div className="flex items-center gap-2">
                        <img src={registerForm.image} alt="Selected profile preview" className="h-10 w-10 rounded-full object-cover" />
                        <p className="text-xs text-muted-foreground">Preview</p>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Creating…' : 'Create & sign in'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
