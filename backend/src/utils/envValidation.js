/**
 * 환경 변수 유효성 검사 유틸리티
 * 서버 시작 시 필수 환경 변수 확인
 */

// 필수 환경 변수 목록
const REQUIRED_ENV_VARS = {
  production: [
    'JWT_SECRET',
    'DATABASE_URL',
  ],
  all: [
    // 모든 환경에서 필요한 변수는 여기에 추가
  ],
};

// 권장 환경 변수 (없으면 경고)
const RECOMMENDED_ENV_VARS = {
  production: [
    'ADMIN_EMAILS',
    'SEED_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ],
};

/**
 * 환경 변수 유효성 검사
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // 필수 환경 변수 확인
  const requiredVars = [...REQUIRED_ENV_VARS.all];
  if (isProduction) {
    requiredVars.push(...REQUIRED_ENV_VARS.production);
  }

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`[CRITICAL] Missing required environment variable: ${varName}`);
    }
  }

  // 권장 환경 변수 확인
  if (isProduction) {
    for (const varName of RECOMMENDED_ENV_VARS.production) {
      if (!process.env[varName]) {
        warnings.push(`[WARN] Missing recommended environment variable: ${varName}`);
      }
    }
  }

  // JWT_SECRET 강도 확인
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('[WARN] JWT_SECRET should be at least 32 characters for security');
  }

  // 기본값 사용 경고
  if (!process.env.WELCOME_BONUS_AMOUNT) {
    warnings.push('[INFO] WELCOME_BONUS_AMOUNT not set, using default: 10000');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 환경 변수 검사 결과 출력 및 필요시 종료
 */
function checkEnvironmentOrExit() {
  const { valid, errors, warnings } = validateEnvironment();

  // 경고 출력
  warnings.forEach(w => console.warn(w));

  // 에러가 있으면 출력 후 종료
  if (!valid) {
    errors.forEach(e => console.error(e));
    console.error('\n⛔ Server startup aborted due to missing environment variables');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

module.exports = {
  validateEnvironment,
  checkEnvironmentOrExit,
};
