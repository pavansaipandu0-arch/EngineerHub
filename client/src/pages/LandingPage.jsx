import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  Atom,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  CircuitBoard,
  Cog,
  Compass,
  Cpu,
  DraftingCompass,
  FlaskConical,
  Layers3,
  LockKeyhole,
  Menu,
  Moon,
  Network,
  Orbit,
  Radio,
  ShieldCheck,
  Sigma,
  Sun,
  UsersRound,
  Workflow,
  X,
} from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Badge, Button, ErrorState, LoadingSkeleton, Tooltip } from '../components/ui.jsx';

const branches = [
  { icon: CircuitBoard, name: 'Electrical', detail: 'Power, electronics & control systems' },
  { icon: Cog, name: 'Mechanical', detail: 'Machines, materials & manufacturing' },
  { icon: Workflow, name: 'Computer', detail: 'Software, systems & computation' },
  { icon: DraftingCompass, name: 'Civil', detail: 'Infrastructure & the built environment' },
  { icon: FlaskConical, name: 'Chemical', detail: 'Process, energy & applied chemistry' },
  { icon: Cpu, name: 'More disciplines', detail: 'Interdisciplinary work belongs here, too' },
];

const platformPrinciples = [
  {
    icon: LockKeyhole,
    title: 'Private by default',
    detail:
      'Member accounts use secure sessions, and administrative controls stay behind role checks.',
  },
  {
    icon: Layers3,
    title: 'One configurable foundation',
    detail: 'Administrators can manage which platform modules are enabled for their workspace.',
  },
  {
    icon: Orbit,
    title: 'Made for engineering',
    detail: 'A focused starting point for the people who design, research, build, and learn.',
  },
];

const areas = [
  {
    id: 'community',
    eyebrow: 'PEOPLE & PERSPECTIVES',
    icon: UsersRound,
    title: 'Engineering is a team sport.',
    detail:
      'A home designed for students, practicing engineers, researchers, and teams to meet around the work they care about.',
    points: [
      'Connect across disciplines',
      'Share perspectives and experience',
      'Find your next collaborator',
    ],
    className: 'landing-community',
  },
  {
    id: 'projects',
    eyebrow: 'IDEAS INTO PRACTICE',
    icon: Workflow,
    title: 'Make room for ambitious work.',
    detail:
      'EngineerHub is being shaped around the way engineering projects move from a question to a considered design.',
    points: [
      'Keep engineering work in context',
      'Bring contributors together',
      'Give ideas room to develop',
    ],
    className: 'landing-projects',
  },
  {
    id: 'tools',
    eyebrow: 'A THOUGHTFUL TOOLKIT',
    icon: Boxes,
    title: 'The right tools, in one place.',
    detail:
      'The platform starts with a secure account system and an administrator-managed module foundation. Its configured modules are listed in the live workspace.',
    points: [
      'Secure member accounts',
      'Configurable platform modules',
      'Workspace controls for administrators',
    ],
    className: 'landing-tools',
  },
  {
    id: 'learning',
    eyebrow: 'KNOWLEDGE THAT TRAVELS',
    icon: BookOpen,
    title: 'Stay curious. Keep building.',
    detail:
      'A shared engineering space should make it easier to carry useful knowledge from study and research into practical work.',
    points: [
      'Learn across engineering fields',
      'Keep research and practice connected',
      'Build on a foundation of curiosity',
    ],
    className: 'landing-learning',
  },
];

const faqs = [
  {
    question: 'Who is EngineerHub for?',
    answer:
      'EngineerHub is being built for engineering students, working engineers, developers, researchers, and teams across engineering disciplines.',
  },
  {
    question: 'How do I create an account?',
    answer:
      'Choose Get started to register with your name, email address, and password. Passwords are securely hashed, and sessions use HTTP-only cookies.',
  },
  {
    question: 'What can I do in the workspace today?',
    answer:
      'Members can sign in and view the platform modules enabled in their workspace. Administrators can manage module availability. Each module’s operational tools need to be implemented before they are presented as working features.',
  },
  {
    question: 'How are platform modules managed?',
    answer:
      'Workspace administrators can enable or disable configured modules and set the message members see when a module is unavailable.',
  },
  {
    question: 'Is EngineerHub available for every engineering discipline?',
    answer:
      'The platform is designed for engineering work across disciplines. The branches shown here describe the breadth of that audience; they are not a directory of active communities.',
  },
];

function Brand({ onClick }) {
  return (
    <Link aria-label="EngineerHub home" className="landing-brand" onClick={onClick} to="/">
      <span className="landing-brand-mark">
        <Atom aria-hidden="true" size={20} strokeWidth={2.2} />
      </span>
      <span>
        engineer<span className="landing-brand-accent">hub</span>
      </span>
    </Link>
  );
}

function LandingNavigation({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="landing-header">
      <div className="landing-nav-wrap">
        <Brand onClick={closeMenu} />
        <button
          aria-controls="landing-nav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          className="landing-menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav
          aria-label="Main navigation"
          className={`landing-nav ${menuOpen ? 'landing-nav-open' : ''}`}
          id="landing-nav"
        >
          <a href="#disciplines" onClick={closeMenu}>
            Disciplines
          </a>
          <a href="#platform" onClick={closeMenu}>
            Platform
          </a>
          <a href="#community" onClick={closeMenu}>
            Community
          </a>
          <a href="#learning" onClick={closeMenu}>
            Learning
          </a>
          <div className="landing-nav-actions">
            {user ? (
              <Link className="landing-nav-signin" onClick={closeMenu} to="/workspace">
                Open workspace
              </Link>
            ) : (
              <>
                <Link className="landing-nav-signin" onClick={closeMenu} to="/login">
                  Sign in
                </Link>
                <Link className="landing-nav-cta" onClick={closeMenu} to="/register">
                  Get started <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function PlatformModules() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/features/public');
      if (!Array.isArray(data.features)) {
        const error = new Error(
          'The API response did not contain a valid module list. Check VITE_API_URL.',
        );
        error.code = 'API_RESPONSE_INVALID';
        throw error;
      }
      setFeatures(data.features);
    } catch (requestError) {
      setError(
        requestError.code === 'API_RESPONSE_INVALID'
          ? requestError.message
          : requestError.response?.data?.message ||
              'Could not reach the EngineerHub API. Check the deployed API URL and CORS settings.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  return (
    <div className="landing-modules">
      <div className="landing-modules-heading">
        <div>
          <Badge dot tone="success">
            Live configuration
          </Badge>
          <h3>Workspace modules</h3>
          <p>These are the modules currently enabled in EngineerHub.</p>
        </div>
        <Link className="landing-inline-link" to="/workspace">
          View workspace <ArrowRight size={15} />
        </Link>
      </div>
      {loading ? (
        <div aria-label="Loading configured modules" className="landing-module-grid">
          {[1, 2, 3].map((item) => (
            <div className="landing-module-skeleton" key={item}>
              <LoadingSkeleton lines={3} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          action={
            <Button onClick={loadFeatures} variant="secondary">
              Try again
            </Button>
          }
          description={error}
          title="Module list unavailable"
        />
      ) : features.length > 0 ? (
        <div className="landing-module-grid">
          {features.map((feature) => (
            <article className="landing-module-card" key={feature.key}>
              <span className="landing-module-icon">
                <Layers3 aria-hidden="true" size={18} />
              </span>
              <div>
                <h4>{feature.name}</h4>
                <p>{feature.description}</p>
              </div>
              <span className="landing-module-status">
                <Check aria-hidden="true" size={13} />
                <span>Enabled</span>
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="landing-modules-empty">No modules are currently enabled for the platform.</p>
      )}
      <p className="landing-module-note">
        <ShieldCheck aria-hidden="true" size={15} /> An enabled module is a configuration status,
        not a claim that every tool within it is implemented.
      </p>
    </div>
  );
}

function Questions() {
  return (
    <div className="landing-faq-list">
      {faqs.map((item) => (
        <details className="landing-faq-item" key={item.question}>
          <summary>
            {item.question}
            <ChevronDown aria-hidden="true" size={17} />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const title = 'EngineerHub — One Platform. Every Engineer.';
    const description =
      'A secure, configurable engineering workspace for students, engineers, researchers, developers, and teams.';
    document.title = title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.content;
    if (metaDescription) metaDescription.content = description;
    const openGraphTitle = document.querySelector('meta[property="og:title"]');
    const previousOpenGraphTitle = openGraphTitle?.content;
    if (openGraphTitle) openGraphTitle.content = title;
    const openGraphDescription = document.querySelector('meta[property="og:description"]');
    const previousOpenGraphDescription = openGraphDescription?.content;
    if (openGraphDescription) openGraphDescription.content = description;

    return () => {
      document.title = 'EngineerHub — Engineering, connected';
      if (metaDescription && previousDescription !== undefined)
        metaDescription.content = previousDescription;
      if (openGraphTitle && previousOpenGraphTitle !== undefined)
        openGraphTitle.content = previousOpenGraphTitle;
      if (openGraphDescription && previousOpenGraphDescription !== undefined)
        openGraphDescription.content = previousOpenGraphDescription;
    };
  }, []);

  const signupTarget = user ? '/workspace' : '/register';
  const exploreTarget = user ? '/workspace' : '/login';

  return (
    <div className="landing-page">
      <LandingNavigation user={user} />

      <main>
        <section className="landing-hero" id="top">
          <div className="landing-hero-glow" />
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-eyebrow">
                <span /> A WORKSPACE BUILT AROUND ENGINEERING
              </div>
              <h1>
                One Platform.
                <br />
                Every Engineer.
                <br />
                <span>Endless Possibilities.</span>
              </h1>
              <p className="landing-hero-description">
                A thoughtful, configurable home for engineering students, professionals,
                researchers, and teams to bring their work together.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button landing-button-primary" to={signupTarget}>
                  {user ? 'Open your workspace' : 'Get started'} <ArrowRight size={16} />
                </Link>
                <a className="landing-button landing-button-secondary" href="#platform">
                  Explore platform <ArrowDown size={16} />
                </a>
              </div>
              <div className="landing-hero-trust">
                <ShieldCheck size={16} />
                <span>Secure accounts</span>
                <i />
                <span>Admin-managed modules</span>
                <i />
                <span>Built for every discipline</span>
              </div>
            </div>
            <div
              aria-label="Engineering disciplines connected in one workspace"
              className="landing-hero-art"
              role="img"
            >
              <div className="landing-art-grid" />
              <div className="landing-art-orbit landing-art-orbit-a" />
              <div className="landing-art-orbit landing-art-orbit-b" />
              <div className="landing-art-chip landing-art-chip-top">
                <CircuitBoard size={16} /> Systems
              </div>
              <div className="landing-art-chip landing-art-chip-side">
                <Sigma size={16} /> Research
              </div>
              <div className="landing-art-chip landing-art-chip-bottom">
                <Network size={16} /> Together
              </div>
              <div className="landing-art-center">
                <span className="landing-art-center-mark">
                  <Atom size={45} />
                </span>
                <span className="landing-art-center-name">
                  engineer<span>hub</span>
                </span>
                <span className="landing-art-center-caption">ENGINEERING, CONNECTED</span>
              </div>
              <div className="landing-art-node landing-art-node-one">
                <Cog size={17} />
              </div>
              <div className="landing-art-node landing-art-node-two">
                <Radio size={17} />
              </div>
              <div className="landing-art-node landing-art-node-three">
                <FlaskConical size={17} />
              </div>
            </div>
          </div>
          <div className="landing-container landing-hero-bottom">
            <span>FOR THE PEOPLE WHO BUILD WHAT’S NEXT</span>
            <a href="#disciplines">
              Discover the disciplines <ArrowDown size={14} />
            </a>
          </div>
        </section>

        <section
          aria-labelledby="disciplines-title"
          className="landing-section landing-disciplines"
          id="disciplines"
        >
          <div className="landing-container">
            <div className="landing-section-heading landing-section-heading-center">
              <span className="landing-section-kicker">A WIDE-OPEN FIELD</span>
              <h2 id="disciplines-title">
                Engineering has many languages.
                <br />
                <span>They belong in the same conversation.</span>
              </h2>
              <p>
                From infrastructure to intelligent systems, EngineerHub is designed for the breadth
                of engineering work.
              </p>
            </div>
            <div className="landing-branch-grid">
              {branches.map(({ icon: Icon, name, detail }, index) => (
                <article className="landing-branch-card" key={name}>
                  <span className={`landing-branch-icon landing-branch-icon-${index + 1}`}>
                    <Icon aria-hidden="true" size={21} />
                  </span>
                  <h3>{name}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="platform-title"
          className="landing-section landing-platform"
          id="platform"
        >
          <div className="landing-container">
            <div className="landing-platform-intro">
              <div className="landing-section-heading">
                <span className="landing-section-kicker">A SOLID FOUNDATION</span>
                <h2 id="platform-title">
                  Useful by design.
                  <br />
                  <span>Configurable by your team.</span>
                </h2>
                <p>
                  EngineerHub begins with secure accounts, a workspace dashboard, and a live module
                  registry managed by administrators.
                </p>
              </div>
              <div className="landing-platform-principles">
                {platformPrinciples.map(({ icon: Icon, title, detail }) => (
                  <article className="landing-principle" key={title}>
                    <span>
                      <Icon aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <PlatformModules />
          </div>
        </section>

        {areas.map(({ id, eyebrow, icon: Icon, title, detail, points, className }, index) => (
          <section
            aria-labelledby={`${id}-title`}
            className={`landing-section landing-area ${className}`}
            id={id}
            key={id}
          >
            <div
              className={`landing-container landing-area-grid ${index % 2 ? 'landing-area-reverse' : ''}`}
            >
              <div className="landing-area-visual">
                <div aria-hidden="true" className="landing-area-visual-grid" />
                <div className="landing-area-main-card">
                  <span className="landing-area-main-icon">
                    <Icon size={24} />
                  </span>
                  <span className="landing-area-label">{eyebrow}</span>
                  <strong>
                    {id === 'community'
                      ? 'Different disciplines.'
                      : id === 'projects'
                        ? 'From first sketch'
                        : id === 'tools'
                          ? 'A focused foundation.'
                          : 'Curiosity, in motion.'}
                  </strong>
                  <span className="landing-area-line" />
                  <span className="landing-area-small">
                    {id === 'community'
                      ? 'One engineering conversation.'
                      : id === 'projects'
                        ? 'To a shared direction.'
                        : id === 'tools'
                          ? 'Managed with care.'
                          : 'Across every field.'}
                  </span>
                </div>
                <div className="landing-area-floating">
                  <Check size={15} /> Built with engineers in mind
                </div>
              </div>
              <div className="landing-area-copy">
                <span className="landing-section-kicker">{eyebrow}</span>
                <h2 id={`${id}-title`}>{title}</h2>
                <p>{detail}</p>
                <ul>
                  {points.map((point) => (
                    <li key={point}>
                      <Check aria-hidden="true" size={15} />
                      {point}
                    </li>
                  ))}
                </ul>
                {id === 'tools' && (
                  <Link className="landing-inline-link" to={exploreTarget}>
                    Explore the workspace <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </div>
          </section>
        ))}

        <section
          aria-labelledby="careers-title"
          className="landing-section landing-careers"
          id="careers"
        >
          <div className="landing-container landing-careers-inner">
            <div className="landing-careers-icon">
              <Compass aria-hidden="true" size={25} />
            </div>
            <div>
              <span className="landing-section-kicker">CAREER OPPORTUNITIES</span>
              <h2 id="careers-title">
                Find your direction
                <br />
                in a world of engineering.
              </h2>
              <p>
                Engineering careers span industries, disciplines, and challenges. Explore the fields
                that interest you, develop your practice, and connect with people who understand the
                work you want to do.
              </p>
            </div>
            <Link className="landing-button landing-button-light" to={signupTarget}>
              {user ? 'Open your workspace' : 'Find your place here'} <ArrowRight size={16} />
            </Link>
            <div aria-hidden="true" className="landing-careers-orbit" />
          </div>
        </section>

        <section aria-labelledby="faq-title" className="landing-section landing-faq" id="faq">
          <div className="landing-container landing-faq-grid">
            <div className="landing-section-heading">
              <span className="landing-section-kicker">GOOD QUESTIONS</span>
              <h2 id="faq-title">
                A few things
                <br />
                worth knowing.
              </h2>
              <p>Clear answers about the platform and what’s available today.</p>
              <a
                className="landing-inline-link"
                href="mailto:support@engineerhub.app?subject=EngineerHub%20question"
              >
                Ask us directly <ArrowRight size={15} />
              </a>
            </div>
            <Questions />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div className="landing-footer-brand">
              <Brand />
              <p>A considered home for the people who engineer what’s next.</p>
              <a href="mailto:support@engineerhub.app">support@engineerhub.app</a>
            </div>
            <div className="landing-footer-links">
              <div>
                <h2>Explore</h2>
                <a href="#disciplines">Disciplines</a>
                <a href="#platform">Platform</a>
                <a href="#community">Community</a>
                <a href="#learning">Learning</a>
              </div>
              <div>
                <h2>Your account</h2>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create account</Link>
                <Link to={user ? '/workspace' : '/login'}>Workspace</Link>
                <a href="#faq">FAQs</a>
              </div>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} EngineerHub</span>
            <span>Built for curious minds and practical thinkers.</span>
            <Tooltip label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              <Button
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                className="landing-theme-button"
                onClick={toggleTheme}
                size="icon"
                variant="ghost"
              >
                {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              </Button>
            </Tooltip>
          </div>
        </div>
      </footer>
    </div>
  );
}
