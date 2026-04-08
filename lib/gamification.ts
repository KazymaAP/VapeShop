import { query } from './db';
import { logger } from './logger';

export async function trackEvent(
  userId: string | null,
  eventName: string,
  properties?: Record<string, unknown>
) {
  try {
    await query(
      'INSERT INTO analytics_events (user_id, event_name, event_properties) VALUES ($1, $2, $3)',
      [userId, eventName, JSON.stringify(properties || {})]
    );
  } catch (err) {
    logger.error('Error tracking event:', err);
  }
}

export async function getUserLevel(userId: string) {
  try {
    const result = await query('SELECT * FROM user_levels WHERE user_id = $1', [userId]);
    return result.rows[0] || { level: 1, experience: 0, badges: [] };
  } catch (err) {
    logger.error('Error fetching user level:', err);
    return { level: 1, experience: 0, badges: [] };
  }
}

export async function addExperience(userId: string, amount: number) {
  try {
    const level = await getUserLevel(userId);
    const newExp = level.experience + amount;
    const newLevel = Math.floor(newExp / 100) + 1;

    await query(
      'INSERT INTO user_levels (user_id, level, experience) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET level = $2, experience = $3',
      [userId, newLevel, newExp % 100]
    );
  } catch (err) {
    logger.error('Error adding experience:', err);
  }
}

export async function addBadge(userId: string, badge: string) {
  try {
    const level = await getUserLevel(userId);
    if (!level.badges.includes(badge)) {
      level.badges.push(badge);
      await query('UPDATE user_levels SET badges = $1 WHERE user_id = $2', [level.badges, userId]);
    }
  } catch (err) {
    logger.error('Error adding badge:', err);
  }
}
