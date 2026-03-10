export function getTelemetryFilePath() {
  return 'browser://telemetry-disabled';
}

export function isTelemetryEnabled() {
  return false;
}

export function trackTelemetryEvent() {
  return false;
}
