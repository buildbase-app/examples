'use client';

import { useSaaSAuth, WorkspaceSwitcher } from '@buildbase/sdk/react';
import Link from 'next/link';

export function AuthPanel() {
  const { isLoading, isAuthenticated, user, signIn, signOut } = useSaaSAuth();

  if (isLoading) {
    return <section className="card muted">Checking your session...</section>;
  }

  if (isAuthenticated && user) {
    return (
      <section className="card">
        <p className="muted">Signed in as</p>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <div className="switcher">
          {/* The SDK's switcher: your workspaces, and every prebuilt settings
              screen (profile, security, devices, members, billing...). */}
          <WorkspaceSwitcher
            trigger={(isLoading, workspace) => (
              <span className="button secondary block">
                {isLoading
                  ? 'Loading workspace...'
                  : `${workspace?.name ?? 'Workspace'} · settings ▾`}
              </span>
            )}
          />
        </div>
        <div className="row">
          <Link className="button" href="/profile">
            Server-rendered profile
          </Link>
          <button className="button secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <p>You are signed out.</p>
      <button className="button" onClick={() => signIn()}>
        Sign in
      </button>
    </section>
  );
}
