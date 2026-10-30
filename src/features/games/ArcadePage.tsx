import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gamepad2, LockKeyhole, Timer, Trophy } from 'lucide-react'
import { usePomodoro } from '../pomodoro/context'
import { formatTime } from '../pomodoro/model'
import { art } from './art'
import { lunarArt } from './lunar/art'
import { ARCADE_KEY, readRecord } from './records'
import { readGameRecord } from './shared/records'
import './shared/play.css'
import './games.css'
import './lunar/lunar.css'

const futureGames = ['Cosmic Cleanup', 'Planet Pop', 'Solar Surfer']
export default function ArcadePage() {
  const [saved, setSaved] = useState(readRecord)
  const [orbit, setOrbit] = useState(() => readGameRecord('orbit-architect'))
  const [golf, setGolf] = useState(() => readGameRecord('gravity-golf'))
  const { timer, remaining, blocked } = usePomodoro()
  const breakReady =
    !blocked &&
    timer.phase !== 'focus' &&
    timer.deadline !== null &&
    remaining > 0 &&
    timer.settings.breakActivity !== 'none'
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'devorbit.orbit-architect.v1' || event.key === null)
        setOrbit(readGameRecord('orbit-architect'))
      if (event.key === 'devorbit.gravity-golf.v1' || event.key === null)
        setGolf(readGameRecord('gravity-golf'))
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
          <Gamepad2 size={18} /> FOUR GAMES. INFINITE SPACE.
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
      <section
        className="arcade-feature lunar-card"
        aria-labelledby="lunar-title"
      >
        <div className="arcade-feature-art" aria-hidden="true">
          <img className="lunar-cover-ship" src={lunarArt.lander} alt="" />
        </div>
        <div className="arcade-feature-copy">
          <span className="arcade-live">NOW BOARDING · PRECISION FLIGHT</span>
          <h2 id="lunar-title">
            Lunar
            <br />
            Landing
          </h2>
          <p>
            A distant world. A little fuel. Find your footing on changing
            terrain, then venture deeper into stronger gravity.
          </p>
          <div className="arcade-chips">
            <span>Keyboard + touch</span>
            <span>Planet hopping</span>
            <span>Precision landings</span>
          </div>
          <Link className="button arcade-launch" to="/games/lunar-landing">
            Play Lunar Landing <ArrowRight size={18} />
          </Link>
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
              : 'Choose any of the four games as your Pomodoro break activity. Your timer keeps the adventure on schedule.'}
          </p>
        </div>
        <Link
          className="button button--outline"
          to={
            breakReady
              ? `/games/${timer.settings.breakActivity}?mode=break`
              : '/pomodoro'
          }
        >
          {breakReady ? 'Play this break' : 'Set up a game break'}{' '}
          <ArrowRight size={16} />
        </Link>
      </section>
      <section
        className="arcade-feature orbit-card"
        aria-labelledby="orbit-title"
      >
        <div className="arcade-feature-copy">
          <span className="arcade-live">
            NOW BOARDING · CONSTELLATION MISSIONS
          </span>
          <h2 id="orbit-title">
            Orbit
            <br />
            Architect
          </h2>
          <p>
            A sky full of possibilities. Build layered constellations, keep them
            stable, and earn your stars.
          </p>
          <div className="arcade-chips">
            <span>Mouse + touch + keyboard</span>
            <span>3 missions</span>
            <span>9 stars to earn</span>
          </div>
          <Link className="button arcade-launch" to="/games/orbit-architect">
            Play Orbit Architect <ArrowRight size={18} />
          </Link>
          <span className="arcade-record">
            <Trophy size={16} /> Personal best: {orbit.record.best} / 9 stars
          </span>
        </div>
      </section>
      <section
        className="arcade-feature golf-card"
        aria-labelledby="golf-title"
      >
        <div className="arcade-feature-art" aria-hidden="true">
          <img
            className="golf-cover-hole"
            src="/images/arcade/golf/black-hole.png"
            alt=""
          />
          <img
            className="golf-cover-planet"
            src="/images/arcade/golf/planet.png"
            alt=""
          />
        </div>
        <div className="arcade-feature-copy">
          <span className="arcade-live">NOW BOARDING · COSMIC PRECISION</span>
          <h2 id="golf-title">
            Gravity
            <br />
            Golf
          </h2>
          <p>
            Read the pull of distant worlds. Bend a comet into the darkness. Six
            holes, one perfect curve to chase.
          </p>
          <div className="arcade-chips">
            <span>Drag to aim</span>
            <span>6 cosmic holes</span>
            <span>Personal bests</span>
          </div>
          <Link className="button arcade-launch" to="/games/gravity-golf">
            Play Gravity Golf <ArrowRight size={18} />
          </Link>
          <span className="arcade-record">
            <Trophy size={16} />{' '}
            {golf.record.best
              ? `Best course: ${golf.record.best} strokes`
              : 'Your first course record awaits'}
          </span>
        </div>
      </section>
      {(orbit.error || golf.error) && (
        <p role="alert" className="arcade-notice">
          {orbit.error || golf.error}
        </p>
      )}
      <section className="arcade-future" aria-labelledby="future-games">
        <p className="eyebrow">MORE WORLDS ON THE HORIZON</p>
        <h2 id="future-games">The next adventures</h2>
        <p>
          Three more games are planned. Four adventures are ready to play today.
        </p>
        <div className="arcade-future-grid">
          {futureGames.map((name, index) => (
            <div className="arcade-locked" key={name}>
              <span>0{index + 3}</span>
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
