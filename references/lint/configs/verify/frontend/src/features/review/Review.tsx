import { useState } from 'react';

export function statusCell(row: { done: boolean }): string {
  const [seen] = useState(false);
  return row.done && seen ? 'done' : 'open';
}

export function Review({ loading, failed }: { loading: boolean; failed: boolean }) {
  return (
    <div>
      {loading ? <span>Loading</span> : failed ? <span>Failed</span> : <span>Ready</span>}
      <img src="/court.jpg" alt="Court" />
      <div><div><div><div><div><div><p>deep</p></div></div></div></div></div></div>
    </div>
  );
}
