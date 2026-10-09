import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Placeholder for features that are out of scope (integrations, live bot, team, settings). */
export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-surface p-6 text-center shadow-xs sm:p-10">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
          <Icon className="size-6" aria-hidden />
        </div>
        <span className="mt-5 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
          Coming soon
        </span>
        <h2 className="mt-3 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
      </div>
    </div>
  );
}
