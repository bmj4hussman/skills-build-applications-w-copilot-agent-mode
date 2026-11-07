import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function toObjectId(value: unknown, label: string) {
  if (value == null || typeof value === 'string' && value.trim() === '') {
    throw badRequest(`${label} is required`);
  }
  const candidate = String(value);
  if (!mongoose.Types.ObjectId.isValid(candidate)) {
    throw badRequest(`${label} must be a valid MongoDB ObjectId`);
  }
  return new mongoose.Types.ObjectId(candidate);
}

function mapTypeToFocus(type: string) {
  const normalized = type.toLowerCase();
  if (['run', 'cycle', 'walk', 'cardio', 'endurance'].includes(normalized)) return 'endurance';
  if (['lift', 'strength', 'power', 'sprint'].includes(normalized)) return 'strength';
  if (['mobility', 'stretch', 'yoga'].includes(normalized)) return 'mobility';
  return normalized || 'endurance';
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity payload is required');
  }

  const payload = input as Record<string, unknown>;
  const userId = toObjectId(payload.userId ?? payload.user, 'userId');
  const teamId = toObjectId(payload.teamId ?? payload.team, 'teamId');
  const type = String(payload.type ?? '').trim().toLowerCase();
  const minutes = Number(payload.minutes ?? 0);

  if (!type) {
    throw badRequest('Activity type is required');
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Activity minutes must be a positive number');
  }

  const user = await User.findById(userId);
  const team = await Team.findById(teamId);
  if (!user || !team) {
    throw badRequest('Activity user and team must exist');
  }

  const points = Math.max(1, Math.round(minutes * (type === 'strength' ? 1.5 : type === 'cycle' ? 1.25 : type === 'mobility' ? 0.8 : 1)));
  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team payload is required');
  }

  const payload = input as Record<string, unknown>;
  const name = String(payload.name ?? '').trim();
  const mascot = String(payload.mascot ?? '').trim();
  const rawMembers = Array.isArray(payload.members) ? payload.members : [];

  if (!name) {
    throw badRequest('Team name is required');
  }
  if (!mascot) {
    throw badRequest('Team mascot is required');
  }

  const members = rawMembers.map((member) => toObjectId(member, 'member'));
  const team = await Team.create({ name, mascot, members });

  if (members.length > 0) {
    await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
  }

  return team.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  const leaderboard = [] as Array<{ teamName: string; totalPoints: number; rank: number }>;
  for (const [index, item] of totals.entries()) {
    const team = await Team.findById(item._id).lean();
    leaderboard.push({
      teamName: team?.name ?? 'Unknown team',
      totalPoints: item.totalPoints,
      rank: index + 1,
    });
  }

  return leaderboard;
}

export async function suggestWorkouts(userEmail: string) {
  const email = String(userEmail ?? '').trim();
  if (!email) {
    throw badRequest('User email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    throw Object.assign(new Error('Workout suggestions require a known user'), { status: 404 });
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentFocus = recentActivities[0]?.type ? mapTypeToFocus(String(recentActivities[0].type)) : mapTypeToFocus(String(user.fitnessGoal ?? 'endurance'));
  const preferredFocus = mapTypeToFocus(String(user.fitnessGoal ?? recentFocus));
  const focus = preferredFocus || recentFocus;

  const workouts = await Workout.find({ focus }).sort({ title: 1 }).lean();
  const fallback = workouts.length > 0 ? workouts : await Workout.find().sort({ title: 1 }).lean();

  return fallback.map((workout) => ({
    ...workout,
    reason: `This ${workout.focus} workout matches your recent ${recentActivities[0]?.type ?? 'activity'} pattern and supports your ${user.fitnessGoal ?? focus} goal.`,
  }));
}

export { User };
