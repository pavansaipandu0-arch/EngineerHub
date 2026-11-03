import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEngineeringTool, convertUnits } from './engineeringTools.js';

test('scientific calculator follows arithmetic precedence and selected angle units', () => {
  assert.equal(
    calculateEngineeringTool('scientific-calculator', {
      expression: '2 + 3 * 4',
      angleUnit: 'degrees',
    }).value,
    14,
  );
  assert.ok(
    Math.abs(
      calculateEngineeringTool('scientific-calculator', {
        expression: 'sin(30)',
        angleUnit: 'degrees',
      }).value - 0.5,
    ) < 1e-12,
  );
  assert.equal(
    calculateEngineeringTool('scientific-calculator', {
      expression: '-2^2',
      angleUnit: 'radians',
    }).value,
    -4,
  );
});

test('scientific calculator rejects invalid and unsafe expressions', () => {
  assert.throws(
    () =>
      calculateEngineeringTool('scientific-calculator', {
        expression: '1 / 0',
        angleUnit: 'degrees',
      }),
    /zero/,
  );
  assert.throws(
    () =>
      calculateEngineeringTool('scientific-calculator', {
        expression: 'globalThis.alert(1)',
        angleUnit: 'degrees',
      }),
    /unsupported/,
  );
  assert.throws(
    () =>
      calculateEngineeringTool('scientific-calculator', {
        expression: 'sqrt(-1)',
        angleUnit: 'degrees',
      }),
    /finite/,
  );
  assert.throws(
    () =>
      calculateEngineeringTool('scientific-calculator', {
        expression: 'tan(90)',
        angleUnit: 'degrees',
      }),
    /undefined/,
  );
});

test('unit conversion handles temperature offsets and absolute zero', () => {
  assert.equal(convertUnits(0, 'temperature', '°C', '°F'), 32);
  assert.equal(convertUnits(100, 'temperature', '°C', 'K'), 373.15);
  assert.throws(() => convertUnits(-274, 'temperature', '°C', 'K'), /absolute zero/);
});

test('unit conversion uses defined engineering conversion factors', () => {
  assert.equal(convertUnits(1, 'length', 'm', 'ft'), 1 / 0.3048);
  assert.equal(convertUnits(1, 'area', 'm²', 'cm²'), 10000);
  assert.equal(convertUnits(1, 'volume', 'm³', 'L'), 1000);
  assert.equal(convertUnits(1, 'weight', 'kg', 'g'), 1000);
  assert.equal(convertUnits(1, 'time', 'h', 'min'), 60);
  assert.equal(convertUnits(36, 'speed', 'km/h', 'm/s'), 10);
  assert.equal(convertUnits(1, 'pressure', 'bar', 'kPa'), 100);
  assert.equal(convertUnits(1, 'torque', 'N·m', 'N·cm'), 100);
  assert.ok(Math.abs(convertUnits(1, 'power', 'hp (mechanical)', 'W') - 745.699871582) < 1e-9);
  assert.equal(convertUnits(60, 'frequency', 'rpm', 'Hz'), 1);
  assert.equal(convertUnits(1, 'energy', 'kWh', 'J'), 3600000);
  assert.equal(convertUnits(1, 'data', 'MiB', 'B'), 1048576);
  assert.throws(() => convertUnits(-1, 'pressure', 'Pa', 'bar'), /negative/);
});

test('number system converter supports signed integers and validates digits', () => {
  assert.equal(
    calculateEngineeringTool('binary-decimal-hex-converter', {
      value: '-101101',
      fromBase: '2',
      toBase: '16',
    }).value,
    '-2D',
  );
  assert.equal(
    calculateEngineeringTool('number-system-converter', {
      value: 'Z',
      fromBase: '36',
      toBase: '10',
    }).value,
    '35',
  );
  assert.throws(
    () =>
      calculateEngineeringTool('number-system-converter', {
        value: '102',
        fromBase: '2',
        toBase: '10',
      }),
    /valid digit/,
  );
});

test('percentage and ratio calculators return formulas and reject undefined results', () => {
  assert.equal(
    calculateEngineeringTool('percentage-calculator', {
      mode: 'of',
      a: '15',
      b: '200',
    }).value,
    30,
  );
  assert.equal(
    calculateEngineeringTool('percentage-calculator', {
      mode: 'change',
      a: '80',
      b: '100',
    }).value,
    25,
  );
  assert.equal(calculateEngineeringTool('ratio-calculator', { a: '18', b: '24' }).value, '3:4');
  assert.throws(
    () =>
      calculateEngineeringTool('percentage-calculator', {
        mode: 'share',
        a: '4',
        b: '0',
      }),
    /cannot be zero/,
  );
});

test('civil calculators calculate geometry and bag yield with a rounded-up estimate', () => {
  assert.equal(
    calculateEngineeringTool('area-calculator', {
      shape: 'triangle',
      length: '4',
      width: '3',
    }).value,
    6,
  );
  assert.ok(
    Math.abs(
      calculateEngineeringTool('volume-calculator', {
        shape: 'cylinder',
        radius: '1',
        height: '2',
      }).value -
        2 * Math.PI,
    ) < 1e-12,
  );
  const estimate = calculateEngineeringTool('material-estimator', {
    length: '2',
    width: '2',
    thickness: '0.1',
    waste: '10',
    bagYield: '25',
  });
  assert.ok(Math.abs(estimate.value - 0.44) < 1e-12);
  assert.ok(estimate.details.includes('Estimated bags: 18'));
});

test('electrical and electronics calculators apply basic idealized formulas', () => {
  assert.equal(
    calculateEngineeringTool('ohms-law-calculator', {
      solve: 'voltage',
      current: '2',
      resistance: '5',
    }).value,
    10,
  );
  assert.equal(
    calculateEngineeringTool('ohms-law-calculator', {
      solve: 'current',
      voltage: '12',
      resistance: '4',
    }).value,
    3,
  );
  assert.equal(
    calculateEngineeringTool('ohms-law-calculator', {
      solve: 'resistance',
      voltage: '12',
      current: '3',
    }).value,
    4,
  );
  assert.equal(
    calculateEngineeringTool('electrical-power-calculator', {
      voltage: '12',
      current: '2',
    }).value,
    24,
  );
  assert.equal(
    calculateEngineeringTool('voltage-current-calculator', {
      solve: 'current',
      knownValue: '12',
      resistance: '4',
    }).value,
    3,
  );
  assert.equal(
    calculateEngineeringTool('resistance-calculator', {
      resistors: '100, 100',
    }).value,
    'Series 200 Ω · Parallel 50 Ω',
  );
  assert.equal(
    calculateEngineeringTool('resistor-color-code', {
      band1: 'brown',
      band2: 'black',
      multiplier: 'red',
      tolerance: 'gold',
    }).value,
    '1000 Ω ±5%',
  );
});
