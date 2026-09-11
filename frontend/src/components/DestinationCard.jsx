import { Link } from "react-router-dom";

export default function DestinationCard({ d, onSelect }) {
  const inner = (
    <>
      <div className="dest-img-wrap relative h-40 rounded-t-2xl overflow-hidden">
        <img src={d.image} alt={d.name} className="dest-img w-full h-full object-cover" />
        <span className="absolute top-3 right-3 badge-match" data-testid={`match-${d.id}`}>{d.match}% Match</span>
      </div>
      <div className="p-4">
        <div className="font-display font-bold text-lg">{d.name}</div>
        <div className="text-xs text-[var(--tm-muted)] mt-1">{d.days} · {d.tagline}</div>
      </div>
    </>
  );
  if (onSelect) {
    return (
      <button onClick={() => onSelect(d)} className="card-soft text-left hover:-translate-y-1 transition-transform block w-full" data-testid={`dest-card-${d.id}`}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={`/plan?dest=${d.id}`} className="card-soft hover:-translate-y-1 transition-transform block" data-testid={`dest-card-${d.id}`}>
      {inner}
    </Link>
  );
}
