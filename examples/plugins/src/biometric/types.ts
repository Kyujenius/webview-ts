export interface CheckAvailabilityResponse {
  available: boolean;
  biometricTypes: string[];
}

export interface AuthenticatePayload {
  reason?: string;
}

export interface AuthenticateResponse {
  success: boolean;
}
