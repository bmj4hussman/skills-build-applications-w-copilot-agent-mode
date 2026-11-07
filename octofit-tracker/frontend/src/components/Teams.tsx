import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = {
  name?: string;
  members?: Array<string | { toString: () => string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => {
        if (!cancelled) {
          setTeams(data.teams ?? []);
          setLoading(false);
        }
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(`Unable to load teams. ${requestError.message}`);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      loading={loading}
      error={error}
      empty={teams.length === 0 && !loading && !error}
      emptyMessage="No teams found."
    >
      <ul className="list-unstyled mb-0">
        {teams.map((team, index) => (
          <li key={`${team.name ?? 'team'}-${index}`} className="border-bottom py-2">
            <strong>{team.name ?? 'Unknown team'}</strong>
            <div>{(team.members ?? []).map((member) => String(member)).join(', ') || 'No members yet'}</div>
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
