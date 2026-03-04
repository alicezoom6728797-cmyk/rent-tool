export function parseTimedesc(timedesc: string): { startTime: string; endTime: string; interval: string } {
  if (!timedesc) return { startTime: '--', endTime: '--', interval: '' };

  try {
    const data = JSON.parse(decodeURIComponent(timedesc));
    const remark = data.allRemark || data.rule_group?.[0]?.remark || '';
    const times = remark.match(/(\d{2}:\d{2})/g);
    if (times && times.length >= 2) {
      return { startTime: times[0], endTime: times[times.length - 1], interval: remark.replace(/\\r\\n/g, ' | ') };
    }
  } catch { /* not JSON, try direct parsing */ }

  const times = timedesc.match(/(\d{1,2}:\d{2})/g);
  if (times && times.length >= 2) {
    return { startTime: times[0], endTime: times[times.length - 1], interval: timedesc };
  }
  if (times && times.length === 1) {
    return { startTime: times[0], endTime: '--', interval: timedesc };
  }

  return { startTime: '--', endTime: '--', interval: '' };
}
