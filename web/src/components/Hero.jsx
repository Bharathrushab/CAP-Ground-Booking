import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { practiceUrl } from '../lib/content';
import './hero-art.css';

const CricketScene = lazy(() => import('./CricketScene'));
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Hero({ bookingUrl = practiceUrl }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const query = matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
    const update = () => setAnimate(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return <section className="hero">
    <div className="pitch-art" aria-hidden="true">
      <div className="cricket-field">
        <div className="cricket-infield" />
        <div className="cricket-square" />
        <div className="cricket-pitch">
          {['top', 'bottom'].map((end) => <span className={`pitch-crease crease-${end}`} key={end}>
            <span className="bowling-crease" /><span className="wide-guides" /><span className="popping-crease" />
          </span>)}
        </div>
      </div>
      <img className="static-ball" src="/images/cricket-ball.png" alt="" width="512" height="512" />
    </div>
    {animate && <div className="hero-canvas"><SceneBoundary><Suspense fallback={null}><CricketScene /></Suspense></SceneBoundary></div>}
    <div className="hero-inner wrap">
      <div className="eyebrow light">Community cricket / Peoria, Illinois</div>
      <h1>Cricket Association<br />of <em>Peoria.</em></h1>
      <p>A shared field. A city of players.<br />Your home for community cricket.</p>
      <div className="hero-actions"><Link className="button light-button" to="/leagues">Explore leagues <ArrowRight size={18} /></Link><a className="text-link" href={bookingUrl} target="_blank" rel="noopener noreferrer">Book practice <ArrowUpRight size={18} /></a></div>
      <div className="hero-bottom"><span>THE GAME BRINGS US TOGETHER</span><span>40.69° N / 89.59° W</span></div>
    </div>
  </section>;
}