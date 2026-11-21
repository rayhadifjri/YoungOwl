import { ModulePage } from '@/components/module-page';
import { MODULES } from '@/lib/modules';

export default function PersistencePage() {
  return <ModulePage module={MODULES.persistence!} />;
}
