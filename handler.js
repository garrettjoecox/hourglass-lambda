const request = require('request-promise-native');
const Podio = require('podio-js').api;
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
} = process.env;
const PODIO_USER_ID = parseInt(process.env.PODIO_USER_ID, 10);

exports.handler = async () => {
  const submissions = await getSubmissions();

  const results = await submissions.reduce((p, submission) => p.then(async (r) => {
    try {
      await createPodioItem({
        titolo: submission.answers.name.prettyFormat,
        stato: 3,
        'chi-riguarda': PODIO_USER_ID,
        dettagli: submission.answers.whereWould.answer,
      });
      await flagSubmission(submission.id);

      r[submission.id] = 'success';
      return r;
    } catch (error) {
      r[submission.id] = `Error: ${error.message}`;
      return r;
    }
  }), Promise.resolve({}));

  return {
    statusCode: 200,
    results
  };
};

async function getSubmissions() {
  const response = await request(`https://api.jotform.com/form/${JOTFORM_FORM_ID}/submissions`, {
    qs: {
      apiKey: JOTFORM_KEY,
      limit: 1000,
      filter: JSON.stringify({ 'flag:ne': '1' }),
    },
    json: true,
  });

  const submissions = response.content.map(submission => {
    const formattedAnswers = {};
    for (const key in submission.answers) {
      const answer = submission.answers[key];
      formattedAnswers[answer.name] = answer;
    }

    submission.answers = formattedAnswers;
    return submission;
  });

  return submissions;
}

let podio;
async function createPodioItem(fields) {
  if (!podio) {
    podio = new Podio({
      authType: 'app',
      clientId: PODIO_CLIENT_ID,
      clientSecret: PODIO_CLIENT_SECRET,
    });

    await new Promise((resolve, reject) => {
      podio.authenticateWithApp(PODIO_APP_ID, PODIO_APP_SECRET, function () {
        resolve();
      });
    });
  }

  await podio.request('POST', `/item/app/${PODIO_APP_ID}`, { fields });
}

function flagSubmission(submissionId) {
  return request(`https://api.jotform.com/submission/${submissionId}`, {
    method: 'POST',
    qs: {
      apiKey: JOTFORM_KEY,
    },
    body: {
      flag: '1'
    },
    json: true,
  });
}
