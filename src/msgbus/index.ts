import { createClientPool } from "redis";

export type RedisClient = ReturnType<typeof createClientPool>;

type Channel = "workflow:start";

type ChannelMessages = {
  "workflow:start": { runId: string };
};

export type MessageBus = {
  post: <T extends Channel>(channel: T, message: ChannelMessages[T]) => Promise<void>;
  poll: <T extends Channel>(channel: T) => Promise<ChannelMessages[T] | null>;
};

export function buildMessageBus(redis: RedisClient): MessageBus {
  return {
    async post<T extends Channel>(channel: T, message: ChannelMessages[T]) {
      await redis.lPush(channel, JSON.stringify(message));
    },

    async poll<T extends Channel>(channel: T): Promise<ChannelMessages[T] | null> {
      const result = await redis.brPop(channel, 0);
      return result ? JSON.parse(result.element) : null;
    },
  };
}
