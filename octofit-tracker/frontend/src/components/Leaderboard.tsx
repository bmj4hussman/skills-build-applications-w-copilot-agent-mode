import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName?: string;
  totalPoints?: number;
  rank?: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then((data) => {
        if (!cancelled) {
          setLeaderboard(data.leaderboard ?? []);
          setLoading(false);
        }
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(`Unable to load leaderboard. ${requestError.message}`);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      loading={loading}
      error={error}
      empty={leaderboard.length === 0 && !loading && !error}
      emptyMessage="No leaderboard rankings yet."
    >
      <ol className="mb-0 ps-3">
        {leaderboard.map((entry, index) => (
          <li key={`${entry.teamName ?? 'team'}-${entry.rank ?? index}`}>
            {entry.teamName ?? 'Unknown team'} — {entry.totalPoints ?? 0} pts
          </li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
