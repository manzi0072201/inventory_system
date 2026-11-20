import Link from "next/link";
import { Icon } from "./ui/icon";

type SectionPlaceholderProps = {
  title: string;
};

export function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-10 sm:p-16 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 text-brand-600 flex items-center justify-center">
        <Icon name="stock" className="w-7 h-7" />
      </div>
      <h1 className="mt-4 text-lg font-bold text-slate-800 tracking-tight">
        {title}
      </h1>
      <p className="mt-1 text-xs font-medium text-slate-400 max-w-sm mx-auto">
        This section is not built yet. The dashboard is ready — this page will
        be implemented next.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-sm shadow-brand-500/20 transition-colors"
      >
        <Icon name="arrowRight" className="w-3.5 h-3.5 rotate-180" />
        Back to Dashboard
      </Link>
    </section>
  );
}
