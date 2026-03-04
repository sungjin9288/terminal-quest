let telemetryOptIn = false;

export function getTelemetryOptIn(): boolean {
  return telemetryOptIn;
}

export function setTelemetryOptIn(value: boolean): boolean {
  telemetryOptIn = value;
  return telemetryOptIn;
}

export function resetTelemetryOptIn(): boolean {
  telemetryOptIn = false;
  return telemetryOptIn;
}
