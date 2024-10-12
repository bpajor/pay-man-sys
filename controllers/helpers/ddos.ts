import { RedisClientType } from "redis"

const MAX_LOGIN_ATTEMPTS = 5; // Amount of allowed login attempts
const LOCKOUT_TIME = 10 * 60 //Time of blockade (10 minutes)

export const incrementFailedAttempts = async (attemptsKey: string, lockKey: string, redisClient: RedisClientType) => {
    const attempts = await redisClient.incr(attemptsKey);

    if (attempts === 1) {
       await redisClient.expire(attemptsKey, LOCKOUT_TIME);
    }

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await redisClient.set(lockKey, "locked", {EX: LOCKOUT_TIME});
    }
}