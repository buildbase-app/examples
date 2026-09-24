'use client';

// Added for the BuildBase example: replaces Clerk's <SignOutButton />.
import { useSaaSAuth } from '@buildbase/sdk/react';

export const SignOutButton = (props: { label: string }) => {
  const { signOut } = useSaaSAuth();

  return (
    <button
      className="border-none text-gray-700 hover:text-gray-900"
      type="button"
      onClick={async () => {
        await signOut();
        window.location.assign('/');
      }}
    >
      {props.label}
    </button>
  );
};
