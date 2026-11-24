import "./LoadingScreen.css";

export function LoadingScreen({ message, embedded = false }: { message: string; embedded?: boolean }) {
  return (
    <div className={embedded ? "tracker-loading tracker-loading--embedded" : "tracker-loading"} role="status">
      <div className="tracker-loading__chart" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <span key={index} style={{ height: `${36 + index * 16}%`, animationDelay: `${index * 140}ms` }} />
        ))}
      </div>
      <p className="tracker-loading__brand">Project Tracker</p>
      <p className="tracker-loading__message">{message}</p>
    </div>
  );
}
