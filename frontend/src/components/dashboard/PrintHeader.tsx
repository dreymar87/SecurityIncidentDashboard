import { format } from 'date-fns';

export function PrintHeader() {
  return (
    <div
      className="print-only hidden mb-6 pb-4 border-b border-gray-300"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SecureSight Security Report</h1>
          <p className="text-sm text-gray-500 mt-1">Security Intelligence Dashboard</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Generated: {format(new Date(), 'MMMM d, yyyy')}</p>
          <p className="text-xs mt-0.5">Confidential — Internal Use Only</p>
        </div>
      </div>
    </div>
  );
}
