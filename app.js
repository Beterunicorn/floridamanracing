(function () {
  "use strict";

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function dash(v) {
    if (v === null || v === undefined || v === "") return "—";
    return v;
  }

  function parts(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return { y, m, d, dow: DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const p = parts(iso);
    return `${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
  }

  function fmtShort(iso) {
    if (!iso) return "TBC";
    const p = parts(iso);
    return `${MONTHS[p.m - 1]} ${p.d}`;
  }

  function fmtDow(iso) {
    if (!iso) return "TBC";
    const p = parts(iso);
    return `${p.dow} ${MONTHS[p.m - 1]} ${p.d}`;
  }

  function decodeHtml(s) {
    if (!s) return s;
    const el = document.createElement("textarea");
    el.innerHTML = s;
    return el.value;
  }

  function incClass(n) {
    if (n === null || n === undefined) return "";
    if (n >= 8) return "inc-red";
    if (n >= 4) return "inc-amber";
    return "";
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
  }

  function dot(d) {
    return `<span class="drv-dot drv-${escapeHtml(d.key)}" aria-hidden="true"></span>`;
  }

  /* —— Overview —— */
  function renderNextRaces(team) {
    document.getElementById("next-races").innerHTML = team.next_races
      .map(
        (r) => `<div class="card card-next">
          <div class="card-label">Next race · ${escapeHtml(r.series)}</div>
          <div class="next-event">${escapeHtml(r.track)}</div>
          <div class="next-date">${escapeHtml(fmtDow(r.date))}, ${parts(r.date).y} · ${escapeHtml(r.series_name)}</div>
          <ul class="fact-list">${r.facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
        </div>`
      )
      .join("");
  }

  function standingsCard(title, sub, drivers, getStats, fieldSize, footnote) {
    const rows = [
      ["Position", (s) => `P${s.position}`, "of " + fieldSize],
      ["Points", (s) => s.points],
      ["Starts", (s) => s.starts],
      ["Avg finish", (s) => s.avg_finish],
      ["Avg quali", (s) => s.avg_quali],
      ["Incidents / race", (s) => s.inc_per_race],
      ["Top-10s", (s) => s.top10s],
      ["Best finish", (s) => `P${s.best_finish}`],
    ];
    return `<div class="card card-accent">
      <div class="card-label">${escapeHtml(title)}</div>
      <div class="card-title">${escapeHtml(sub)}</div>
      <div class="metric-wrap">
        <table class="metric-table">
          <thead><tr><th scope="col"><span class="sr-only">Metric</span></th>${drivers
            .map((d) => `<th scope="col">${dot(d)}${escapeHtml(d.first)}</th>`)
            .join("")}</tr></thead>
          <tbody>${rows
            .map(
              ([label, fn, hint]) => `<tr><th scope="row">${escapeHtml(label)}${
                hint ? ` <span class="dim">${escapeHtml(hint)}</span>` : ""
              }</th>${drivers
                .map((d) => {
                  const st = getStats(d);
                  return `<td class="mono">${st ? escapeHtml(dash(fn(st))) : '<span class="dim">—</span>'}</td>`;
                })
                .join("")}</tr>`
            )
            .join("")}</tbody>
        </table>
      </div>
      ${footnote ? `<div class="card-note">${escapeHtml(footnote)}</div>` : ""}
    </div>`;
  }

  function renderStandings(team) {
    const D = team.drivers;
    const noTrucks = D.filter((d) => !d.trucks).map((d) => d.first);
    document.getElementById("team-standings").innerHTML =
      standingsCard(
        `Cup standings · ${team.cup.series_name}`,
        `${team.cup.season_name} · after ${team.cup.races_run} of ${team.cup.regular_season_races} races`,
        D, (d) => d.cup, team.cup.field_size,
        `Positions from summed SimRacerHub points. Leader: ${team.cup.leader.name} (${team.cup.leader.points}). P12: ${team.cup.p12.name} (${team.cup.p12.points}).`
      ) +
      standingsCard(
        `Trucks standings · ${team.trucks.series_name}`,
        `${team.trucks.season_name} · final`,
        D, (d) => d.trucks, team.trucks.field_size,
        noTrucks.length ? `${noTrucks.join(", ")} did not race Trucks ${team.trucks.season_name}.` : ""
      );
  }

  function meter(starts, maxStarts, total) {
    let cells = "";
    for (let i = 1; i <= total; i++) {
      const cls = i <= starts ? "on" : i <= maxStarts ? "open" : "off";
      cells += `<span class="seg ${cls}${i === 10 ? " req" : ""}"></span>`;
    }
    return `<div class="meter" role="img" aria-label="${starts} of ${total} starts; 10 required">${cells}</div>`;
  }

  function renderPlayoff(team) {
    const c = team.cup;
    const remaining = c.regular_season_remaining.map((r) => `${r.track} ${fmtShort(r.date)}`).join(" · ");
    const tiles = team.drivers
      .map((d) => {
        const p = d.playoff;
        const startTxt = p.start_min_met
          ? `<span class="chip chip-green">10-start minimum met</span>`
          : p.start_min_possible
          ? `<span class="chip chip-amber">Needs ${plural(p.starts_needed, "more start")}</span>`
          : `<span class="chip chip-red">Can't reach 10 starts</span>`;
        const gap = p.in_top12
          ? `<span class="gap-val green">Inside top 12</span>`
          : `<span class="gap-val">−${p.gap_to_p12}</span><span class="gap-unit">pts to P12</span>`;
        return `<div class="po-tile">
          <div class="po-name">${dot(d)}${escapeHtml(d.name)}</div>
          <div class="po-pos mono">P${p.position} · ${p.points} pts</div>
          <div class="po-gap">${gap}</div>
          <div class="po-meta">${p.positions_to_p12 > 0 ? `${plural(p.positions_to_p12, "spot")} back · ` : ""}${
            p.wins ? plural(p.wins, "win") + " (automatic berth if eligible)" : "No wins · points path"
          }</div>
          <div class="po-starts">
            <div class="po-starts-row"><span>Starts <strong class="mono">${p.starts}</strong> of ${p.races_run} run</span>${startTxt}</div>
            ${meter(p.starts, p.max_starts, c.regular_season_races)}
          </div>
        </div>`;
      })
      .join("");
    const w = c.winners_outside_top12
      .map((x) => `${x.name} (P${x.position}, ${plural(x.wins, "win")}, ${x.starts} starts${x.can_reach_10_starts ? "" : " — can't reach 10"})`)
      .join("; ");
    document.getElementById("playoff-picture").innerHTML = `
      <div class="card playoff-card">
        <div class="card-label">Cup playoff picture</div>
        <p class="rules-line">${escapeHtml(c.rules)}.</p>
        <div class="po-grid">${tiles}</div>
        <div class="card-note">
          <strong>${plural(c.regular_season_remaining.length, "race")} left in the regular season:</strong> ${escapeHtml(remaining)}.
          P12 today: ${escapeHtml(c.p12.name)}, ${c.p12.points} pts.
          ${w ? `Race winners outside the top 12: ${escapeHtml(w)}.` : ""}
        </div>
        <div class="card-note"><strong>Trucks next season:</strong> ${escapeHtml(team.trucks.next_season_rules)}.</div>
      </div>`;
  }

  /* —— Goals —— */
  function renderGoals(data) {
    const team = data.team;
    const c = data.coaching;
    const D = team.drivers;
    const met = D.filter((d) => d.playoff.start_min_met).map((d) => d.first);
    const need = D.filter((d) => !d.playoff.start_min_met).map((d) => `${d.first} ${d.playoff.starts_needed}`);
    document.getElementById("goals-meta").textContent = "Shared targets, then each driver's focus";

    const driverGoal = (d) => {
      if (d.key === "jake") {
        return `
          <div class="goal-item"><div class="goal-league">Cup</div><div class="goal-text">${escapeHtml(c.goals.cup)}</div></div>
          <div class="goal-item"><div class="goal-league">Trucks</div><div class="goal-text">${escapeHtml(c.goals.trucks)}</div></div>
          <div class="subhead">Pillars</div>
          <div class="pillars">${c.pillars.map((p) => `<span class="pillar">${escapeHtml(p)}</span>`).join("")}</div>
          <div class="subhead" style="margin-top:0.85rem">Weekly rhythm</div>
          <ul class="rhythm-list">${c.weekly_rhythm.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`;
      }
      const p = d.playoff;
      const cup = `P${p.position}, ${p.gap_to_p12} pts to P12 with ${plural(p.races_remaining, "race")} left; ${
        p.start_min_met ? "start minimum met" : `${plural(p.starts_needed, "more start")} needed for eligibility`
      }`;
      const trucks = d.trucks
        ? `${team.trucks.season_name}: P${d.trucks.position}, ${d.trucks.starts} starts, ${d.trucks.inc_per_race}x per race`
        : `Not in ${team.trucks.season_name}; next season needs 10 of 13 starts`;
      return `
        <div class="goal-item"><div class="goal-league">Cup</div><div class="goal-text">${escapeHtml(cup)}</div></div>
        <div class="goal-item"><div class="goal-league">Trucks</div><div class="goal-text">${escapeHtml(trucks)}</div></div>
        <div class="subhead">Focus from the numbers</div>
        <ul class="gap-list">${d.focus.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`;
    };

    document.getElementById("goals-block").innerHTML = `
      <div class="card team-goals">
        <div class="card-label">Team</div>
        <ul class="check-list">
          <li><strong>Cup eligibility:</strong> all three drivers to 10 of 14 starts${
            met.length ? ` (done: ${escapeHtml(met.join(", "))}` : " ("
          }${need.length ? `${met.length ? "; " : ""}still needed: ${escapeHtml(need.join(", "))}` : ""}).</li>
          <li><strong>Charlotte, Phoenix, Las Vegas:</strong> three cars starting and running at the finish.</li>
          <li><strong>Trucks next season:</strong> 10 of 13 starts each; points-only playoffs, so every finish counts.</li>
          <li><strong>Incidents:</strong> stay clear of the drive-through limits (Cup 21x, Trucks 17x on ovals).</li>
        </ul>
      </div>
      <div class="goals-grid">
        ${D.map(
          (d) => `<div class="card driver-goal">
            <div class="card-label">${dot(d)}${escapeHtml(d.name)}</div>
            ${driverGoal(d)}
          </div>`
        ).join("")}
      </div>`;
  }

  /* —— Drivers —— */
  function resultChip(r) {
    if (!r) return '<span class="dim">DNS</span>';
    const fin = r.finish <= 10 ? "finish-top10" : "";
    return `<span class="mono">Q${dash(r.quali)} → <span class="${fin}">P${dash(r.finish)}</span> · <span class="${incClass(r.incidents)}">${dash(r.incidents)}x</span></span>`;
  }

  function renderDrivers(team) {
    document.getElementById("team-meta").textContent =
      `${team.drivers.length} drivers · ${team.cup.series_name} ${team.cup.season_name}`;
    document.getElementById("driver-cards").innerHTML = team.drivers
      .map((d) => {
        const s = d.cup;
        return `<article class="card driver-card drv-card-${escapeHtml(d.key)}" aria-label="${escapeHtml(d.name)}">
          <header class="driver-head">
            <div>
              <div class="driver-name">${dot(d)}${escapeHtml(d.name)}</div>
              <div class="muted driver-sub">Cup P${s.position} · ${s.points} pts${
                d.trucks ? ` · Trucks P${d.trucks.position}` : ""
              }</div>
            </div>
          </header>
          <div class="stat-row">
            <div class="stat"><span class="stat-val">${s.starts}</span><span class="stat-lbl">Starts</span></div>
            <div class="stat"><span class="stat-val">${s.avg_finish}</span><span class="stat-lbl">Avg fin</span></div>
            <div class="stat"><span class="stat-val">${s.avg_quali}</span><span class="stat-lbl">Avg quali</span></div>
            <div class="stat"><span class="stat-val ${s.inc_per_race >= 8 ? "red" : s.inc_per_race >= 4 ? "amber" : "green"}">${s.inc_per_race}</span><span class="stat-lbl">Inc / race</span></div>
            <div class="stat"><span class="stat-val">${s.top10s}</span><span class="stat-lbl">Top-10s</span></div>
            <div class="stat"><span class="stat-val">P${s.best_finish}</span><span class="stat-lbl">Best</span></div>
          </div>
          <div class="subhead" style="margin-top:1rem">Recent form · last 3 Cup races</div>
          <ul class="form-list">${d.last3
            .map(
              (r) => `<li><span class="form-date mono">${fmtShort(r.date)}</span><span class="form-track">${escapeHtml(r.track)}</span>${resultChip(r)}</li>`
            )
            .join("")}</ul>
          <div class="list-cols" style="margin-top:0.9rem">
            <div><div class="subhead">Strengths</div><ul class="check-list">${d.strengths
              .map((x) => `<li>${escapeHtml(x)}</li>`)
              .join("")}</ul></div>
            <div><div class="subhead">Focus</div><ul class="gap-list">${d.focus
              .map((x) => `<li>${escapeHtml(x)}</li>`)
              .join("")}</ul></div>
          </div>
        </article>`;
      })
      .join("");
  }

  /* —— Per-race team tables —— */
  // Finish first, then grid + incidents; CSS stacks the two parts on narrow screens.
  function tableCell(r) {
    if (!r) return '<span class="dim">DNS</span>';
    return `<span class="rc mono"><span class="rc-f ${r.finish <= 10 ? "finish-top10" : ""}">P${dash(r.finish)}</span><span class="rc-m"><span class="dim">Q${dash(r.quali)}</span> · <span class="${incClass(r.incidents)}">${dash(r.incidents)}x</span></span></span>`;
  }

  function renderTeamTable(table, results, drivers) {
    const ds = drivers.filter((d) => results.some((r) => r.drivers[d.key]));
    table.innerHTML = `
      <thead><tr><th scope="col">Date</th><th scope="col">Track</th>${ds
        .map((d) => `<th scope="col">${dot(d)}${escapeHtml(d.first)}</th>`)
        .join("")}</tr></thead>
      <tbody>${results
        .map(
          (r) => `<tr><td class="mono">${fmtShort(r.date)}</td><td>${escapeHtml(decodeHtml(r.track))}</td>${ds
            .map((d) => `<td>${tableCell(r.drivers[d.key])}</td>`)
            .join("")}</tr>`
        )
        .join("")}</tbody>`;
    return ds;
  }

  /* —— Cup schedule —— */
  function renderCupSchedule(data) {
    const team = data.team;
    const list = document.getElementById("cup-schedule-list");
    const today = data.updated;
    const nextIdx = team.cup.schedule.findIndex((s) => !s.chase && !s.race_id && s.date >= today);
    let raceNo = 0;
    list.innerHTML = team.cup.schedule
      .map((s, i) => {
        if (s.chase) {
          return `<div class="sched-divider" role="separator"><span>Playoffs · ${escapeHtml(s.event)}</span></div>`;
        }
        raceNo += 1;
        const isNext = i === nextIdx;
        const done = !!s.race_id;
        let badges = "";
        if (isNext) badges += `<span class="badge badge-next">Next</span>`;
        if (raceNo === 14) badges += `<span class="badge badge-chase">Reg. season finale</span>`;
        if (done) badges += `<span class="badge badge-done">Done</span>`;
        const res = done && s.team
          ? team.drivers
              .map((d) => {
                const r = s.team[d.key];
                return `<span class="sr-${escapeHtml(d.key)}">${escapeHtml(d.first)} ${r ? `<span class="${r.finish <= 10 ? "finish-top10" : ""}">P${r.finish}</span>` : '<span class="dim">DNS</span>'}</span>`;
              })
              .join('<span class="dim"> · </span>')
          : escapeHtml(s.date < today ? "—" : "Upcoming");
        const cls = ["sched-item", isNext ? "next" : "", done ? "past" : ""].filter(Boolean).join(" ");
        return `<div class="${cls}">
          <div class="sched-date">${fmtShort(s.date)}</div>
          <div class="sched-event">${escapeHtml(s.event || "TBD")}${badges}</div>
          <div class="sched-result">${res}</div>
        </div>`;
      })
      .join("");
  }

  /* —— Debriefs & practice —— */
  function teamStrip(team, raceId) {
    const r = team.cup.results.find((x) => x.race_id === raceId);
    if (!r) return "";
    return `<div class="team-strip">${team.drivers
      .map((d) => {
        const x = r.drivers[d.key];
        return `<div class="strip-tile"><div class="strip-name">${dot(d)}${escapeHtml(d.first)}</div>${
          x
            ? `<div class="strip-res mono"><span class="${x.finish <= 10 ? "finish-top10" : ""}">P${x.finish}</span> <span class="dim">from Q${x.quali}</span></div>
               <div class="strip-meta mono"><span class="${incClass(x.incidents)}">${x.incidents}x</span> · +${x.points} pts${x.laps_led ? ` · ${x.laps_led} led` : ""}</div>`
            : '<div class="strip-res dim">Did not start</div>'
        }</div>`;
      })
      .join("")}</div>`;
  }

  function renderDebriefs(data) {
    const k = data.coaching.kansas;
    const q = data.coaching.qualcomm;
    document.getElementById("debriefs-meta").textContent = "Most recent Cup races · team results, then notes";
    document.getElementById("debriefs-block").innerHTML = `
      <div class="debrief">
        <h3 class="sub-title">Qualcomm Circuit <span class="muted">· ${fmtDate(q.race_date)} · ${escapeHtml(data.team.cup.series_name)}</span></h3>
        ${teamStrip(data.team, q.simracerhub.race_id)}
      </div>
      <div class="debrief">
        <h3 class="sub-title">Kansas <span class="muted">· ${fmtDate(k.date)} · ${escapeHtml(k.series)}</span></h3>
        ${teamStrip(data.team, k.simracerhub.race_id)}
        <div class="kansas-grid">
          <div class="card">
            <div class="card-label">Jake · Garage61 debrief</div>
            <div class="kansas-reported">${escapeHtml(k.reported)}</div>
            <div class="subhead">Garage61 (Jake)</div>
            <div class="g61-stats">
              <div class="g61-stat"><span class="stat-val mono">${escapeHtml(k.garage61.best)}</span><span class="stat-lbl">Best Lap</span></div>
              <div class="g61-stat"><span class="stat-val mono green">${escapeHtml(k.garage61.optimal)}</span><span class="stat-lbl">Optimal</span></div>
              <div class="g61-stat"><span class="stat-val mono">${escapeHtml(k.garage61.clean_pct)}</span><span class="stat-lbl">Clean %</span></div>
              <div class="g61-stat"><span class="stat-val mono">${escapeHtml(k.garage61.quali_best)}</span><span class="stat-lbl">Quali Best</span></div>
            </div>
            <p class="muted" style="font-size:0.8rem;margin-bottom:0.85rem">${escapeHtml(k.garage61.note)}</p>
            <div class="subhead">Setup (Jake)</div>
            <div class="setup-box">${escapeHtml(k.setup)}</div>
          </div>
          <div class="card">
            <div class="card-label">Jake · notes</div>
            <div class="list-cols">
              <div>
                <div class="subhead">Strengths</div>
                <ul class="check-list">${k.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
              </div>
              <div>
                <div class="subhead">Gaps</div>
                <ul class="gap-list">${k.gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderPractice(data) {
    const q = data.coaching.qualcomm;
    const b = data.coaching.race_week_brief_2026_10_09;
    document.getElementById("practice-meta").textContent = "This week's team prep, plus the last race-week plan";
    let brief = "";
    if (b) {
      const t = b.cup.targets || {};
      brief = `
        <div class="card card-next qc-intro">
          <div class="card-label">Race week · ${escapeHtml(b.cup.race)} · team</div>
          <div class="list-cols">
            <div>
              <div class="subhead">Practice priorities</div>
              <ul class="check-list">${b.cup.practice.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>
            <div>
              <div class="subhead">Fuel</div>
              <p class="qc-focus">${escapeHtml(b.cup.fuel)}</p>
              <div class="subhead">Restart cue</div>
              <p class="qc-focus">${escapeHtml(b.cup.cue)}</p>
            </div>
          </div>
          <div class="card-note">Jake's targets: quali ${escapeHtml(t.quali)}, finish ${escapeHtml(t.finish)}, ${escapeHtml(t.incidents)}.
          Trucks: ${escapeHtml(b.trucks.race)}.</div>
        </div>`;
    }
    document.getElementById("practice-block").innerHTML = `
      ${brief}
      <div class="card qc-intro">
        <div class="card-label">Jake · Qualcomm week plan · ${fmtDate(q.race_date)}</div>
        <div class="qc-track">${escapeHtml(q.track)}</div>
        <div class="qc-focus"><strong>Focus:</strong> ${escapeHtml(q.focus)}</div>
        <div class="qc-targets">Targets: ${escapeHtml(q.targets)}</div>
      </div>
      <div class="practice-grid">
        ${q.practice_plan
          .map(
            (d) => `<div class="day-card">
            <div class="day-name">${escapeHtml(d.day)}</div>
            <div class="day-mins">${escapeHtml(d.mins)}${/race/.test(d.mins) ? "" : " min"}</div>
            <div class="day-focus">${escapeHtml(d.focus)}</div>
          </div>`
          )
          .join("")}
      </div>`;
  }

  /* —— Trucks —— */
  function renderTrucks(team) {
    const shown = renderTeamTable(document.getElementById("trucks-team-table"), team.trucks.results, team.drivers);
    const absent = team.drivers.filter((d) => !shown.includes(d)).map((d) => d.first);
    document.getElementById("trucks-series-label").textContent =
      `${team.trucks.series_name} · ${team.trucks.status}${absent.length ? ` · ${absent.join(", ")} not entered` : ""}`;
  }

  function renderTrucksNext(data) {
    const t = data.team.trucks;
    document.getElementById("trucks-next-meta").textContent = `${t.next_season_rules} · 4 tire sets unless noted`;
    const nextIdx = t.next_season.findIndex((r) => !r.off && r.date && r.date >= data.updated);
    document.getElementById("trucks-next-table").classList.add("next-table");
    document.getElementById("trucks-next-table").innerHTML = `
      <thead><tr><th scope="col">Rd</th><th scope="col">Date</th><th scope="col">Track</th><th scope="col">Laps / Miles</th><th scope="col">Tires</th><th scope="col" class="col-notes">Notes</th></tr></thead>
      <tbody>${t.next_season
        .map((r, i) => {
          if (r.off) return `<tr class="row-off"><td class="mono dim">—</td><td class="mono">${fmtShort(r.date)}</td><td colspan="3" class="dim">Off week</td><td class="col-notes"></td></tr>`;
          const dist = r.laps ? `${r.laps} / ${r.miles}` : "TBC";
          return `<tr class="${i === nextIdx ? "row-next" : ""}"><td class="mono">${escapeHtml(r.rd)}</td><td class="mono">${r.date ? fmtShort(r.date) : "TBC"}</td><td>${escapeHtml(r.track)}${
            i === nextIdx ? '<span class="badge badge-next">Next</span>' : ""
          }${r.note ? `<span class="note-inline">${escapeHtml(r.note)}</span>` : ""}</td><td class="mono">${escapeHtml(dist)}</td><td class="mono ${r.tires && r.tires !== 4 ? "amber-txt" : ""}">${dash(r.tires)}</td><td class="muted col-notes">${escapeHtml(r.note)}</td></tr>`;
        })
        .join("")}</tbody>`;
  }

  /* —— Rules & links —— */
  function renderRules(team) {
    const card = (title, sub, rows) => `<div class="card rules-card">
      <div class="card-label">${escapeHtml(sub)}</div>
      <div class="card-title">${escapeHtml(title)}</div>
      <dl class="rules-list">${rows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>
    </div>`;
    document.getElementById("rules-block").innerHTML =
      card("Cup", team.cup.series_name, team.rules.cup) + card("Trucks", team.trucks.series_name, team.rules.trucks);
  }

  function renderLinks(data) {
    const L = data.coaching.links;
    const el = document.getElementById("links-block");
    const items = [
      { label: "Standings", title: "Cup · SimRacerHub", url: L.cup_simracerhub },
      { label: "Standings", title: "Trucks · SimRacerHub", url: L.trucks_simracerhub },
      { label: "Telemetry", title: "Jake · Garage61", url: L.garage61 },
    ];
    el.innerHTML = items
      .map(
        (i) => `<a class="link-card" href="${escapeHtml(i.url)}" target="_blank" rel="noopener">
        <div class="link-label">${escapeHtml(i.label)}</div>
        <div class="link-title">${escapeHtml(i.title)}</div>
        <div class="link-url">${escapeHtml(i.url.replace(/^https?:\/\//, ""))}</div>
      </a>`
      )
      .join("");
  }

  function renderAll(data) {
    const team = data.team;
    document.getElementById("team-subtitle").textContent = team.subtitle;
    document.getElementById("last-updated").innerHTML = `Updated <strong>${escapeHtml(data.updated)}</strong>`;
    document.getElementById("overview-meta").textContent =
      `${team.league} · ${team.drivers.map((d) => d.first).join(", ")}`;
    document.getElementById("cup-series-label").textContent =
      `${team.cup.series_name} · ${team.cup.season_name} · every race, every driver`;

    renderNextRaces(team);
    renderStandings(team);
    renderPlayoff(team);
    renderGoals(data);
    renderDrivers(team);
    renderTeamTable(document.getElementById("cup-team-table"), team.cup.results, team.drivers);
    renderCupSchedule(data);
    renderDebriefs(data);
    renderPractice(data);
    renderTrucks(team);
    renderTrucksNext(data);
    renderRules(team);
    renderLinks(data);
  }

  // Single-file build inlines window.DASHBOARD_DATA; the hosted build fetches data.json.
  (window.DASHBOARD_DATA
    ? Promise.resolve(window.DASHBOARD_DATA)
    : fetch("./data.json", { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load data.json (${r.status})`);
        return r.json();
      })
  )
    .then(renderAll)
    .catch((err) => {
      console.warn(err);
      const main = document.querySelector("main");
      const banner = document.createElement("div");
      banner.className = "error-banner";
      banner.textContent = `Could not load team data: ${err.message}`;
      main.prepend(banner);
    });
})();

/* —— Navigation: scroll-spy, active states, mobile section title —— */
(function () {
  "use strict";

  const SECTIONS = [
    { id: "overview", label: "Team Overview", tab: "home" },
    { id: "goals", label: "Team Goals", tab: "home" },
    { id: "team", label: "Drivers", tab: "team" },
    { id: "cup-results", label: "Team Results", tab: "team" },
    { id: "cup-schedule", label: "Cup Schedule", tab: "cup" },
    { id: "debriefs", label: "Race Debriefs", tab: "cup" },
    { id: "practice", label: "Practice Plans", tab: "cup" },
    { id: "trucks", label: "Trucks · Season 14", tab: "trucks" },
    { id: "trucks-schedule", label: "Trucks · Next Season", tab: "trucks" },
    { id: "rules", label: "Team Rules", tab: "more" },
    { id: "links", label: "Links", tab: "more" },
  ];

  const sectionEls = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
  const navItems = Array.from(document.querySelectorAll(".nav-item[data-section]"));
  const tabs = Array.from(document.querySelectorAll(".tab[data-tab]"));
  const currentLabel = document.getElementById("current-section");
  const mobileBar = document.querySelector(".mobile-bar");
  const mobileMq = window.matchMedia("(max-width: 899.98px)");

  let activeId = null;
  let lockUntil = 0;

  function setActive(id) {
    if (!id || id === activeId) return;
    activeId = id;
    const meta = SECTIONS.find((s) => s.id === id);
    navItems.forEach((a) => {
      if (a.dataset.section === id) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
    tabs.forEach((t) => {
      if (meta && t.dataset.tab === meta.tab) t.setAttribute("aria-current", "location");
      else t.removeAttribute("aria-current");
    });
    if (currentLabel && meta) currentLabel.textContent = meta.label;
  }

  function topOffset() {
    return mobileMq.matches && mobileBar ? mobileBar.offsetHeight + 24 : 32;
  }

  function computeActive() {
    if (Date.now() < lockUntil) return;
    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
      setActive(sectionEls[sectionEls.length - 1].id);
      return;
    }
    const line = topOffset();
    let current = sectionEls[0];
    for (const el of sectionEls) {
      if (el.getBoundingClientRect().top - line <= 0) current = el;
      else break;
    }
    setActive(current.id);
  }

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      computeActive();
    });
  }

  if ("IntersectionObserver" in window) {
    // A thin band near the top of the viewport; any section crossing it changes the active item.
    const io = new IntersectionObserver(schedule, {
      rootMargin: "-80px 0px -60% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    sectionEls.forEach((el) => io.observe(el));
    // Short final sections may never reach the band; watch the footer for end-of-page.
    const footer = document.querySelector(".footer");
    if (footer) new IntersectionObserver(schedule, { threshold: [0, 1] }).observe(footer);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  // Clicking a nav item: mark it active immediately and pause the spy while the smooth scroll runs.
  document.querySelectorAll(".nav-item, .tab").forEach((a) => {
    a.addEventListener("click", () => {
      const id = (a.getAttribute("href") || "").replace("#", "");
      if (!document.getElementById(id)) return;
      lockUntil = 0;
      setActive(id);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      lockUntil = Date.now() + (reduce ? 150 : 900);
    });
  });
  if ("onscrollend" in window) {
    window.addEventListener("scrollend", () => {
      lockUntil = 0;
      schedule();
    });
  }

  const initial = location.hash.replace("#", "");
  setActive(SECTIONS.some((s) => s.id === initial) ? initial : "overview");
  schedule();
})();
