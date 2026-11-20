export function StartupProblem({ message }: { message: string }) {
  return (
    <main className="login">
      <section className="card">
        <div className="brand dark">
          <span className="mark" aria-hidden="true">
            SK
          </span>
          <div>
            <strong>SK Autobody</strong>
            <span>Team calendar</span>
          </div>
        </div>
        <h1>The calendar cannot start yet</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
