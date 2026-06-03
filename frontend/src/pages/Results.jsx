import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MagnifyingGlass, Medal, ArrowRight, Trophy } from "@phosphor-icons/react";
import { api } from "../api";
import { useCached } from "../useCached";
import { ResultsSkeleton } from "../components/skeletons.jsx";

export default function Results() {
  const { slug } = useParams();
  const [tt, setTt] = useState("");
  const [bib, setBib] = useState("");
  const [found, setFound] = useState(null);
  const [err, setErr] = useState("");

  const { data: ev } = useCached(`event:${slug}`, () => api.event(slug));
  const { data: boardData } = useCached(
    ev ? `lb:${slug}:${tt}` : null, () => api.leaderboard(slug, tt), !!ev
  );
  const board = boardData || [];

  async function search(e) {
    e.preventDefault(); setErr(""); setFound(null);
    try { setFound(await api.ticket({ bib })); }
    catch { setErr(`No runner with bib #${bib}.`); }
  }

  if (!ev) return <ResultsSkeleton />;

  return (
    <div className="container section stack fade-in" style={{ "--gap": "22px" }}>
      <div className="stack" style={{ "--gap": "6px" }}>
        <span className="eyebrow"><Trophy weight="fill" /> {ev.title}</span>
        <h1 className="serif">Results &amp; timing</h1>
      </div>

      <div className="card card-p stack">
        <h3 className="row"><MagnifyingGlass weight="bold" /> Find a runner</h3>
        <form className="row" onSubmit={search}>
          <input className="input" placeholder="Enter bib number, e.g. 1042" value={bib} onChange={(e) => setBib(e.target.value)} />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
        {err && <span className="chip red">{err}</span>}
        {found && (
          <Link to={`/t/${found.qr_token}`} className="tt-row card-hover" style={{ textDecoration: "none" }}>
            <div className="dist-badge">#{found.bib_number}</div>
            <div className="grow">
              <strong>{found.holder_name}</strong>
              <div className="muted" style={{ fontSize: ".86rem" }}>
                {found.ticket_type_name}{found.result?.chip_time && ` · ${found.result.chip_time}`}
              </div>
            </div>
            <ArrowRight weight="bold" />
          </Link>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-p page-head">
          <h3 className="row"><Medal weight="fill" color="var(--brass)" /> Leaderboard</h3>
          <select className="select" value={tt} onChange={(e) => setTt(e.target.value)}>
            <option value="">All distances</option>
            {ev.ticket_types.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <table className="tbl">
          <thead><tr>
            <th style={{ width: 36 }}>#</th>
            <th className="col-desktop">Bib</th>
            <th>Runner</th>
            <th className="col-desktop">Distance</th>
            <th style={{ textAlign: "right" }}>Chip time</th>
          </tr></thead>
          <tbody>
            {board.map((r) => (
              <tr key={`${r.bib_number}-${r.rank}`}>
                <td className={`rank ${r.rank <= 3 ? "r" + r.rank : ""}`}>{r.rank}</td>
                <td className="col-desktop muted">{r.bib_number}</td>
                <td>
                  <strong className="clamp-1">{r.name}</strong>
                  <div className="show-mobile muted" style={{ fontSize: ".74rem" }}>#{r.bib_number} · {r.distance}</div>
                </td>
                <td className="col-desktop"><span className="chip">{r.distance}</span></td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{r.chip_time}</td>
              </tr>
            ))}
            {board.length === 0 && <tr><td colSpan={5} className="center muted" style={{ padding: 30 }}>No finishers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
