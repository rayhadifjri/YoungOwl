import { ModulePage } from '@/components/module-page';
import { MODULES } from '@/lib/modules';

export default function VulnerabilitiesPage() {
  return <ModulePage module={MODULES.vulnerabilities!} />;
}
