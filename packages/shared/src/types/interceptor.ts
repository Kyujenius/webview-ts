import type { BridgeMessage, BridgeResponse } from './message';

/**
 * Request interceptor — transforms the outgoing request.
 * Return the (possibly modified) request to continue the chain.
 * Throw to abort the chain and propagate the error to the caller.
 */
export type RequestInterceptorFn = (
  request: BridgeMessage
) => BridgeMessage | Promise<BridgeMessage>;

/**
 * Response interceptor — transforms the incoming response.
 * Return the (possibly modified) response to continue the chain.
 * Throw to abort the chain and propagate the error to the caller.
 */
export type ResponseInterceptorFn = (
  response: BridgeResponse
) => BridgeResponse | Promise<BridgeResponse>;

/**
 * Named interceptor — a function with a name for debugging and removal.
 */
export interface RequestInterceptor {
  name: string;
  fn: RequestInterceptorFn;
}

export interface ResponseInterceptor {
  name: string;
  fn: ResponseInterceptorFn;
}

/** Per-action request interceptor map: { 'camera.takePhoto': RequestInterceptor[] } */
export type RequestInterceptorMap = Record<string, RequestInterceptor[]>;

/** Per-action response interceptor map: { 'camera.takePhoto': ResponseInterceptor[] } */
export type ResponseInterceptorMap = Record<string, ResponseInterceptor[]>;
