export const UNIT_GROUPS = {
  temperature: {
    label: 'Temperature',
    units: [
      ['°C', 1],
      ['°F', 1],
      ['K', 1],
    ],
  },
  length: {
    label: 'Length',
    units: [
      ['mm', 0.001],
      ['cm', 0.01],
      ['m', 1],
      ['km', 1000],
      ['in', 0.0254],
      ['ft', 0.3048],
      ['yd', 0.9144],
      ['mi', 1609.344],
    ],
  },
  weight: {
    label: 'Mass',
    units: [
      ['mg', 0.000001],
      ['g', 0.001],
      ['kg', 1],
      ['tonne', 1000],
      ['oz', 0.028349523125],
      ['lb', 0.45359237],
    ],
  },
  area: {
    label: 'Area',
    units: [
      ['mm²', 0.000001],
      ['cm²', 0.0001],
      ['m²', 1],
      ['km²', 1000000],
      ['ft²', 0.09290304],
      ['acre', 4046.8564224],
      ['ha', 10000],
    ],
  },
  volume: {
    label: 'Volume',
    units: [
      ['mL', 0.000001],
      ['cm³', 0.000001],
      ['L', 0.001],
      ['m³', 1],
      ['US gal', 0.003785411784],
      ['ft³', 0.028316846592],
    ],
  },
  time: {
    label: 'Time',
    units: [
      ['ms', 0.001],
      ['s', 1],
      ['min', 60],
      ['h', 3600],
      ['day', 86400],
    ],
  },
  speed: {
    label: 'Speed',
    units: [
      ['m/s', 1],
      ['km/h', 1 / 3.6],
      ['mph', 0.44704],
      ['ft/s', 0.3048],
      ['kn', 0.514444444444],
    ],
  },
  pressure: {
    label: 'Pressure',
    units: [
      ['Pa', 1],
      ['kPa', 1000],
      ['MPa', 1000000],
      ['bar', 100000],
      ['psi', 6894.757293168],
      ['atm', 101325],
    ],
  },
  torque: {
    label: 'Torque',
    units: [
      ['N·m', 1],
      ['N·cm', 0.01],
      ['kN·m', 1000],
      ['lbf·ft', 1.3558179483314],
    ],
  },
  power: {
    label: 'Power',
    units: [
      ['W', 1],
      ['kW', 1000],
      ['MW', 1000000],
      ['hp (mechanical)', 745.699871582],
    ],
  },
  frequency: {
    label: 'Frequency',
    units: [
      ['Hz', 1],
      ['kHz', 1000],
      ['MHz', 1000000],
      ['GHz', 1000000000],
      ['rpm', 1 / 60],
    ],
  },
  energy: {
    label: 'Energy',
    units: [
      ['J', 1],
      ['kJ', 1000],
      ['MJ', 1000000],
      ['Wh', 3600],
      ['kWh', 3600000],
      ['cal (thermochemical)', 4.184],
      ['BTU (IT)', 1055.05585262],
    ],
  },
  data: {
    label: 'Data storage',
    units: [
      ['B', 1],
      ['kB', 1000],
      ['MB', 1000000],
      ['GB', 1000000000],
      ['TB', 1000000000000],
      ['KiB', 1024],
      ['MiB', 1048576],
      ['GiB', 1073741824],
      ['TiB', 1099511627776],
    ],
  },
};

const unitOptions = (group) => UNIT_GROUPS[group].units.map(([value]) => ({ value, label: value }));
const selectField = (name, label, options) => ({ name, label, type: 'select', options });
const numberField = (name, label, unit = '', extra = {}) => ({
  name,
  label,
  type: 'number',
  unit,
  ...extra,
});

export const ENGINEERING_TOOLS = [
  {
    id: 'scientific-calculator',
    title: 'Scientific calculator',
    category: 'General',
    description:
      'Evaluate arithmetic expressions and common scientific functions. Trigonometric inputs use the selected angle unit.',
    fields: [
      {
        name: 'expression',
        label: 'Expression',
        type: 'text',
        placeholder: 'Example: sin(30) + sqrt(16)',
      },
      selectField('angleUnit', 'Angle unit', [
        { value: 'degrees', label: 'Degrees' },
        { value: 'radians', label: 'Radians' },
      ]),
    ],
    initial: { expression: '', angleUnit: 'degrees' },
  },
  {
    id: 'percentage-calculator',
    title: 'Percentage calculator',
    category: 'General',
    description:
      'Calculate a percentage of a value, a percentage share, or the percentage change between two values.',
    fields: [
      selectField('mode', 'Calculation', [
        { value: 'of', label: 'What is A% of B?' },
        { value: 'share', label: 'A is what percent of B?' },
        { value: 'change', label: 'Percentage change from A to B' },
      ]),
      numberField('a', 'Value A'),
      numberField('b', 'Value B'),
    ],
    initial: { mode: 'of', a: '', b: '' },
  },
  {
    id: 'ratio-calculator',
    title: 'Ratio calculator',
    category: 'General',
    description:
      'Reduce a positive whole-number ratio and show each part as a percentage of the total.',
    fields: [
      numberField('a', 'First part', '', { min: 1, step: 1 }),
      numberField('b', 'Second part', '', { min: 1, step: 1 }),
    ],
    initial: { a: '', b: '' },
  },
  {
    id: 'unit-converter',
    title: 'Unit converter',
    category: 'General',
    description:
      'Convert between common engineering units for length, mass, area, volume, time, speed, pressure, torque, power, frequency, energy, and data.',
    fields: [
      selectField(
        'group',
        'Measurement',
        Object.entries(UNIT_GROUPS).map(([value, group]) => ({ value, label: group.label })),
      ),
      numberField('value', 'Value'),
      { name: 'from', label: 'From', type: 'dynamic-unit' },
      { name: 'to', label: 'To', type: 'dynamic-unit' },
    ],
    initial: { group: 'length', value: '', from: 'm', to: 'ft' },
  },
  ...[
    [
      'temperature-converter',
      'Temperature converter',
      'General',
      'Convert temperature among Celsius, Fahrenheit, and Kelvin.',
      'temperature',
    ],
    [
      'length-converter',
      'Length converter',
      'General',
      'Convert linear dimensions across metric and imperial units.',
      'length',
    ],
    [
      'weight-converter',
      'Weight converter',
      'General',
      'Convert mass units. “Weight” is treated as mass; force is not calculated.',
      'weight',
    ],
    [
      'area-converter',
      'Area converter',
      'General',
      'Convert area units using exact defined conversion factors.',
      'area',
    ],
    [
      'volume-converter',
      'Volume converter',
      'General',
      'Convert common liquid and solid volume units.',
      'volume',
    ],
    [
      'time-converter',
      'Time converter',
      'General',
      'Convert time intervals from milliseconds through days.',
      'time',
    ],
    [
      'speed-converter',
      'Speed converter',
      'Mechanical',
      'Convert linear speed; no vehicle or flow assumptions are applied.',
      'speed',
    ],
    [
      'pressure-converter',
      'Pressure converter',
      'Mechanical',
      'Convert pressure units. Gauge and absolute pressure are not interchangeable without a reference.',
      'pressure',
    ],
    [
      'torque-converter',
      'Torque converter',
      'Mechanical',
      'Convert torque units; no fastener or shaft design check is implied.',
      'torque',
    ],
    [
      'power-converter',
      'Power converter',
      'Mechanical',
      'Convert power units. Horsepower uses the mechanical horsepower definition.',
      'power',
    ],
    [
      'frequency-converter',
      'Frequency converter',
      'Electronics',
      'Convert frequency units; rpm is treated as rotational cycles per minute.',
      'frequency',
    ],
    [
      'energy-converter',
      'Energy unit converter',
      'Electrical',
      'Convert energy units. BTU is the International Table definition; calorie is thermochemical.',
      'energy',
    ],
  ].map(([id, title, category, description, group]) => ({
    id,
    title,
    category,
    description,
    unitGroup: group,
    fields: [
      numberField('value', 'Value'),
      selectField('from', 'From', unitOptions(group)),
      selectField('to', 'To', unitOptions(group)),
    ],
    initial: {
      value: '',
      from: UNIT_GROUPS[group].units[0][0],
      to: UNIT_GROUPS[group].units[1][0],
    },
  })),
  {
    id: 'binary-decimal-hex-converter',
    title: 'Binary, decimal & hexadecimal converter',
    category: 'Computer Science',
    description:
      'Convert signed whole numbers among binary, octal, decimal, and hexadecimal representations.',
    fields: [
      { name: 'value', label: 'Number', type: 'text', placeholder: 'Example: 101101' },
      selectField('fromBase', 'Input base', [
        { value: '2', label: 'Binary (base 2)' },
        { value: '8', label: 'Octal (base 8)' },
        { value: '10', label: 'Decimal (base 10)' },
        { value: '16', label: 'Hexadecimal (base 16)' },
      ]),
      selectField('toBase', 'Output base', [
        { value: '2', label: 'Binary (base 2)' },
        { value: '8', label: 'Octal (base 8)' },
        { value: '10', label: 'Decimal (base 10)' },
        { value: '16', label: 'Hexadecimal (base 16)' },
      ]),
    ],
    initial: { value: '', fromBase: '2', toBase: '10' },
  },
  {
    id: 'number-system-converter',
    title: 'Number system converter',
    category: 'Computer Science',
    description: 'Convert signed whole numbers between any bases from 2 through 36.',
    fields: [
      {
        name: 'value',
        label: 'Number',
        type: 'text',
        placeholder: 'Digits valid in the selected input base',
      },
      numberField('fromBase', 'Input base', '', { min: 2, max: 36, step: 1 }),
      numberField('toBase', 'Output base', '', { min: 2, max: 36, step: 1 }),
    ],
    initial: { value: '', fromBase: '10', toBase: '16' },
  },
  {
    id: 'data-storage-converter',
    title: 'Data storage unit converter',
    category: 'Computer Science',
    description:
      'Convert decimal SI (kB, MB) and binary IEC (KiB, MiB) storage units using their respective definitions.',
    unitGroup: 'data',
    fields: [
      numberField('value', 'Value'),
      selectField('from', 'From', unitOptions('data')),
      selectField('to', 'To', unitOptions('data')),
    ],
    initial: { value: '', from: 'MB', to: 'MiB' },
  },
  {
    id: 'area-calculator',
    title: 'Area calculator',
    category: 'Civil',
    description:
      'Calculate the area of a rectangle, triangle, or circle from the dimensions shown.',
    fields: [
      selectField('shape', 'Shape', [
        { value: 'rectangle', label: 'Rectangle' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'circle', label: 'Circle' },
      ]),
      numberField('length', 'Length', 'm', { min: 0 }),
      numberField('width', 'Width / base', 'm', { min: 0 }),
      numberField('radius', 'Radius', 'm', { min: 0 }),
    ],
    initial: { shape: 'rectangle', length: '', width: '', radius: '' },
  },
  {
    id: 'volume-calculator',
    title: 'Volume calculator',
    category: 'Civil',
    description: 'Calculate the geometric volume of a rectangular prism or cylinder.',
    fields: [
      selectField('shape', 'Shape', [
        { value: 'prism', label: 'Rectangular prism' },
        { value: 'cylinder', label: 'Cylinder' },
      ]),
      numberField('length', 'Length', 'm', { min: 0 }),
      numberField('width', 'Width', 'm', { min: 0 }),
      numberField('height', 'Height', 'm', { min: 0 }),
      numberField('radius', 'Radius', 'm', { min: 0 }),
    ],
    initial: { shape: 'prism', length: '', width: '', height: '', radius: '' },
  },
  {
    id: 'material-estimator',
    title: 'Basic concrete quantity estimator',
    category: 'Civil',
    description:
      'Estimate concrete volume and bag count from a rectangular slab and a user-provided bag yield.',
    fields: [
      numberField('length', 'Slab length', 'm', { min: 0 }),
      numberField('width', 'Slab width', 'm', { min: 0 }),
      numberField('thickness', 'Slab thickness', 'm', { min: 0 }),
      numberField('waste', 'Allowance', '%', { min: 0, max: 100 }),
      numberField('bagYield', 'Concrete yield per bag', 'L', { min: 0 }),
    ],
    initial: { length: '', width: '', thickness: '', waste: '0', bagYield: '' },
  },
  {
    id: 'ohms-law-calculator',
    title: "Ohm's law calculator",
    category: 'Electrical',
    description: 'Solve voltage, current, or resistance from the other two values using V = I × R.',
    fields: [
      selectField('solve', 'Solve for', [
        { value: 'voltage', label: 'Voltage (V)' },
        { value: 'current', label: 'Current (I)' },
        { value: 'resistance', label: 'Resistance (R)' },
      ]),
      numberField('voltage', 'Voltage', 'V', { min: 0 }),
      numberField('current', 'Current', 'A', { min: 0 }),
      numberField('resistance', 'Resistance', 'Ω', { min: 0 }),
    ],
    initial: { solve: 'voltage', voltage: '', current: '', resistance: '' },
  },
  {
    id: 'electrical-power-calculator',
    title: 'Electrical power calculator',
    category: 'Electrical',
    description: 'Calculate ideal DC electrical power from voltage and current using P = V × I.',
    fields: [
      numberField('voltage', 'Voltage', 'V', { min: 0 }),
      numberField('current', 'Current', 'A', { min: 0 }),
    ],
    initial: { voltage: '', current: '' },
  },
  {
    id: 'resistance-calculator',
    title: 'Resistance calculator',
    category: 'Electrical',
    description: 'Calculate equivalent resistance for ideal series and parallel resistor networks.',
    fields: [
      {
        name: 'resistors',
        label: 'Resistor values in ohms (comma-separated)',
        type: 'text',
        placeholder: 'Example: 100, 220, 330',
      },
    ],
    initial: { resistors: '' },
  },
  {
    id: 'voltage-current-calculator',
    title: 'Voltage and current calculator',
    category: 'Electronics',
    description: 'Solve voltage or current for a resistive element using Ohm’s law.',
    fields: [
      selectField('solve', 'Solve for', [
        { value: 'voltage', label: 'Voltage (V = I × R)' },
        { value: 'current', label: 'Current (I = V ÷ R)' },
      ]),
      numberField('knownValue', 'Known voltage (V) or current (A)', '', { min: 0 }),
      numberField('resistance', 'Resistance', 'Ω', { min: 0 }),
    ],
    initial: { solve: 'voltage', knownValue: '', resistance: '' },
  },
  {
    id: 'resistor-color-code',
    title: 'Resistor color code calculator',
    category: 'Electronics',
    description:
      'Decode a standard four-band resistor: two significant digits, multiplier, and tolerance.',
    fields: [
      selectField('band1', 'Band 1', digitColorOptions()),
      selectField('band2', 'Band 2', digitColorOptions()),
      selectField('multiplier', 'Multiplier band', multiplierColorOptions()),
      selectField('tolerance', 'Tolerance band', toleranceColorOptions()),
    ],
    initial: { band1: 'brown', band2: 'black', multiplier: 'red', tolerance: 'gold' },
  },
];

function digitColorOptions() {
  return [
    'black',
    'brown',
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'violet',
    'gray',
    'white',
  ].map((color, value) => ({
    value: color,
    label: `${color[0].toUpperCase()}${color.slice(1)} (${value})`,
  }));
}

function multiplierColorOptions() {
  return [
    ['pink', 0.001],
    ['silver', 0.01],
    ['gold', 0.1],
    ...[
      'black',
      'brown',
      'red',
      'orange',
      'yellow',
      'green',
      'blue',
      'violet',
      'gray',
      'white',
    ].map((color, exponent) => [color, 10 ** exponent]),
  ].map(([color, multiplier]) => ({
    value: color,
    label: `${color[0].toUpperCase()}${color.slice(1)} (×${multiplier})`,
  }));
}

function toleranceColorOptions() {
  return [
    ['brown', 1],
    ['red', 2],
    ['green', 0.5],
    ['blue', 0.25],
    ['violet', 0.1],
    ['gray', 0.05],
    ['gold', 5],
    ['silver', 10],
    ['none', 20],
  ].map(([color, tolerance]) => ({
    value: color,
    label: `${color[0].toUpperCase()}${color.slice(1)} (±${tolerance}%)`,
  }));
}

function requiredNumber(
  values,
  name,
  label,
  { min = -Infinity, max = Infinity, integer = false } = {},
) {
  const raw = values[name];
  if (raw === undefined || String(raw).trim() === '') throw new Error(`${label} is required.`);
  const number = Number(raw);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
  if (number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  if (integer && !Number.isSafeInteger(number))
    throw new Error(`${label} must be a whole number within the safe integer range.`);
  return number;
}

export function formatEngineeringNumber(value) {
  if (!Number.isFinite(value))
    throw new Error('The result is outside the supported numeric range.');
  if (Object.is(value, -0) || value === 0) return '0';
  return Number(value.toPrecision(10)).toString();
}

function gcd(a, b) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function convertTemperature(value, from, to) {
  const celsius = from === '°C' ? value : from === '°F' ? ((value - 32) * 5) / 9 : value - 273.15;
  const kelvin = celsius + 273.15;
  if (kelvin < 0) throw new Error('Temperature cannot be below absolute zero.');
  return to === '°C' ? celsius : to === '°F' ? (celsius * 9) / 5 + 32 : kelvin;
}

export function convertUnits(value, group, from, to) {
  if (group === 'temperature') return convertTemperature(value, from, to);
  if (value < 0) throw new Error('This measurement cannot be negative.');
  const units = UNIT_GROUPS[group]?.units;
  if (!units) throw new Error('Choose a supported measurement group.');
  const source = units.find(([unit]) => unit === from);
  const target = units.find(([unit]) => unit === to);
  if (!source || !target) throw new Error('Choose valid source and destination units.');
  return (value * source[1]) / target[1];
}

function parseIntegerInBase(input, base) {
  let text = String(input).trim().toLowerCase();
  if (!text || text.length > 256) throw new Error('Enter a whole number with at most 256 digits.');
  let sign = 1n;
  if (text.startsWith('-')) {
    sign = -1n;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }
  const prefixes = { 2: '0b', 8: '0o', 16: '0x' };
  if (prefixes[base] && text.startsWith(prefixes[base])) text = text.slice(2);
  if (!text) throw new Error('Enter at least one digit.');
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 0n;
  for (const char of text) {
    const digit = digits.indexOf(char);
    if (digit < 0 || digit >= base)
      throw new Error(`“${char}” is not a valid digit in base ${base}.`);
    result = result * BigInt(base) + BigInt(digit);
  }
  return sign * result;
}

function parseScientificExpression(expression, angleUnit) {
  if (typeof expression !== 'string' || expression.trim().length === 0)
    throw new Error('Enter an expression.');
  if (expression.length > 300) throw new Error('Expression must be 300 characters or fewer.');
  const tokens = expression.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[()+\-*/%^]/gi);
  if (!tokens || tokens.join('').toLowerCase() !== expression.replace(/\s+/g, '').toLowerCase()) {
    throw new Error('Expression contains an unsupported character or token.');
  }
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const angle = angleUnit === 'degrees' ? Math.PI / 180 : 1;
  function primary() {
    const token = take();
    if (token === undefined) throw new Error('Expression is incomplete.');
    if (token === '(') {
      const value = expressionValue();
      if (take() !== ')') throw new Error('Parentheses do not match.');
      return value;
    }
    if (/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token)) return Number(token);
    const constants = { pi: Math.PI, e: Math.E };
    if (Object.hasOwn(constants, token.toLowerCase())) return constants[token.toLowerCase()];
    const functions = {
      sin: (value) => Math.sin(value * angle),
      cos: (value) => Math.cos(value * angle),
      tan: (value) => {
        const radians = value * angle;
        if (Math.abs(Math.cos(radians)) < 1e-12) {
          throw new Error('Tangent is undefined for this angle.');
        }
        return Math.tan(radians);
      },
      asin: (value) => Math.asin(value) / angle,
      acos: (value) => Math.acos(value) / angle,
      atan: (value) => Math.atan(value) / angle,
      sqrt: Math.sqrt,
      abs: Math.abs,
      ln: Math.log,
      log: Math.log10,
      exp: Math.exp,
    };
    const fn = functions[token.toLowerCase()];
    if (!fn) throw new Error(`Unknown function or constant “${token}”.`);
    if (take() !== '(') throw new Error(`Function ${token} requires parentheses.`);
    const value = expressionValue();
    if (take() !== ')') throw new Error('Parentheses do not match.');
    return fn(value);
  }
  function power() {
    const base = primary();
    if (peek() === '^') {
      take();
      return base ** unary();
    }
    return base;
  }
  function unary() {
    if (peek() === '+') {
      take();
      return unary();
    }
    if (peek() === '-') {
      take();
      return -unary();
    }
    return power();
  }
  function term() {
    let value = unary();
    while (['*', '/', '%'].includes(peek())) {
      const operator = take();
      const right = unary();
      if ((operator === '/' || operator === '%') && right === 0)
        throw new Error('Cannot divide by zero.');
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
    }
    return value;
  }
  function expressionValue() {
    let value = term();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = term();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }
  const result = expressionValue();
  if (position !== tokens.length) throw new Error(`Unexpected token “${peek()}”.`);
  if (!Number.isFinite(result)) throw new Error('The expression has no finite real result.');
  return result;
}

const colorDigits = {
  black: 0,
  brown: 1,
  red: 2,
  orange: 3,
  yellow: 4,
  green: 5,
  blue: 6,
  violet: 7,
  gray: 8,
  white: 9,
};
const colorMultipliers = {
  pink: 0.001,
  silver: 0.01,
  gold: 0.1,
  black: 1,
  brown: 10,
  red: 100,
  orange: 1000,
  yellow: 10000,
  green: 100000,
  blue: 1000000,
  violet: 10000000,
  gray: 100000000,
  white: 1000000000,
};
const colorTolerances = {
  brown: 1,
  red: 2,
  green: 0.5,
  blue: 0.25,
  violet: 0.1,
  gray: 0.05,
  gold: 5,
  silver: 10,
  none: 20,
};

function calculateArea(values) {
  if (values.shape === 'circle') {
    const radius = requiredNumber(values, 'radius', 'Radius', { min: 0 });
    return {
      value: Math.PI * radius ** 2,
      unit: 'm²',
      explanation: 'Circle area = π × radius².',
      assumptions: 'The input is the circle radius; the result is geometric area.',
    };
  }
  const length = requiredNumber(values, 'length', 'Length', { min: 0 });
  const width = requiredNumber(values, 'width', 'Width / base', { min: 0 });
  const value = values.shape === 'triangle' ? (length * width) / 2 : length * width;
  return {
    value,
    unit: 'm²',
    explanation:
      values.shape === 'triangle'
        ? 'Triangle area = base × perpendicular height ÷ 2.'
        : 'Rectangle area = length × width.',
    assumptions:
      values.shape === 'triangle'
        ? 'The width value is the perpendicular height to the entered base.'
        : 'The shape is a planar rectangle.',
  };
}

function calculateVolume(values) {
  if (values.shape === 'cylinder') {
    const radius = requiredNumber(values, 'radius', 'Radius', { min: 0 });
    const height = requiredNumber(values, 'height', 'Height', { min: 0 });
    return {
      value: Math.PI * radius ** 2 * height,
      unit: 'm³',
      explanation: 'Cylinder volume = π × radius² × height.',
      assumptions: 'The cylinder has a constant circular cross-section and a perpendicular height.',
    };
  }
  const length = requiredNumber(values, 'length', 'Length', { min: 0 });
  const width = requiredNumber(values, 'width', 'Width', { min: 0 });
  const height = requiredNumber(values, 'height', 'Height', { min: 0 });
  return {
    value: length * width * height,
    unit: 'm³',
    explanation: 'Rectangular prism volume = length × width × height.',
    assumptions: 'The shape is a rectangular prism with perpendicular dimensions.',
  };
}

export function calculateEngineeringTool(toolId, values) {
  const tool = ENGINEERING_TOOLS.find((item) => item.id === toolId);
  if (!tool) throw new Error('Choose a valid engineering tool.');
  if (toolId === 'scientific-calculator') {
    const value = parseScientificExpression(values.expression, values.angleUnit);
    return {
      value,
      unit: '',
      explanation:
        'Expression evaluated using standard arithmetic precedence. Trigonometric functions use the selected angle unit.',
      assumptions:
        'Real-number arithmetic only; no implicit multiplication. Functions: sin, cos, tan, asin, acos, atan, sqrt, abs, ln, log, exp; constants: pi, e.',
    };
  }
  if (toolId === 'percentage-calculator') {
    const a = requiredNumber(values, 'a', 'Value A');
    const b = requiredNumber(values, 'b', 'Value B');
    if (values.mode === 'share') {
      if (b === 0) throw new Error('Value B cannot be zero when calculating a share.');
      return {
        value: (a / b) * 100,
        unit: '%',
        explanation: 'Percentage share = A ÷ B × 100.',
        assumptions: 'A and B use the same unit.',
      };
    }
    if (values.mode === 'change') {
      if (a === 0) throw new Error('Starting value A cannot be zero for percentage change.');
      return {
        value: ((b - a) / a) * 100,
        unit: '%',
        explanation: 'Percentage change = (B − A) ÷ A × 100.',
        assumptions:
          'A is the signed starting value; a negative result indicates a decrease for a positive starting value.',
      };
    }
    return {
      value: (a / 100) * b,
      unit: '',
      explanation: 'Percentage amount = A ÷ 100 × B.',
      assumptions: 'A is the percentage and B is the reference value.',
    };
  }
  if (toolId === 'ratio-calculator') {
    const a = requiredNumber(values, 'a', 'First part', { min: 1, integer: true });
    const b = requiredNumber(values, 'b', 'Second part', { min: 1, integer: true });
    const divisor = gcd(a, b);
    const total = a + b;
    return {
      value: `${a / divisor}:${b / divisor}`,
      unit: 'simplified ratio',
      explanation: `The parts are reduced by their greatest common divisor (${divisor}).`,
      details: [
        `First part: ${formatEngineeringNumber((a / total) * 100)}%`,
        `Second part: ${formatEngineeringNumber((b / total) * 100)}%`,
      ],
      assumptions: 'Both parts must be positive whole numbers; this tool handles a two-part ratio.',
    };
  }
  if (toolId === 'unit-converter') {
    const group = values.group;
    const value = requiredNumber(values, 'value', 'Value');
    const result = convertUnits(value, group, values.from, values.to);
    return {
      value: result,
      unit: values.to,
      explanation: `${formatEngineeringNumber(value)} ${values.from} converted to ${values.to}.`,
      assumptions:
        group === 'temperature'
          ? 'Temperature scales are converted using their defined offsets and scale factors.'
          : 'Conversion uses the defined unit factors listed for this tool.',
    };
  }
  if (tool.unitGroup || toolId === 'temperature-converter') {
    const group = toolId === 'temperature-converter' ? 'temperature' : tool.unitGroup;
    const value = requiredNumber(values, 'value', 'Value');
    const result = convertUnits(value, group, values.from, values.to);
    return {
      value: result,
      unit: values.to,
      explanation: `${formatEngineeringNumber(value)} ${values.from} converted to ${values.to}.`,
      assumptions:
        group === 'temperature'
          ? 'Kelvin cannot be below absolute zero.'
          : 'Conversion uses the stated unit definitions and standard gravity is not involved.',
    };
  }
  if (toolId === 'binary-decimal-hex-converter' || toolId === 'number-system-converter') {
    const from = requiredNumber(values, 'fromBase', 'Input base', {
      min: 2,
      max: 36,
      integer: true,
    });
    const to = requiredNumber(values, 'toBase', 'Output base', { min: 2, max: 36, integer: true });
    const result = parseIntegerInBase(values.value, from);
    return {
      value: result.toString(to).toUpperCase(),
      unit: `base ${to}`,
      explanation: `Parsed the input as a signed base-${from} integer and represented it in base ${to}.`,
      assumptions:
        'Whole numbers only; digits use 0–9 and A–Z. Leading 0b, 0o, and 0x prefixes are accepted only for matching bases.',
    };
  }
  if (toolId === 'area-calculator') return calculateArea(values);
  if (toolId === 'volume-calculator') return calculateVolume(values);
  if (toolId === 'material-estimator') {
    const length = requiredNumber(values, 'length', 'Slab length', { min: 0 });
    const width = requiredNumber(values, 'width', 'Slab width', { min: 0 });
    const thickness = requiredNumber(values, 'thickness', 'Slab thickness', { min: 0 });
    const waste = requiredNumber(values, 'waste', 'Allowance', { min: 0, max: 100 });
    const bagYield = requiredNumber(values, 'bagYield', 'Concrete yield per bag', {
      min: Number.EPSILON,
    });
    const baseVolume = length * width * thickness;
    const orderVolume = baseVolume * (1 + waste / 100);
    const bags = Math.ceil((orderVolume * 1000) / bagYield);
    return {
      value: orderVolume,
      unit: 'm³',
      details: [
        `Geometric volume: ${formatEngineeringNumber(baseVolume)} m³`,
        `Volume with allowance: ${formatEngineeringNumber(orderVolume)} m³`,
        `Estimated bags: ${bags}`,
      ],
      explanation:
        'Slab volume = length × width × thickness; allowance is applied to volume before estimating bags.',
      assumptions:
        'Rectangular slab, uniform thickness, no subgrade or formwork allowance. Bag count uses the user-entered yield and rounds up; this estimate is not a structural design or procurement specification.',
    };
  }
  if (toolId === 'ohms-law-calculator') {
    if (values.solve === 'voltage') {
      const current = requiredNumber(values, 'current', 'Current', { min: 0 });
      const resistance = requiredNumber(values, 'resistance', 'Resistance', {
        min: Number.EPSILON,
      });
      return {
        value: current * resistance,
        unit: 'V',
        explanation: 'Voltage = current × resistance (V = I × R).',
        assumptions:
          'Ideal lumped resistive element; component limits, AC impedance, temperature, and transient effects are not modeled.',
      };
    }
    if (values.solve === 'current') {
      const voltage = requiredNumber(values, 'voltage', 'Voltage', { min: 0 });
      const resistance = requiredNumber(values, 'resistance', 'Resistance', {
        min: Number.EPSILON,
      });
      return {
        value: voltage / resistance,
        unit: 'A',
        explanation: 'Current = voltage ÷ resistance (I = V ÷ R).',
        assumptions:
          'Ideal lumped resistive element; component limits, AC impedance, temperature, and transient effects are not modeled.',
      };
    }
    const voltage = requiredNumber(values, 'voltage', 'Voltage', { min: 0 });
    const current = requiredNumber(values, 'current', 'Current', { min: Number.EPSILON });
    return {
      value: voltage / current,
      unit: 'Ω',
      explanation: 'Resistance = voltage ÷ current (R = V ÷ I).',
      assumptions: 'Ideal lumped resistive element; current must be nonzero.',
    };
  }
  if (toolId === 'electrical-power-calculator') {
    const voltage = requiredNumber(values, 'voltage', 'Voltage', { min: 0 });
    const current = requiredNumber(values, 'current', 'Current', { min: 0 });
    return {
      value: voltage * current,
      unit: 'W',
      explanation: 'Ideal DC power = voltage × current (P = V × I).',
      assumptions:
        'Assumes DC or purely resistive conditions where real power equals V × I; power factor and AC waveform effects are not included.',
    };
  }
  if (toolId === 'resistance-calculator') {
    const entries = String(values.resistors || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (entries.length < 2 || entries.length > 50)
      throw new Error('Enter between 2 and 50 resistor values.');
    const resistors = entries.map((item, index) => {
      const resistance = Number(item);
      if (!Number.isFinite(resistance) || resistance <= 0)
        throw new Error(`Resistor ${index + 1} must be a positive finite resistance in ohms.`);
      return resistance;
    });
    const series = resistors.reduce((sum, resistance) => sum + resistance, 0);
    const parallel = 1 / resistors.reduce((sum, resistance) => sum + 1 / resistance, 0);
    return {
      value: `Series ${formatEngineeringNumber(series)} Ω · Parallel ${formatEngineeringNumber(parallel)} Ω`,
      unit: 'equivalent resistance',
      explanation:
        'Series resistance is the sum; parallel resistance is the reciprocal of the sum of reciprocals.',
      assumptions:
        'Ideal resistors connected in one series chain or one parallel network; lead resistance, tolerance, and temperature effects are ignored.',
    };
  }
  if (toolId === 'voltage-current-calculator') {
    const known = requiredNumber(values, 'knownValue', 'Known voltage or current', { min: 0 });
    const resistance = requiredNumber(values, 'resistance', 'Resistance', { min: Number.EPSILON });
    return values.solve === 'voltage'
      ? {
          value: known * resistance,
          unit: 'V',
          explanation: 'Voltage = current × resistance (V = I × R).',
          assumptions: 'Known value is current in amperes; ideal resistive DC model only.',
        }
      : {
          value: known / resistance,
          unit: 'A',
          explanation: 'Current = voltage ÷ resistance (I = V ÷ R).',
          assumptions: 'Known value is voltage in volts; ideal resistive DC model only.',
        };
  }
  if (toolId === 'resistor-color-code') {
    const significant = colorDigits[values.band1] * 10 + colorDigits[values.band2];
    const resistance = significant * colorMultipliers[values.multiplier];
    const tolerance = colorTolerances[values.tolerance];
    const minResistance = resistance * (1 - tolerance / 100);
    const maxResistance = resistance * (1 + tolerance / 100);
    return {
      value: `${formatEngineeringNumber(resistance)} Ω ±${formatEngineeringNumber(tolerance)}%`,
      unit: '4-band resistor',
      details: [
        `Tolerance range: ${formatEngineeringNumber(minResistance)}–${formatEngineeringNumber(maxResistance)} Ω`,
      ],
      explanation:
        'The first two bands are significant digits, the third is the multiplier, and the fourth is tolerance.',
      assumptions:
        'Standard four-band resistor color code; temperature coefficient and power rating are not encoded by these bands.',
    };
  }
  throw new Error('This calculator is not yet configured.');
}

export function getToolFieldOptions(tool, field, values) {
  if (field.type !== 'dynamic-unit') return field.options || [];
  const group = UNIT_GROUPS[values.group];
  return group ? unitOptions(values.group) : [];
}
