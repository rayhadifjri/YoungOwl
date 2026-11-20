import { notFound } from 'next/navigation';
import { NAV } from '@/lib/nav';

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = NAV.find((n) => n.href === `/${section}` && n.phase);
  if (!item) notFound();
  const Icon = item.icon;
  return (
    <div className="mx-auto max-w-xl pt-16">
      <div className="glass flex flex-col items-center gap-4 px-8 py-14 text-center">
        <Icon className="h-8 w-8 text-cyan-600" strokeWidth={1.5} />
        <h1 className="text-2xl font-light tracking-tight text-slate-900">{item.label}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">{item.blurb}</p>
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs text-slate-700">
          Arrives in {item.phase}
        </span>
      </div>
    </div>
  );
}
