'use client';

import { useState, type ChangeEvent, useMemo } from 'react';
import { Loader2, LogIn, LogOut, Plus, Users, UserCircle } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AccountSwitcher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [registerForm, setRegisterForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    staffCode: '',
    image: ''
  });
  const [signInForm, setSignInForm] = useState({ username: '', password: '' });
  const [imageName, setImageName] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setRegisterForm((prev) => ({ ...prev, image: '' }));
      setImageName('');
      return;
    }

    if (file.type !== 'image/png') {
      setRegisterError('Profile image must be a PNG file.');
      setRegisterForm((prev) => ({ ...prev, image: '' }));
      setImageName('');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setRegisterError('Profile image must be smaller than 2MB.');
      setRegisterForm((prev) => ({ ...prev, image: '' }));
      setImageName('');
      return;
    }

    setRegisterError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setRegisterForm((prev) => ({ ...prev, image: reader.result }));
        setImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const parseErrorMessage = (payload: unknown, fallback: string) => {
    if (!payload || typeof payload !== 'object') {
      return fallback;
    }

    if ('error' in payload) {
      const value = (payload as { error?: unknown }).error;
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object') {
        const fieldErrors = Object.values(value as Record<string, string[] | undefined>)
          .flat()
          .filter(Boolean);
        if (fieldErrors.length > 0) {
          return fieldErrors.join(' ');
        }
      }
    }

    return fallback;
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError(null);

    if (!registerForm.image) {
      setRegisterError('Please select a PNG profile image.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    setIsRegistering(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: registerForm.name,
          username: registerForm.username,
          password: registerForm.password,
          image: registerForm.image,
          staffCode: registerForm.staffCode
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = parseErrorMessage(payload, 'Registration failed.');
        throw new Error(message);
      }

      const result = await signIn('credentials', {
        username: registerForm.username,
        password: registerForm.password,
        redirect: false
      });

      if (result?.error) {
        throw new Error('Account created but sign-in failed. Please try signing in manually.');
      }

      router.refresh();
      setRegisterForm({ name: '', username: '', password: '', confirmPassword: '', staffCode: '', image: '' });
      setImageName('');
      setSignInForm({ username: '', password: '' });
      setMode('signin');
      setIsOpen(false);
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError(null);
    setIsSigningIn(true);

    try {
      const result = await signIn('credentials', {
        username: signInForm.username,
        password: signInForm.password,
        redirect: false
      });

      if (result?.error) {
        throw new Error('Invalid username or password.');
      }

      router.refresh();
      setSignInForm({ username: '', password: '' });
      setIsOpen(false);
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const userInitials = useMemo(() => {
    const name = session?.user?.name?.trim();
    if (!name) return 'U';
    const [first, second] = name.split(' ');
    if (first && second) {
      return `${first[0]}${second[0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [session?.user?.name]);

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
    setRegisterError(null);
    setSignInError(null);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="flex items-center gap-2"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {isAuthenticated ? (
          session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? 'Account avatar'}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
              {userInitials}
            </div>
          )
        ) : (
          <>
            <Users className="h-4 w-4" />
            <span className="text-sm">Account</span>
          </>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border/60 bg-popover p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <p className="text-sm font-semibold text-foreground">{isAuthenticated ? 'Your account' : 'Workspace access'}</p>
            {!isAuthenticated && (
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  type="button"
                  className={`transition ${mode === 'signin' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => {
                    setMode('signin');
                    setRegisterError(null);
                    setSignInError(null);
                  }}
                >
                  Sign in
                </button>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className={`transition ${mode === 'register' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => {
                    setMode('register');
                    setRegisterError(null);
                    setSignInError(null);
                  }}
                >
                  Create
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-3">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? 'Account avatar'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-10 w-10 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{session?.user?.name ?? 'Signed in'}</p>
                  <p className="text-xs text-muted-foreground">You are securely logged in.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => {
                  void signOut({ redirect: false });
                  setIsOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </div>
          ) : mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="mt-3 space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Username"
                  autoComplete="username"
                  value={signInForm.username}
                  onChange={(event) => setSignInForm((prev) => ({ ...prev, username: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Password"
                  type="password"
                  autoComplete="current-password"
                  value={signInForm.password}
                  onChange={(event) => setSignInForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
              </div>
              {signInError && <p className="text-xs text-red-400">{signInError}</p>}
              <Button type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign in
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setSignInError(null);
                  }}
                  className="font-medium text-foreground hover:underline"
                >
                  Create one
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-3 space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Display name"
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Username"
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Password"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Input type="file" accept="image/png" onChange={handleImageSelection} />
                {imageName && <p className="text-[11px] text-muted-foreground">Selected image: {imageName}</p>}
                {registerForm.image && (
                  <div className="flex items-center gap-2">
                    <img src={registerForm.image} alt="Selected profile preview" className="h-10 w-10 rounded-full object-cover" />
                    <p className="text-xs text-muted-foreground">Preview</p>
                  </div>
                )}
              </div>
              <Input
                placeholder="Staff access code"
                value={registerForm.staffCode}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, staffCode: event.target.value }))
                }
                required
              />
              {registerError && <p className="text-xs text-red-400">{registerError}</p>}
              <Button type="submit" className="w-full" disabled={isRegistering}>
                {isRegistering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create account
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setRegisterError(null);
                  }}
                  className="font-medium text-foreground hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
