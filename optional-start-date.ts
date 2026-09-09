import { getDateString } from './utils';

export const toOptionalDateInputValue = (timestamp: string | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : getDateString(date);
};

export const replaceOptionalStartDate = (
  timestamp: string | null,
  dateString: string,
  fallback = new Date(),
): string | null => {
  if (!dateString) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return timestamp;

  const original = timestamp ? new Date(timestamp) : fallback;
  const hours = Number.isNaN(original.getTime()) ? 12 : original.getHours();
  const minutes = Number.isNaN(original.getTime()) ? 0 : original.getMinutes();
  const seconds = Number.isNaN(original.getTime()) ? 0 : original.getSeconds();
  const milliseconds = Number.isNaN(original.getTime()) ? 0 : original.getMilliseconds();
  const updated = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hours,
    minutes,
    seconds,
    milliseconds,
  );
  return Number.isNaN(updated.getTime()) ? timestamp : updated.toISOString();
};
