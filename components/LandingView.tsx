"use client";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  FileText,
  Fingerprint,
  Laptop,
  Link2,
  LockKeyhole,
  Smartphone,
  Zap,
} from "lucide-react";
interface Props {
  onCreateDrop: () => void;
  onJoinDrop: () => void;
}
export function LandingView({ onCreateDrop, onJoinDrop }: Props) {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="hero-copy">
          <span className="section-label">
            <span className="red-dot" /> A little less friction.
          </span>
          <h1>
            Your files.
            <br />
            Already <span className="headline-accent">on their way.</span>
          </h1>
          <p>
            From your phone to your laptop. Or anywhere in between.
            <br className="hidden sm:block" /> A private connection, with
            nothing left in the cloud.
          </p>
          <div className="hero-actions">
            <button onClick={onCreateDrop} className="button-primary">
              Create a Drop <ArrowUpRight size={18} />
            </button>
            <button onClick={onJoinDrop} className="button-secondary">
              Join a Drop <Link2 size={16} />
            </button>
          </div>
          <div className="hero-facts">
            <span>
              <Check size={13} /> No account
            </span>
            <span>
              <Check size={13} /> Encrypted transfer
            </span>
            <span>
              <Check size={13} /> No file storage
            </span>
          </div>
        </div>
        <div className="transfer-illustration" aria-hidden="true">
          <div className="device-tile">
            <Smartphone size={28} />
            <span>Your phone</span>
          </div>
          <div className="flying-file">
            <FileText size={30} />
            <span>hello.zip</span>
          </div>
          <div className="device-tile laptop-tile">
            <Laptop size={31} />
            <span>Your laptop</span>
          </div>
        </div>
        <a className="scroll-cue" href="#how-it-works">
          A simpler way to share <ArrowDown size={13} />
        </a>
      </section>
      <section className="intro-section" id="how-it-works">
        <div className="section-heading">
          <span className="section-label">
            <span className="red-dot" /> Made for the everyday
          </span>
          <h2>
            Less uploading.
            <br />
            <span>More getting on with it.</span>
          </h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card dark-card">
            <div className="card-top">
              <span className="section-label">Between your devices</span>
              <ArrowUpRight size={23} />
            </div>
            <h3>
              One connection.
              <br />
              Zero cloud clutter.
            </h3>
            <p>
              Photos, work documents, that file you need right now. Send them
              straight to the other browser.
            </p>
            <div className="connection-art" aria-hidden="true">
              <div>
                <Smartphone size={36} />
              </div>
              <span />
              <div>
                <Laptop size={44} />
              </div>
              <i>
                <LockKeyhole size={19} />
              </i>
            </div>
            <span className="card-footnote">Your files stay yours.</span>
          </article>
          <div className="feature-stack">
            <article className="feature-card">
              <div className="small-feature-icon">
                <Fingerprint size={25} />
              </div>
              <h3>Private by design.</h3>
              <p>
                Encrypted in transit. No account to create and no files stored
                on our servers.
              </p>
              <span className="small-detail">
                WebRTC encrypted transport <ArrowUpRight size={14} />
              </span>
            </article>
            <article className="feature-card accent-card">
              <div className="small-feature-icon">
                <Zap size={25} />
              </div>
              <h3>Delivered. And verified.</h3>
              <p>
                Every file is checked for integrity. You see success when the
                receiving device confirms delivery.
              </p>
              <span className="small-detail">
                Up to 100 MB per file <Check size={14} />
              </span>
            </article>
          </div>
        </div>
      </section>
      <section className="steps-section">
        <div className="section-heading">
          <span className="section-label">
            <span className="red-dot" /> Three small steps
          </span>
          <h2>
            Over there.
            <br />
            <span>In a few clicks.</span>
          </h2>
          <button className="button-primary" onClick={onCreateDrop}>
            Let’s send something <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="step-list">
          {[
            [
              "01",
              "Create your Drop",
              "Open a temporary session. A code and QR link connect your two devices.",
            ],
            [
              "02",
              "Bring the other device",
              "Scan the QR code or enter the session code. Keep both browser tabs open.",
            ],
            [
              "03",
              "Drop. Send. Done.",
              "Choose your files, hit send, and download them once delivery is verified.",
            ],
          ].map(([n, title, text]) => (
            <article className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <ArrowUpRight size={19} />
            </article>
          ))}
        </div>
      </section>
      <footer className="site-footer">
        <a href="#" aria-label="Drop home">
          drop<span>®</span>
        </a>
        <p>A direct route from here to there.</p>
        <span>No accounts. No cloud storage.</span>
      </footer>
    </div>
  );
}
