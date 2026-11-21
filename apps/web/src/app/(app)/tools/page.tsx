import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/form';
import { isLabMode } from '@/lib/lab';
import { FileShare, HostLookup, TargetSearch } from './lab-tools';

export const dynamic = 'force-dynamic';

export default function ToolsPage() {
  if (!isLabMode()) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Lab tools"
        subtitle="Quick utilities for the team: search targets, look up hosts, open shared files."
      />
      <TargetSearch />
      <HostLookup />
      <FileShare />
    </div>
  );
}
