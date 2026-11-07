import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title?: string;
  focus?: string;
  reason?: string;
};

export default function Workouts() {
  const [workouts, setWorkouts] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com')
      .then((data) => {
        if (!cancelled) {
          setWorkouts(data.suggestions ?? []);
          setLoading(false);
        }
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(`Unable to load workout suggestions. ${requestError.message}`);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loading={loading}
      error={error}
      empty={workouts.length === 0 && !loading && !error}
      emptyMessage="No workout suggestions available."
    >
      <ul className="list-unstyled mb-0">
        {workouts.map((workout, index) => (
          <li key={`${workout.title ?? 'workout'}-${index}`} className="border-bottom py-2">
            <strong>{workout.title ?? 'Workout'}</strong>
            {workout.focus ? <div>{workout.focus}</div> : null}
            {workout.reason ? <small>{workout.reason}</small> : null}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
