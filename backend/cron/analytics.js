const Event = require('../models/Event');
const EventAnalyticsHistory = require('../models/EventAnalyticsHistory');

const runDailyAnalyticsCron = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await Event.find({ status: { $in: ['published', 'ongoing', 'completed'] } });

    for (const event of events) {
      const existing = await EventAnalyticsHistory.findOne({ eventId: event._id, date: today });
      if (!existing) {
        await EventAnalyticsHistory.create({
          eventId: event._id,
          date: today,
          registrations: event.analytics.totalRegistrations,
          revenue: event.analytics.revenue,
          attendance: event.analytics.attendanceCount,
          cancellations: event.analytics.cancellationCount
        });
      }
    }
    console.log('[CRON] Daily analytics snapshot saved:', new Date().toISOString());
  } catch (err) {
    console.error('[CRON] Analytics error:', err.message);
  }
};

// Run once at startup and every 24 hours
const startCronJobs = () => {
  runDailyAnalyticsCron();
  setInterval(runDailyAnalyticsCron, 24 * 60 * 60 * 1000);
};

module.exports = startCronJobs;
