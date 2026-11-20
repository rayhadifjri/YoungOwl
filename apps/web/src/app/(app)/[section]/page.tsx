import { notFound } from 'next/navigation';
import { Construction } from 'lucide-react';
import { NAV } from '@/lib/nav';
import { Card, CardContent } from '@/components/ui/card';

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = NAV.find((n) => n.href === `/${section}` && n.phase);
  if (!item) notFound();
  const Icon = item.icon;
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Icon className="h-10 w-10 text-cyan-400" />
          <h1 className="text-xl font-semibold text-white">{item.label}</h1>
          <p className="max-w-md text-sm text-slate-400">{item.blurb}</p>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
            <Construction className="h-3.5 w-3.5" /> Arrives in {item.phase}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
