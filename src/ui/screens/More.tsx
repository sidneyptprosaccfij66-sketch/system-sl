export function MoreScreen() {
  return (
    <section className="screen" data-section="more" id="more" aria-label="Ещё">
      <header className="screen-head"><h1 className="holo-title screen-title">Ещё</h1></header>
      <div className="menu">
        <a className="menu-link panel" href="#/more/bank"><span>Банк<span className="hint" style={{ display: 'block' }}>Повторяющиеся дела и идеи побочек</span></span><span aria-hidden="true">›</span></a>
        <a className="menu-link panel" href="#/more/journal"><span>Журнал<span className="hint" style={{ display: 'block' }}>Итоги недели, серии, начисления и штрафы</span></span><span aria-hidden="true">›</span></a>
        <a className="menu-link panel" href="#/more/settings"><span>Настройки<span className="hint" style={{ display: 'block' }}>Привычки, ограничения, конец дня, звук</span></span><span aria-hidden="true">›</span></a>
      </div>
    </section>
  );
}
