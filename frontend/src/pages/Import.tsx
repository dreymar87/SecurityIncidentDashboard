import { TopBar } from '../components/layout/TopBar';
import { ImportWizard } from '../components/imports/ImportWizard';
import { useImportJobs } from '../api/hooks';
import { ImportJob } from '../api/client';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Loader, Clock } from 'lucide-react';

const STATUS_ICON: Record<string, React.ReactNode> = {
  done: <CheckCircle size={13} className="text-green-400" />,
  failed: <XCircle size={13} className="text-red-400" />,
  processing: <Loader size={13} className="text-sky-400 animate-spin" />,
  pending: <Clock size={13} className="text-gray-400" />,
};

export function Import() {
  const { data: jobs } = useImportJobs();

  return (
    <div>
      <TopBar title="Import Data" />
      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ImportWizard />
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Import History</h3>
          {(!jobs || jobs.length === 0) && (
            <p className="text-xs text-gray-500 text-center py-6">No import jobs yet.</p>
          )}
          <div className="space-y-2">
            {(jobs || []).map((job: ImportJob) => (
              <div key={job.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-800/50">
                {STATUS_ICON[job.status] || STATUS_ICON.pending}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-300 truncate">{job.filename}</p>
                  <p className="text-xs text-gray-500 capitalize">{job.type} · {job.status}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {job.status === 'done' && (
                    <p className="text-xs font-mono text-green-400">{job.records_imported}/{job.records_total}</p>
                  )}
                  <p className="text-xs text-gray-600">
                    {format(new Date(job.created_at), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
