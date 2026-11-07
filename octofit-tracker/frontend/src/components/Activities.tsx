import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = {
  type?: string;
  minutes?: number;
  points?: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ activities: Activity[] }>('/api/activities')
      .then((data) => {
        if (!cancelled) {
          setActivities(data.activities ?? []);
          setLoading(false);
        }
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(`Unable to load activities. ${requestError.message}`);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      loading={loading}
      error={error}
      empty={activities.length === 0 && !loading && !error}
      emptyMessage="No activities found."
    >
      <ul className="list-unstyled mb-0">
        {activities.map((activity, index) => (
          <li key={`${activity.type ?? 'activity'}-${index}`} className="border-bottom py-2">
            <strong>{activity.type ?? 'Activity'}</strong> · {activity.minutes ?? 0} min · {activity.points ?? 0} pts
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
