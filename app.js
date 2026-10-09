(function () {
  "use strict";

  const TODAY = "2026-10-04";
  const NEXT_RACE_DATE = "2026-10-11";

  function dash(v) {
    if (v === null || v === undefined || v === "") return "—";
    return v;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${d}, ${y}`;
  }

  function fmtShort(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${d}`;
  }

  function decodeHtml(s) {
    if (!s) return s;
    const el = document.createElement("textarea");
    el.innerHTML = s;
    return el.value;
  }

  function finishClass(f) {
    if (f === null || f === undefined) return "";
    return f <= 10 ? "finish-top10" : "";
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

  function renderOverview(data) {
    const cup = data.cup.summary;
    const trucks = data.trucks.summary;
    const qc = data.coaching.qualcomm;
    const el = document.getElementById("overview-cards");

    el.innerHTML = `
      <div class="card card-accent">
        <div class="card-label">Bonfire Premier Cup</div>
        <div class="card-title">${escapeHtml(data.cup.season_name)}${cup.position ? ` · P${cup.position}` : ""}</div>
        <div class="stat-row">
          <div class="stat"><span class="stat-val">${dash(cup.starts)}</span><span class="stat-lbl">Starts</span></div>
          <div class="stat"><span class="stat-val amber">${dash(cup.points)}</span><span class="stat-lbl">Points</span></div>
          <div class="stat"><span class="stat-val green">${dash(cup.best_finish)}</span><span class="stat-lbl">Best</span></div>
          <div class="stat"><span class="stat-val">${dash(cup.avg_finish)}</span><span class="stat-lbl">Avg Fin</span></div>
          <div class="stat"><span class="stat-val">${dash(cup.avg_quali)}</span><span class="stat-lbl">Avg Quali</span></div>
          <div class="stat"><span class="stat-val green">${dash(cup.top10s)}</span><span class="stat-lbl">Top-10s</span></div>
        </div>
        <div class="stat-row" style="margin-top:0.65rem">
          <div class="stat"><span class="stat-val ${cup.total_incidents >= 30 ? "red" : "amber"}">${dash(cup.total_incidents)}</span><span class="stat-lbl">Incidents</span></div>
        </div>
        ${cup.note ? `<div class="card-note">${escapeHtml(cup.note)}</div>` : ""}
      </div>

      <div class="card card-accent">
        <div class="card-label">Big Trucking Tuesday</div>
        <div class="card-title">${escapeHtml(data.trucks.season_name)}</div>
        <div class="stat-row">
          <div class="stat"><span class="stat-val">${dash(trucks.starts)}</span><span class="stat-lbl">Starts</span></div>
          <div class="stat"><span class="stat-val amber">${dash(trucks.points)}</span><span class="stat-lbl">Points</span></div>
          <div class="stat"><span class="stat-val">${dash(trucks.best_finish)}</span><span class="stat-lbl">Best</span></div>
          <div class="stat"><span class="stat-val">${dash(trucks.avg_finish)}</span><span class="stat-lbl">Avg Fin</span></div>
          <div class="stat"><span class="stat-val">${dash(trucks.avg_quali)}</span><span class="stat-lbl">Avg Quali</span></div>
          <div class="stat"><span class="stat-val">${dash(trucks.top10s)}</span><span class="stat-lbl">Top-10s</span></div>
        </div>
        <div class="stat-row" style="margin-top:0.65rem">
          <div class="stat"><span class="stat-val red">${dash(trucks.total_incidents)}</span><span class="stat-lbl">Incidents</span></div>
        </div>
      </div>

      <div class="card card-next">
        <div class="card-label">Next Race</div>
        <div class="next-event">${escapeHtml((data.coaching.next_cup || qc).track.split("—")[0].trim())}</div>
        <div class="next-date">${fmtDate((data.coaching.next_cup || qc).race_date)}</div>
        <div class="next-targets"><strong>Targets:</strong> ${escapeHtml((data.coaching.next_cup || qc).targets)}</div>
      </div>
    `;
  }

  function renderGoals(data) {
    const c = data.coaching;
    const el = document.getElementById("goals-block");
    el.innerHTML = `
      <div class="card">
        <div class="card-label">Season Goals</div>
        <div class="goal-item">
          <div class="goal-league">Cup</div>
          <div class="goal-text">${escapeHtml(c.goals.cup)}</div>
        </div>
        <div class="goal-item">
          <div class="goal-league">Trucks</div>
          <div class="goal-text">${escapeHtml(c.goals.trucks)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Pillars</div>
        <div class="pillars">
          ${c.pillars.map((p) => `<span class="pillar">${escapeHtml(p)}</span>`).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-label">Weekly Rhythm</div>
        <ul class="rhythm-list">
          ${c.weekly_rhythm.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function renderResultsTable(tbody, results) {
    tbody.innerHTML = results
      .map((r) => {
        const event = decodeHtml(r.event) || "—";
        const fCls = finishClass(r.finish);
        const iCls = incClass(r.incidents);
        return `<tr>
          <td class="mono">${fmtShort(r.date)}</td>
          <td>${escapeHtml(event)}</td>
          <td class="mono">${dash(r.quali)}</td>
          <td class="mono ${fCls}">${dash(r.finish)}</td>
          <td class="mono ${iCls}">${dash(r.incidents)}</td>
          <td class="mono">${dash(r.points)}</td>
          <td class="mono">${dash(r.rating)}</td>
        </tr>`;
      })
      .join("");
  }

  function renderCupSchedule(data) {
    const list = document.getElementById("cup-schedule-list");
    const items = data.cup.schedule;

    // Prefer unique upcoming + recent; show all but de-dupe identical null-event chase pairs somewhat
    list.innerHTML = items
      .map((s) => {
        const isNext = s.date === NEXT_RACE_DATE && !s.result;
        const isPast = s.date < TODAY || !!s.result;
        const isChase = s.chase === true;
        const eventName = decodeHtml(s.event) || s.track_hint || "TBD";
        let resultTxt = "";
        let badges = "";

        if (isNext) badges += `<span class="badge badge-next">Next</span>`;
        if (isChase) badges += `<span class="badge badge-chase">Chase</span>`;

        if (s.result) {
          const fin = s.result.finish;
          resultTxt = `P${fin}${fin <= 10 ? " · top-10" : ""} · ${s.result.incidents}x`;
          badges += `<span class="badge badge-done">Done</span>`;
        } else if (s.event && String(s.event).includes("DNS")) {
          badges += `<span class="badge badge-dns">DNS</span>`;
          resultTxt = "DNS";
        } else if (isPast && !s.result && s.date < TODAY) {
          resultTxt = "—";
        } else if (!isPast) {
          resultTxt = "Upcoming";
        }

        const cls = [
          "sched-item",
          isNext ? "next" : "",
          isPast && !isNext ? "past" : "",
          isChase ? "chase" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `<div class="${cls}">
          <div class="sched-date">${fmtShort(s.date)}</div>
          <div class="sched-event">${escapeHtml(eventName)}${badges}</div>
          <div class="sched-result">${escapeHtml(resultTxt)}</div>
        </div>`;
      })
      .join("");
  }

  function renderKansas(data) {
    const k = data.coaching.kansas;
    document.getElementById("kansas-meta").textContent =
      `${fmtDate(k.date)} · ${k.series}`;

    const el = document.getElementById("kansas-block");
    el.innerHTML = `
      <div class="kansas-grid">
        <div class="card">
          <div class="card-label">Result</div>
          <div class="kansas-reported">${escapeHtml(k.reported)}</div>
          <div class="subhead">Garage61</div>
          <div class="g61-stats">
            <div class="g61-stat"><span class="stat-val mono">${escapeHtml(k.garage61.best)}</span><span class="stat-lbl">Best Lap</span></div>
            <div class="g61-stat"><span class="stat-val mono green">${escapeHtml(k.garage61.optimal)}</span><span class="stat-lbl">Optimal</span></div>
            <div class="g61-stat"><span class="stat-val mono">${escapeHtml(k.garage61.clean_pct)}</span><span class="stat-lbl">Clean %</span></div>
            <div class="g61-stat"><span class="stat-val mono">${escapeHtml(k.garage61.quali_best)}</span><span class="stat-lbl">Quali Best</span></div>
          </div>
          <p class="muted" style="font-size:0.8rem;margin-bottom:0.85rem">${escapeHtml(k.garage61.note)}</p>
          <div class="subhead">Setup</div>
          <div class="setup-box">${escapeHtml(k.setup)}</div>
        </div>
        <div class="card">
          <div class="list-cols">
            <div>
              <div class="subhead">Strengths</div>
              <ul class="check-list">
                ${k.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
              </ul>
            </div>
            <div>
              <div class="subhead">Gaps</div>
              <ul class="gap-list">
                ${k.gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderQualcomm(data) {
    const q = data.coaching.qualcomm;
    document.getElementById("qualcomm-meta").textContent = `Race ${fmtDate(q.race_date)}`;

    const el = document.getElementById("qualcomm-block");
    const reported = q.reported
      ? `<div class="card" style="margin-bottom:0.75rem"><div class="card-label">Result</div><div class="card-note">${escapeHtml(q.reported)}</div></div>`
      : "";
    el.innerHTML = `
      ${reported}
      <div class="card qc-intro">
        <div class="qc-track">${escapeHtml(q.track)}</div>
        <div class="qc-focus"><strong>Focus:</strong> ${escapeHtml(q.focus)}</div>
        <div class="qc-targets">Targets: ${escapeHtml(q.targets)}</div>
      </div>
      <div class="practice-grid">
        ${q.practice_plan
          .map(
            (d) => `<div class="day-card">
            <div class="day-name">${escapeHtml(d.day)}</div>
            <div class="day-mins">${escapeHtml(d.mins)} min</div>
            <div class="day-focus">${escapeHtml(d.focus)}</div>
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  function renderTrucks(data) {
    const t = data.trucks;
    const next = data.coaching.trucks_next;
    document.getElementById("trucks-series-label").textContent =
      `${t.series_name} · ${t.season_name}`;

    const summary = document.getElementById("trucks-summary");
    const s = t.summary;
    summary.innerHTML = `
      <div class="card card-accent">
        <div class="card-label">Season 14 Summary</div>
        <div class="stat-row">
          <div class="stat"><span class="stat-val">${dash(s.starts)}</span><span class="stat-lbl">Starts</span></div>
          <div class="stat"><span class="stat-val amber">${dash(s.points)}</span><span class="stat-lbl">Points</span></div>
          <div class="stat"><span class="stat-val">${dash(s.best_finish)}</span><span class="stat-lbl">Best</span></div>
          <div class="stat"><span class="stat-val">${dash(s.avg_finish)}</span><span class="stat-lbl">Avg Fin</span></div>
          <div class="stat"><span class="stat-val">${dash(s.top10s)}</span><span class="stat-lbl">Top-10s</span></div>
          <div class="stat"><span class="stat-val red">${dash(s.total_incidents)}</span><span class="stat-lbl">Incidents</span></div>
        </div>
      </div>
      <div class="card card-next">
        <div class="card-label">Next Slate</div>
        <div class="next-event">${escapeHtml(next.next_race)}</div>
        <p class="muted" style="font-size:0.85rem;margin-bottom:0.5rem">${escapeHtml(next.note)}</p>
        <div class="slate-chips">
          ${next.slate
            .map((track, i) => {
              const isNext = i === 0;
              return `<span class="slate-chip${isNext ? " next-chip" : ""}">${escapeHtml(track)}</span>`;
            })
            .join("")}
        </div>
      </div>
    `;

    renderResultsTable(
      document.querySelector("#trucks-results-table tbody"),
      t.results
    );
  }

  function renderLinks(data) {
    const L = data.coaching.links;
    const el = document.getElementById("links-block");
    const items = [
      { label: "Telemetry", title: "Garage61", url: L.garage61 },
      { label: "Standings", title: "Cup · SimRacerHub", url: L.cup_simracerhub },
      { label: "Standings", title: "Trucks · SimRacerHub", url: L.trucks_simracerhub },
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
    document.getElementById("driver-name").textContent = data.driver.display;
    document.getElementById("last-updated").innerHTML =
      `Updated <strong>${escapeHtml(data.updated)}</strong>`;
    document.getElementById("driver-meta").textContent =
      `${data.driver.oval} · ${data.driver.teams.join(" · ")}`;
    document.getElementById("cup-series-label").textContent =
      `${data.cup.series_name} · ${data.cup.season_name}`;

    renderOverview(data);
    renderGoals(data);
    renderResultsTable(
      document.querySelector("#cup-results-table tbody"),
      data.cup.results
    );
    renderCupSchedule(data);
    renderKansas(data);
    renderQualcomm(data);
    renderTrucks(data);
    renderLinks(data);
  }

  fetch("./data.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load data.json (${r.status})`);
      return r.json();
    })
    .then(renderAll)
    .catch((err) => {
      const main = document.querySelector("main");
      const banner = document.createElement("div");
      banner.className = "error-banner";
      banner.textContent = `Could not load coaching data: ${err.message}`;
      main.prepend(banner);
    });
})();
