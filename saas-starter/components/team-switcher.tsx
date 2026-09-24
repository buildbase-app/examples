'use client';

// Added for the BuildBase example: the SDK's WorkspaceSwitcher. Its menu lists
// the user's teams (workspaces) and opens BuildBase's prebuilt settings
// screens - profile, security, devices, members, subscription, usage, credits
// and the rest - with no UI of your own.
import { WorkspaceSwitcher } from '@buildbase/sdk/react';
import { Building2, ChevronsUpDown } from 'lucide-react';

export function TeamSwitcher() {
  return (
    <WorkspaceSwitcher
      trigger={(isLoading, currentWorkspace) =>
        isLoading ? (
          <div className="flex h-12 animate-pulse items-center gap-2 rounded-md bg-gray-100 px-3 text-sm text-gray-400">
            Loading team...
          </div>
        ) : (
          <div className="group flex h-12 w-full cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-left transition-colors hover:bg-gray-100">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-orange-100 text-orange-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {currentWorkspace?.name ?? 'Select a team'}
              </p>
              <p className="text-xs text-gray-500">Team and settings</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600" />
          </div>
        )
      }
    />
  );
}
