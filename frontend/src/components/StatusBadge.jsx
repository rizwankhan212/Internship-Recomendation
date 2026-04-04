export default function StatusBadge({ status }) {
  const map = {
    pending:      { label: 'Pending',      cls: 'badge-pending' },
    shortlisted:  { label: 'Shortlisted',  cls: 'badge-shortlisted' },
    selected:     { label: '✓ Selected',   cls: 'badge-selected' },
    not_selected: { label: '✗ Rejected',   cls: 'badge-not_selected' },
  };
  const item = map[status] || { label: status, cls: 'badge-pending' };
  return <span className={`badge ${item.cls}`}>{item.label}</span>;
}
