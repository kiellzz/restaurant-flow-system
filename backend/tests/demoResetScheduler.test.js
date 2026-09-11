const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  DEFAULT_INTERVAL_MINUTES,
  parseIntervalMinutes,
  startDemoResetScheduler,
} = require('../services/demoResetScheduler');

test('usa 30 minutos como intervalo padrão', () => {
  assert.equal(parseIntervalMinutes(), DEFAULT_INTERVAL_MINUTES);
  assert.equal(parseIntervalMinutes('30'), 30);
});

test('rejeita intervalo inválido', () => {
  assert.throws(() => parseIntervalMinutes('0'), /maior que zero/);
  assert.throws(() => parseIntervalMinutes('invalido'), /maior que zero/);
});

test('executa e permite interromper o reset agendado', async () => {
  let resetCount = 0;
  const scheduler = startDemoResetScheduler({
    intervalMinutes: 0.0002,
    reset: async ({ source }) => {
      assert.equal(source, 'scheduled');
      resetCount += 1;
    },
  });

  await new Promise(resolve => setTimeout(resolve, 40));
  scheduler.stop();

  assert.ok(resetCount >= 1);
});
