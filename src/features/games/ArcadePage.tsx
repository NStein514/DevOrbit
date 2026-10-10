import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gamepad2, LockKeyhole, Timer, Trophy } from 'lucide-react'
import { usePomodoro } from '../pomodoro/context'
import { formatTime } from '../pomodoro/model'
import { art } from './art'
import { ARCADE_KEY, readRecord } from './records'
import './games.css'

const futureGames = [
  'Lunar Landing',
  'Orbit Architect',
  'Gravity Golf',
  'Cosmic Cleanup',
  'Planet Pop',
  'Solar Surfer',
]
export default function ArcadePage() {
  const [saved, setSaved] = useState(readRecord)
  const { timer, remaining, blocked } = usePomodoro()
  const breakReady =
    !blocked && timer.phase !== 'focus' && timer.deadline !== null
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === ARCADE_KEY || event.key === null) setSaved(readRecord())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return (
    <div className="arcade-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OFF DUTY. OUT OF THIS WORLD.</p>
          <h1>
            The orbital arcade<span>.</span>
          </h1>
          <p>Step away from the code. Take a tiny adventure.</p>
        </div>
        <span className="arcade-tag">
          <Gamepad2 size={18} /> ONE GAME. INFINITE SPACE.
        </span>
      </div>
      <section className="arcade-feature" aria-labelledby="asteroid-title">
        <div className="arcade-feature-art" aria-hidden="true">
          <img
            className="arcade-cover-rock rock-one"
            src={art.asteroid}
            alt=""
          />
          <img
            className="arcade-cover-rock rock-two"
            src={art.asteroid}
            alt=""
          />
          <img className="arcade-cover-ship" src={art.ship} alt="" />
          <img className="arcade-cover-orb" src={art.orb} alt="" />
        </div>
        <div className="arcade-feature-copy">
          <span className="arcade-live">NOW BOARDING · ENDLESS SURVIVAL</span>
          <h2 id="asteroid-title">
            Asteroid
            <br />
            Escape
          </h2>
          <p>
            A tiny ship. An endless field. Dodge the rocks, chase cooling
            energy, and keep your reactor from burning out.
          </p>
          <div className="arcade-chips">
            <span>Keyboard + touch</span>
            <span>Solo flight</span>
            <span>No install</span>
          </div>
          <Link className="button arcade-launch" to="/games/asteroid-escape">
            Play Asteroid Escape <ArrowRight size={18} />
          </Link>
          <span className="arcade-record">
            <Trophy size={16} /> Personal best:{' '}
            {saved.record.bestScore.toLocaleString()} points
          </span>
        </div>
      </section>
      {saved.error && (
        <p role="alert" className="arcade-notice">
          {saved.error}
        </p>
      )}
      <section className="arcade-break-card">
        <Timer size={25} />
        <div>
          <h2>A little play between focus sessions.</h2>
          <p>
            {breakReady
              ? `${formatTime(remaining)} left in your break. Break play ends when your timer does.`
              : 'Choose Asteroid Escape as your Pomodoro break activity. Your timer keeps the adventure on schedule.'}
          </p>
        </div>
        <Link
          className="button button--outline"
          to={breakReady ? '/games/asteroid-escape?mode=break' : '/pomodoro'}
        >
          {breakReady ? 'Play this break' : 'Set up a game break'}{' '}
          <ArrowRight size={16} />
        </Link>
      </section>
      <section className="arcade-future" aria-labelledby="future-games">
        <p className="eyebrow">MORE WORLDS ON THE HORIZON</p>
        <h2 id="future-games">The next adventures</h2>
        <p>
          Six more games are planned. Asteroid Escape is ready to play today.
        </p>
        <div className="arcade-future-grid">
          {futureGames.map((name, index) => (
            <div className="arcade-locked" key={name}>
              <span>0{index + 2}</span>
              <h3>{name}</h3>
              <small>
                <LockKeyhole size={13} /> Coming later
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
