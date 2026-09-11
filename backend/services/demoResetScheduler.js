const { resetDemo } = require('./resetDemo');

const DEFAULT_INTERVAL_MINUTES = 30;

function parseIntervalMinutes(value) {
  if (value == null || value === '') return DEFAULT_INTERVAL_MINUTES;

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error('DEMO_RESET_INTERVAL_MINUTES deve ser um número maior que zero.');
  }

  return parsedValue;
}

function startDemoResetScheduler({
  intervalMinutes = parseIntervalMinutes(process.env.DEMO_RESET_INTERVAL_MINUTES),
  reset = resetDemo,
} = {}) {
  const intervalMs = intervalMinutes * 60 * 1000;
  let nextResetAt = new Date(Date.now() + intervalMs);

  const timer = setInterval(async () => {
    try {
      await reset({ source: 'scheduled' });
      console.log(`[demo-reset] Reset automático concluído em ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[demo-reset] Falha no reset automático:', error);
    } finally {
      nextResetAt = new Date(Date.now() + intervalMs);
    }
  }, intervalMs);

  timer.unref();
  console.log(`[demo-reset] Próximo reset em ${nextResetAt.toISOString()} (${intervalMinutes} min)`);

  return {
    getNextResetAt: () => nextResetAt,
    stop: () => clearInterval(timer),
  };
}

module.exports = {
  DEFAULT_INTERVAL_MINUTES,
  parseIntervalMinutes,
  startDemoResetScheduler,
};
