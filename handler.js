require('dotenv').config();

const {
// JotForm API
  JOTFORM_KEY,
  JOTFORM_FORM_ID,

// Podio API
  PODIO_APP_ID,
  PODIO_APP_SECRET,

// Found on Podio's Project Settings Page
  PODIO_CLIENT_ID,
  PODIO_CLIENT_SECRET,
  PODIO_USER_ID,
} = process.env;

const fs = require('fs');
const request = require('request-promise-native');
const Podio = require('podio-js').api;

const podio = new Podio({
  authType: 'app',
  clientId: PODIO_CLIENT_ID,
  clientSecret: PODIO_CLIENT_SECRET,
});

module.exports = async (event) => {
  const response = await request(`https://api.jotform.com/form/${JOTFORM_FORM_ID}/submissions`, {
    qs: {
      apiKey: JOTFORM_KEY,
    },
    json: true,
  });
  const timestamp = await getTimestamp();
  const userSubmissions = response.content.filter((item) => {
    const createdAt = +new Date(item.created_at);
    return createdAt > timestamp;
  });

  await new Promise((resolve, reject) => {
    podio.authenticateWithApp(PODIO_APP_ID, PODIO_APP_SECRET, function() {
      resolve();
    });
  });

  await userSubmissions.reduce((p, item) => p.then(async () => {
    const { first, last } = item.answers['3'].answer;

    await podio.request('POST', `/item/app/${PODIO_APP_ID}`, {
      external_id: '2',
      fields: {
        'titolo': `${first} ${last}`,
        'stato': 3,
        'chi-riguarda': parseInt(PODIO_USER_ID, 10),
        'dettagli': item.answers['5'].answer,
      }
    });
  }), Promise.resolve());

  await setTimestamp();

  return {
    statusCode: 200,
  };
};

function getTimestamp() {
  return new Promise((resolve, reject) => {
    fs.readFile('timestamp.txt', 'utf8', (err, data) => {
      resolve(err ? 0 : parseInt(data, 10));
    });
  });
}

function setTimestamp() {
  const time = Date.now();
  return new Promise((resolve, reject) => {
    fs.writeFile('timestamp.txt', time, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
