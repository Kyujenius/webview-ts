/**
 * Validator middleware for schema validation
 */

import type { Middleware, MiddlewareContext, ValidatorMiddlewareOptions } from '@ts-bridge/shared';
import { isBridgeMessage, isBridgeResponse } from '@ts-bridge/shared';

/**
 * Validator middleware
 */
export class ValidatorMiddleware implements Middleware {
  name = 'validator';

  private options: Required<ValidatorMiddlewareOptions>;

  constructor(options: ValidatorMiddlewareOptions = {}) {
    this.options = {
      validateRequests: options.validateRequests ?? true,
      validateResponses: options.validateResponses ?? true,
      onValidationError: options.onValidationError ?? 'throw',
    };
  }

  /**
   * Validate request
   */
  async onRequest(context: MiddlewareContext): Promise<void> {
    if (!this.options.validateRequests) {
      return;
    }

    const { request } = context;

    // Basic validation using type guards
    if (!isBridgeMessage(request)) {
      this.handleValidationError('Invalid bridge message format', context);
    }

    // Required fields
    if (!request.id || !request.action) {
      this.handleValidationError('Message missing required fields (id, action)', context);
    }
  }

  /**
   * Validate response
   */
  async onResponse(context: MiddlewareContext): Promise<void> {
    if (!this.options.validateResponses || !context.response) {
      return;
    }

    const { response } = context;

    // Basic validation using type guards
    if (!isBridgeResponse(response)) {
      this.handleValidationError('Invalid bridge response format', context);
    }

    // Required fields
    if (!response.id || typeof response.success !== 'boolean') {
      this.handleValidationError('Response missing required fields (id, success)', context);
    }

    // Error validation
    if (!response.success && !response.error) {
      this.handleValidationError('Failed response must include error information', context);
    }
  }

  /**
   * Handle validation error based on options
   */
  private handleValidationError(message: string, context: MiddlewareContext): void {
    const error = new Error(`[Validation Error] ${message}`);

    switch (this.options.onValidationError) {
      case 'throw':
        throw error;
      case 'warn':
        console.warn(error.message, context);
        break;
      case 'ignore':
        // Do nothing
        break;
    }
  }
}
