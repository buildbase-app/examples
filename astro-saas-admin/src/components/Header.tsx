import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Member } from "@/lib/buildbase";

const links = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
];

// Changed for the BuildBase example: who is signed in, their role in the admin
// workspace, and a sign-out that ends the BuildBase session.
export function Header({
  currentPath,
  member,
}: {
  currentPath: string;
  member: Member | null;
}) {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6 h-16">
      <a href="/" className="text-sm font-bold leading-none text-foreground">
        SaaS Admin Template
      </a>
      {links.map((link) => (
        <a
          className={cn(
            "text-sm font-medium leading-none text-foreground",
            currentPath === link.href
              ? "text-foreground"
              : "text-muted-foreground",
          )}
          href={link.href}
          aria-current={currentPath === link.href ? "page" : undefined}
        >
          {link.label}
        </a>
      ))}
      <span className="flex-1" />
      {member && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground" id="signed-in-as">
            {member.name ?? member.email}
          </span>
          {member.role && (
            <span className="rounded-md border px-2 py-0.5 text-xs font-medium" id="role">
              {member.role}
            </span>
          )}
          <form method="post" action="/auth/sign-out">
            <button className={buttonVariants({ variant: "outline", size: "sm" })} type="submit">
              Sign out
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
