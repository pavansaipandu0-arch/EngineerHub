import { useMemo, useState } from 'react';
import { Activity, Calculator, Cpu, RotateCcw, Search, Trash2, Wrench, Zap } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Select } from '../components/ui.jsx';
import {
  calculateEngineeringTool,
  ENGINEERING_TOOLS,
  formatEngineeringNumber,
  getToolFieldOptions,
} from '../utils/engineeringTools.js';

const categoryIcons = {
  General: Calculator,
  'Computer Science': Cpu,
  Mechanical: Wrench,
  Civil: Activity,
  Electrical: Zap,
  Electronics: Cpu,
};

const categories = ['All tools', ...new Set(ENGINEERING_TOOLS.map((tool) => tool.category))];

function isFieldVisible(toolId, values, fieldName) {
  if (toolId === 'area-calculator') {
    if (fieldName === 'radius') return values.shape === 'circle';
    if (fieldName === 'length' || fieldName === 'width') return values.shape !== 'circle';
  }
  if (toolId === 'volume-calculator') {
    if (fieldName === 'length' || fieldName === 'width') return values.shape === 'prism';
    if (fieldName === 'radius') return values.shape === 'cylinder';
  }
  if (toolId === 'ohms-law-calculator') {
    if (fieldName === 'voltage') return values.solve !== 'voltage';
    if (fieldName === 'current') return values.solve !== 'current';
    if (fieldName === 'resistance') return values.solve !== 'resistance';
  }
  return true;
}

function initialValues(tool, clear = false) {
  if (!clear) return { ...tool.initial };
  const selects = new Set(
    tool.fields.filter((field) => field.type === 'select').map((field) => field.name),
  );
  return Object.fromEntries(
    Object.entries(tool.initial).map(([name, value]) => [name, selects.has(name) ? value : '']),
  );
}

export default function EngineeringToolsPage() {
  const [selectedId, setSelectedId] = useState(ENGINEERING_TOOLS[0].id);
  const [category, setCategory] = useState('All tools');
  const [search, setSearch] = useState('');
  const [values, setValues] = useState(() => initialValues(ENGINEERING_TOOLS[0]));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const tool = ENGINEERING_TOOLS.find((item) => item.id === selectedId) || ENGINEERING_TOOLS[0];

  const visibleTools = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ENGINEERING_TOOLS.filter((item) => {
      const matchesCategory = category === 'All tools' || item.category === category;
      const matchesSearch =
        !query ||
        `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  function chooseTool(nextTool) {
    setSelectedId(nextTool.id);
    setValues(initialValues(nextTool));
    setResult(null);
    setError('');
  }

  function updateValue(name, value) {
    if (name === 'group') {
      const options = getToolFieldOptions(
        tool,
        { type: 'dynamic-unit' },
        { ...values, group: value },
      );
      setValues((current) => ({
        ...current,
        group: value,
        from: options[0]?.value || '',
        to: options[1]?.value || '',
      }));
    } else {
      setValues((current) => ({ ...current, [name]: value }));
    }
    setResult(null);
    setError('');
  }

  function calculate(event) {
    event.preventDefault();
    try {
      const calculated = calculateEngineeringTool(tool.id, values);
      const entry = {
        id: `${Date.now()}-${Math.random()}`,
        title: tool.title,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: calculated,
      };
      setResult(calculated);
      setError('');
      setHistory((items) => [entry, ...items].slice(0, 10));
    } catch (calculationError) {
      setResult(null);
      setError(calculationError.message || 'Check the values and try again.');
    }
  }

  function clearInputs() {
    setValues(initialValues(tool, true));
    setResult(null);
    setError('');
  }

  function resetTool() {
    setValues(initialValues(tool));
    setResult(null);
    setError('');
  }

  const ResultIcon = categoryIcons[tool.category] || Calculator;

  return (
    <div className="workspace-page engineering-tools-page">
      <header className="page-heading">
        <div>
          <div className="eyebrow">ENGINEERING WORKSPACE</div>
          <h1>Engineering Tools Center</h1>
          <p>Practical calculators and unit conversions with formulas and assumptions shown.</p>
        </div>
        <Badge tone="brand">
          <Calculator size={14} /> {ENGINEERING_TOOLS.length} tools
        </Badge>
      </header>

      <section className="tools-disclaimer" role="note">
        <strong>Engineering use notice</strong>
        <span>
          These tools provide basic calculations only. They are not substitutes for professional
          engineering design, standards review, or safety verification. Verify inputs, units,
          assumptions, and results independently.
        </span>
      </section>

      <div className="tools-browser">
        <Card className="tools-directory">
          <div className="tools-directory-header">
            <h2>Find a tool</h2>
            <span>{visibleTools.length} shown</span>
          </div>
          <div className="tools-filters">
            <label className="tools-search">
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="Search engineering tools"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search calculators"
                value={search}
              />
            </label>
            <Select
              aria-label="Filter by engineering branch"
              onChange={(event) => setCategory(event.target.value)}
              options={categories.map((value) => ({ value, label: value }))}
              value={category}
            />
          </div>
          <div className="tools-list" role="list" aria-label="Engineering tools">
            {visibleTools.map((item) => {
              const Icon = categoryIcons[item.category] || Calculator;
              return (
                <button
                  aria-current={item.id === tool.id ? 'true' : undefined}
                  className={`tool-choice ${item.id === tool.id ? 'tool-choice-active' : ''}`}
                  key={item.id}
                  onClick={() => chooseTool(item)}
                  type="button"
                >
                  <span className="tool-choice-icon">
                    <Icon size={16} />
                  </span>
                  <span className="tool-choice-copy">
                    <strong>{item.title}</strong>
                    <small>{item.category}</small>
                  </span>
                </button>
              );
            })}
            {!visibleTools.length && (
              <EmptyState title="No tools match" description="Try another search or category." />
            )}
          </div>
        </Card>

        <div className="tools-work-area">
          <Card className="tool-calculator">
            <div className="tool-calculator-heading">
              <span className="tool-heading-icon">
                <ResultIcon size={20} />
              </span>
              <div>
                <div className="eyebrow">{tool.category}</div>
                <h2>{tool.title}</h2>
              </div>
            </div>
            <p className="tool-description">{tool.description}</p>
            <form className="tool-form" onSubmit={calculate}>
              <div className="tool-input-grid">
                {tool.fields
                  .filter((field) => isFieldVisible(tool.id, values, field.name))
                  .map((field) => {
                    const label = field.unit ? `${field.label} (${field.unit})` : field.label;
                    if (field.type === 'select' || field.type === 'dynamic-unit') {
                      return (
                        <Select
                          key={field.name}
                          label={field.label}
                          onChange={(event) => updateValue(field.name, event.target.value)}
                          options={getToolFieldOptions(tool, field, values)}
                          required
                          value={values[field.name] ?? ''}
                        />
                      );
                    }
                    return (
                      <Input
                        key={field.name}
                        autoComplete="off"
                        label={label}
                        max={field.max}
                        min={field.min}
                        onChange={(event) => updateValue(field.name, event.target.value)}
                        placeholder={field.placeholder}
                        required
                        step={field.step || (field.type === 'number' ? 'any' : undefined)}
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={values[field.name] ?? ''}
                      />
                    );
                  })}
              </div>
              <div className="tool-form-actions">
                <Button type="submit">
                  <Calculator size={16} /> Calculate
                </Button>
                <Button onClick={clearInputs} variant="secondary">
                  <Trash2 size={15} /> Clear
                </Button>
                <Button onClick={resetTool} variant="ghost">
                  <RotateCcw size={15} /> Reset
                </Button>
              </div>
            </form>

            {error && (
              <p className="tool-error" role="alert">
                {error}
              </p>
            )}
            {result && (
              <section aria-label="Calculation result" className="tool-result" role="status">
                <div className="tool-result-label">RESULT</div>
                <div className="tool-result-value">
                  <strong>
                    {typeof result.value === 'number'
                      ? formatEngineeringNumber(result.value)
                      : result.value}
                  </strong>
                  {result.unit && <span>{result.unit}</span>}
                </div>
                {result.details?.length > 0 && (
                  <ul className="tool-result-details">
                    {result.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
                <p>
                  <strong>Formula:</strong> {result.explanation}
                </p>
                <p>
                  <strong>Assumptions &amp; limitations:</strong> {result.assumptions}
                </p>
              </section>
            )}
          </Card>

          <Card className="tool-history">
            <div className="tools-directory-header">
              <div>
                <div className="eyebrow">THIS SESSION</div>
                <h2>Calculation history</h2>
              </div>
              <Button
                disabled={!history.length}
                onClick={() => setHistory([])}
                size="sm"
                variant="ghost"
              >
                Clear history
              </Button>
            </div>
            {history.length ? (
              <ol className="tool-history-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.createdAt}</small>
                    </span>
                    <span className="tool-history-result">
                      {typeof item.result.value === 'number'
                        ? formatEngineeringNumber(item.result.value)
                        : item.result.value}{' '}
                      {item.result.unit}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tool-history-empty">
                Your calculations will be listed here until you leave this page.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
