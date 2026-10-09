import {
  ArrowUpRight,
  Check,
  CheckCheck,
  Monitor,
  Moon,
  Orbit,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { accentNames, accents, modes } from './appearance'
import { useAppearance } from './context'
import './settings.css'

const modeDetails = {
  light: {
    title: 'Light',
    description: 'A little daylight for your ideas.',
    icon: Sun,
  },
  dark: {
    title: 'Dark',
    description: 'Find your focus after hours.',
    icon: Moon,
  },
  system: {
    title: 'System',
    description: 'Follow your device’s appearance.',
    icon: Monitor,
  },
}

export function SettingsPage() {
  const { preferences, resolvedTheme, update, reset, error } = useAppearance()
  const accent = accents[preferences.accent]
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Palette size={13} /> A WORKSPACE THAT FEELS LIKE YOU
          </p>
          <h1>
            Settings<span>.</span>
          </h1>
          <p>Make a little space for your own style.</p>
        </div>
        <span className="settings-save-state">
          <CheckCheck size={16} />
          {error ? 'Session preferences' : 'Saved automatically'}
        </span>
      </div>
      <div className="settings-section-label">
        <Palette size={16} />
        Personalization
      </div>
      {error && (
        <p role="alert" className="settings-notice">
          {error}
        </p>
      )}
      <div className="settings-grid">
        <div className="settings-controls">
          <section
            className="settings-panel"
            aria-labelledby="appearance-heading"
          >
            <div className="settings-panel-heading">
              <span className="settings-icon">
                <Sun size={20} />
              </span>
              <div>
                <h2 id="appearance-heading">Appearance</h2>
                <p>Set the atmosphere for your next great idea.</p>
              </div>
            </div>
            <fieldset className="appearance-options">
              <legend className="sr-only">Appearance mode</legend>
              {modes.map((mode) => {
                const details = modeDetails[mode]
                const Icon = details.icon
                return (
                  <label
                    key={mode}
                    className={`appearance-option ${preferences.mode === mode ? 'is-selected' : ''}`}
                  >
                    <input
                      className="appearance-input"
                      type="radio"
                      name="appearance"
                      value={mode}
                      checked={preferences.mode === mode}
                      onChange={() => update({ mode })}
                      aria-label={details.title}
                    />
                    <span
                      className={`mode-thumbnail mode-thumbnail--${mode}`}
                      aria-hidden="true"
                    >
                      <span className="mini-sidebar">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="mini-canvas">
                        <i />
                        <span>
                          <i />
                          <i />
                        </span>
                      </span>
                    </span>
                    <span className="mode-name">
                      <Icon size={15} />
                      {details.title}
                      <span className="radio-check">
                        {preferences.mode === mode && <Check size={11} />}
                      </span>
                    </span>
                    <span className="mode-description">
                      {details.description}
                    </span>
                  </label>
                )
              })}
            </fieldset>
            <p className="appearance-status" role="status">
              <span className="status-dot" />
              {preferences.mode === 'system'
                ? `Following your system — currently ${resolvedTheme} mode.`
                : `${modeDetails[preferences.mode].title} mode is on.`}
            </p>
          </section>
          <section className="settings-panel" aria-labelledby="accent-heading">
            <div className="settings-panel-heading">
              <span className="settings-icon">
                <Palette size={20} />
              </span>
              <div>
                <h2 id="accent-heading">Accent color</h2>
                <p>Give your orbit a signature color.</p>
              </div>
            </div>
            <fieldset className="accent-options">
              <legend className="sr-only">Accent color</legend>
              {accentNames.map((name) => (
                <label
                  className={`accent-option ${preferences.accent === name ? 'is-selected' : ''}`}
                  key={name}
                >
                  <input
                    className="appearance-input"
                    type="radio"
                    name="accent"
                    value={name}
                    checked={preferences.accent === name}
                    onChange={() => update({ accent: name })}
                    aria-label={accents[name].name}
                  />
                  <span
                    className="accent-swatch"
                    style={{ background: accents[name].fill }}
                    aria-hidden="true"
                  >
                    {preferences.accent === name && <Check size={18} />}
                  </span>
                  <span>{accents[name].name}</span>
                </label>
              ))}
            </fieldset>
            <div className="accent-description">
              <Sparkles size={15} />
              <p>
                Your buttons, highlights, planet artwork, and browser-tab icon
                all share your chosen color.
              </p>
            </div>
          </section>
          <div className="settings-bottom">
            <p>Preferences apply instantly and stay in this browser.</p>
            <button
              className="text-button settings-reset"
              onClick={reset}
              disabled={
                preferences.mode === 'system' &&
                preferences.accent === 'green' &&
                !error
              }
            >
              <RotateCcw size={13} />
              Restore defaults
            </button>
          </div>
        </div>
        <aside
          className="appearance-preview"
          aria-label="Live appearance preview"
        >
          <div className="preview-heading">
            <span className="eyebrow">A LOOK INTO YOUR ORBIT</span>
            <span className="badge">Live preview</span>
          </div>
          <div className="settings-planet hero">
            <div className="hero-content">
              <span className="hero-label">
                <span className="status-dot" />
                MADE FOR YOUR UNIVERSE
              </span>
              <h2>
                Same big ideas.
                <br />
                Your own atmosphere.
              </h2>
            </div>
          </div>
          <div className="preview-workspace">
            <div className="preview-project">
              <span className="project-icon project-icon--mint">
                <Orbit size={22} />
              </span>
              <div>
                <strong>Your next big idea</strong>
                <span>A little closer to launch.</span>
              </div>
              <span className="badge badge--green">In orbit</span>
            </div>
            <div className="preview-progress">
              <span>Room for possibilities</span>
              <strong>67%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: '67%' }} />
            </div>
            <Link className="button button--primary" to="/">
              View your dashboard
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="preview-footer">
            <div className="tab-preview">
              <span className="tab-icon">
                <Orbit size={15} />
              </span>
              <span>DevOrbit</span>
            </div>
            <span>
              {accent.name} · {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
