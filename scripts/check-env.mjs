import 'dotenv/config';

const REQUIRED_ENV = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'SARVAM_API_KEY',
];

const OPTIONAL_ENV = [
  'MONGODB_MAX_POOL_SIZE',
  'MONGODB_MAX_IDLE_MS',
  'MONGODB_SKIP_INDEX_INIT',
];

function validate() {
  console.log('--- Environment Validation ---');
  let missing = 0;

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`MISSING: ${key} (Required)`);
      missing++;
    } else {
      const val = process.env[key];
      const masked = val.length > 8 ? val.substring(0, 4) + '...' + val.substring(val.length - 4) : '********';
      console.log(`OK:      ${key} (${masked})`);
    }
  }

  for (const key of OPTIONAL_ENV) {
    if (!process.env[key]) {
      console.warn(`WARN:     ${key} (Optional - Using Defaults)`);
    } else {
      console.log(`OK:      ${key} (${process.env[key]})`);
    }
  }

  if (missing > 0) {
    console.error(`\nValidation failed with ${missing} missing variables.`);
    process.exit(1);
  } else {
    console.log('\nEnvironment validation successful.');
  }
}

validate();
