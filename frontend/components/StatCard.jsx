export default function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow-sm">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</div> : null}
    </div>
  );
}
