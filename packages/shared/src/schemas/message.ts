/**
 * Zod schemas for runtime validation of bridge messages
 */

import { z } from 'zod';

/**
 * Schema for bridge error
 */
export const bridgeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

/**
 * Schema for bridge message
 */
export const bridgeMessageSchema = z.object({
  id: z.string(),
  action: z.string(),
  payload: z.unknown().optional(),
  timestamp: z.number(),
});

/**
 * Schema for bridge response
 */
export const bridgeResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: bridgeErrorSchema.optional(),
  timestamp: z.number(),
});

/**
 * Schema for bridge event
 */
export const bridgeEventSchema = z.object({
  event: z.string(),
  payload: z.unknown(),
  timestamp: z.number(),
});

/**
 * Schema for typed bridge message
 */
export const typedBridgeMessageSchema = z.object({
  type: z.enum(['request', 'response', 'event']),
  data: z.union([bridgeMessageSchema, bridgeResponseSchema, bridgeEventSchema]),
});

/**
 * Type guards using Zod
 */
export const isBridgeMessage = (value: unknown): boolean => {
  return bridgeMessageSchema.safeParse(value).success;
};

export const isBridgeResponse = (value: unknown): boolean => {
  return bridgeResponseSchema.safeParse(value).success;
};

export const isBridgeEvent = (value: unknown): boolean => {
  return bridgeEventSchema.safeParse(value).success;
};
