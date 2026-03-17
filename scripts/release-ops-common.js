function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function normalizeReleaseOpsDoctorSnapshot(value) {
  if (!isObject(value)) {
    return null;
  }

  const status = value.status;
  if (status !== 'ok' && status !== 'warn' && status !== 'fail') {
    return null;
  }

  const reasons = Array.isArray(value.reasons)
    ? value.reasons.filter(item => typeof item === 'string' && item.trim().length > 0)
    : [];

  return {
    status,
    summaryPresent: Boolean(value.summaryPresent),
    freshnessLabel:
      typeof value.freshnessLabel === 'string' && value.freshnessLabel.trim().length > 0
        ? value.freshnessLabel
        : 'age unknown',
    reasons,
    recommendedCommand:
      typeof value.recommendedCommand === 'string' && value.recommendedCommand.trim().length > 0
        ? value.recommendedCommand
        : null,
    opsStatus:
      isObject(value.opsStatus) &&
      typeof value.opsStatus.label === 'string' &&
      typeof value.opsStatus.tone === 'string'
        ? {
            label: value.opsStatus.label,
            tone: value.opsStatus.tone,
            actionRequired: Boolean(value.opsStatus.actionRequired),
            summary:
              typeof value.opsStatus.summary === 'string' ? value.opsStatus.summary : ''
          }
        : null
  };
}

export function formatReleaseOpsDoctorInline(snapshot) {
  if (!snapshot) {
    return null;
  }

  const detail = [];
  detail.push(`ops doctor ${snapshot.status}`);
  detail.push(snapshot.freshnessLabel);

  if (snapshot.opsStatus?.label) {
    detail.push(`ops ${snapshot.opsStatus.label}`);
  }

  if (snapshot.reasons.length > 0) {
    detail.push(snapshot.reasons[0]);
  }

  if (snapshot.recommendedCommand) {
    detail.push(`next ${snapshot.recommendedCommand}`);
  }

  return detail.join(' · ');
}

export function buildReleaseOpsFailureMessage(baseMessage, snapshot) {
  const detail = formatReleaseOpsDoctorInline(snapshot);
  return detail ? `${baseMessage} (${detail})` : baseMessage;
}
