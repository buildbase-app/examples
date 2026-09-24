"use client";

// Added for the BuildBase example: the SDK's WorkspaceSwitcher. Its menu lists
// the user's workspaces and opens BuildBase's prebuilt settings screens -
// profile, security, devices, members, subscription, usage, credits and the
// rest - with no UI of your own.
import { WorkspaceSwitcher as BuildBaseWorkspaceSwitcher } from "@buildbase/sdk/react";
import { Building2, ChevronsUpDown } from "lucide-react";

export function WorkspaceSwitcher() {
  return (
    <div className="mb-1 group-data-[collapsible=icon]:hidden">
      <BuildBaseWorkspaceSwitcher
        trigger={(isLoading, currentWorkspace) =>
          isLoading ? (
            <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/60" />
          ) : (
            <div
              className="group flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-sidebar-accent"
              data-testid="workspace-switcher"
            >
              <Building2 className="size-4 shrink-0 text-sidebar-foreground/60" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-sidebar-foreground/80">
                {currentWorkspace?.name ?? "Select a workspace"}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70" />
            </div>
          )
        }
      />
    </div>
  );
}
