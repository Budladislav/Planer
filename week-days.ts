export type DatedWeekDay = {
  date: string;
};

export const partitionWeekDays = <Day extends DatedWeekDay>(
  days: readonly Day[],
  today: string,
): { pastDays: Day[]; currentAndFutureDays: Day[] } => {
  const pastDays: Day[] = [];
  const currentAndFutureDays: Day[] = [];

  days.forEach(day => {
    if (day.date < today) {
      pastDays.push(day);
    } else {
      currentAndFutureDays.push(day);
    }
  });

  return { pastDays, currentAndFutureDays };
};
