'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Loader2, LogOut, Plus, Users } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AccountRecord {
  id: string;
  name: string | null;
  image: string | null;
  createdAt: string;
}

export function AccountSwitcher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', image: '', staffCode: '' });
  const [imageName, setImageName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  const fetchAccounts = useCallback(async () => {
    const response = await fetch('/api/accounts');
    if (!response.ok) {
      throw new Error('Failed to load accounts');
    }
    const data = (await response.json()) as { accounts: AccountRecord[] };
    setAccounts(data.accounts);
  }, []);

  useEffect(() => {
    fetchAccounts().catch((err) => {
      console.error(err);
      setError('Unable to load accounts.');
    });
  }, [fetchAccounts]);

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.image) {
      setError('Please select a PNG profile image.');
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
        body: JSON.stringify({ name: form.name, image: form.image, staffCode: form.staffCode })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload.error === 'string' ? payload.error : 'Registration failed.';
        throw new Error(message);
      }

      const { user } = (await response.json()) as { user: AccountRecord };
      await fetchAccounts();
      const result = await signIn('credentials', { userId: user.id, redirect: false });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.refresh();
      setForm({ name: '', image: '', staffCode: '' });
      setImageName('');
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccount = async (accountId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn('credentials', { userId: accountId, redirect: false });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.refresh();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setForm((prev) => ({ ...prev, image: '' }));
      setImageName('');
      return;
    }

    if (file.type !== 'image/png') {
      setError('Profile image must be a PNG file.');
      setForm((prev) => ({ ...prev, image: '' }));
      setImageName('');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, image: reader.result }));
        setImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentAccount = useMemo(() => {
    if (!session?.user?.id) return null;
    return accounts.find((account) => account.id === session.user?.id) ?? null;
  }, [accounts, session?.user?.id]);

  const activeAccountName = currentAccount?.name ?? session?.user?.name ?? 'Select account';
  const activeAccountImage = currentAccount?.image ?? session?.user?.image ?? null;
  const hasActiveAccount = !!(currentAccount || session?.user?.id);
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

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2"
      >
        {isLoading ? (
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
            <p className="text-sm font-semibold text-foreground">Workspace accounts</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            {accounts.length === 0 && <p className="text-xs text-muted-foreground">No accounts yet.</p>}
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => void handleSelectAccount(account.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-left transition hover:border-accent hover:bg-accent/10"
              >
                {account.image ? (
                  <img
                    src={account.image}
                    alt={account.name ?? 'Account avatar'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                    {(account.name ?? '?').slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{account.name ?? 'Unnamed analyst'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Joined {new Date(account.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={(event) => void handleCreateAccount(event)} className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create account</p>
            <Input
              placeholder="Display name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <div className="space-y-2">
              <Input type="file" accept="image/png" onChange={handleImageSelection} />
              {imageName && (
                <p className="text-[11px] text-muted-foreground">Selected image: {imageName}</p>
              )}
              {form.image && (
                <div className="flex items-center gap-2">
                  <img src={form.image} alt="Selected profile preview" className="h-10 w-10 rounded-full object-cover" />
                  <p className="text-xs text-muted-foreground">Preview</p>
                </div>
              )}
            </div>
            <Input
              placeholder="Staff access code"
              value={form.staffCode}
              onChange={(event) => setForm((prev) => ({ ...prev, staffCode: event.target.value }))}
              required
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create & use account
            </Button>
          </form>

          {isAuthenticated && (
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full justify-center text-sm"
              onClick={() => {
                void signOut({ redirect: false });
                setIsOpen(false);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
