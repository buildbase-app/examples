'use client';

// Added for the BuildBase example: replaces Clerk's <UserProfile />. The
// screens themselves come from the SDK and open in its settings dialog.
import { useSaaSAuth, WorkspaceSwitcher } from '@buildbase/sdk/react';

const SECTIONS = [
  ['profile', 'Profile'],
  ['security', 'Security and passkeys'],
  ['devices', 'Signed-in devices'],
  ['general', 'Workspace'],
  ['users', 'Members'],
  ['subscription', 'Plan and billing'],
] as const;

export const AccountPanel = () => {
  const { openWorkspaceSettings } = useSaaSAuth();

  return (
    <div className="space-y-6">
      <WorkspaceSwitcher
        trigger={(isLoading, currentWorkspace) => (
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            {isLoading ? 'Loading workspaces…' : (currentWorkspace?.name ?? 'Choose a workspace')}
          </button>
        )}
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        {SECTIONS.map(([section, label]) => (
          <li key={section}>
            <button
              type="button"
              onClick={() => {
                openWorkspaceSettings(section);
              }}
              className="w-full rounded-md border border-gray-200 px-4 py-3 text-left text-sm hover:bg-gray-50"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
