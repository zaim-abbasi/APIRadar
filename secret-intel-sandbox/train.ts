import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const CORPUS_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt';
const MODEL_PATH = path.join(__dirname, 'model.json');

async function downloadCorpus(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    https.get(CORPUS_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const words = data.split('\n').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w.length > 0);
        resolve(words);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading Google 10,000 English corpus...');
  const words = await downloadCorpus();
  console.log(`Downloaded ${words.length} words.`);

  const extraWords = [
    'placeholder', 'changeme', 'example', 'sample', 'demo',
    'xxxx', 'yyyy', 'zzzz', 'fake', 'dummy', 'mock', 'fixme', 'todo',
    'your_api', 'your_key', 'put_key', 'key_here', 'api_key_here',
    'insert_key', 'adapter', 'production', 'development', 'test',
    'your-key', 'api-key', 'here', 'key', 'env',
    'secret', 'local', 'foo', 'bar', 'baz', 'qux', 'asdf', 'qwerty',
    'password', 'admin', 'hidden', 'private', 'public', 'mocking',
    'dummykey', 'fakekey', 'insert', 'replace', 'token', 'auth', 'bearer',
    '12345', 'apikey'
  ];
  words.push(...extraWords);

  console.log('Building Markov trigram model...');
  const matrix: Record<string, Record<string, number>> = {};
  
  let totalTransitions = 0;

  for (const word of words) {
    const w = `^${word}$`;
    for (let i = 0; i < w.length - 2; i++) {
        const prefix = w.substring(i, i + 2);
        const next = w[i + 2];
        if (!matrix[prefix]) matrix[prefix] = {};
        if (!matrix[prefix][next]) matrix[prefix][next] = 0;
        matrix[prefix][next]++;
        totalTransitions++;
    }
  }

  // Convert to probabilities
  const probabilities: Record<string, Record<string, number>> = {};
  for (const prefix in matrix) {
      probabilities[prefix] = {};
      let sum = 0;
      for (const next in matrix[prefix]) {
          sum += matrix[prefix][next];
      }
      for (const next in matrix[prefix]) {
          probabilities[prefix][next] = matrix[prefix][next] / sum;
      }
  }

  const modelData = {
      probabilities,
      totalTransitions
  };

  fs.writeFileSync(MODEL_PATH, JSON.stringify(modelData, null, 2));
  console.log(`Model saved to ${MODEL_PATH}. Total prefixes: ${Object.keys(probabilities).length}`);
}

run().catch(console.error);
