var CronJob = require('cron').CronJob;
const handler = require('./handler');

new CronJob('*/15 * * * *', async () => {
  try {
    const response = await handler();

    console.log(response);
  } catch (error) {
    console.error(error);
  }
}, null, true, 'America/Los_Angeles');
