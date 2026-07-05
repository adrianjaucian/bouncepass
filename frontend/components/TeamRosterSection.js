"use client";

import PlayerLink from "./PlayerLink";

const tableHeaderStyle = {
  padding: "10px",
  color: "#000",
  fontWeight: "bold",
};

function formatPerGame(value, games) {
  if (value == null || !games) return "—";
  return Number(value).toFixed(1);
}

export default function TeamRosterSection({
  players,
  teamLabel = "",
  onSelectPlayer,
  selectedPlayer = "",
}) {
  if (!players?.length) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>
        Team Roster{teamLabel ? ` — ${teamLabel}` : ""}
      </h3>
      <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>
        {players.length} player{players.length === 1 ? "" : "s"} with saved box score data.
        {onSelectPlayer ? " Click a name to load their dashboard." : " Click a name to open their dashboard."}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            border: "1px solid #e1e8ed",
            minWidth: "640px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f1f6f9" }}>
              <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Player</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>MIN</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>PTS</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>REB</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>AST</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>STL</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>BLK</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isSelected = selectedPlayer === player.player;
              const nameCell = onSelectPlayer ? (
                <button
                  type="button"
                  onClick={() => onSelectPlayer(player.player)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#3498db",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "14px",
                    textAlign: "left",
                  }}
                >
                  {player.player}
                </button>
              ) : (
                <PlayerLink name={player.player} />
              );

              return (
                <tr
                  key={player.player}
                  style={{
                    backgroundColor: isSelected ? "#ebf5fb" : index % 2 === 0 ? "#fff" : "#fafbfc",
                  }}
                >
                  <td style={{ padding: "10px", color: "#000" }}>{nameCell}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{player.games}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                    {player.mp_mins != null ? Number(player.mp_mins).toFixed(1) : "—"}
                    <span style={{ color: "#7f8c8d", fontSize: "12px" }}>
                      {" "}
                      ({player.games ? (player.mp_mins / player.games).toFixed(1) : "—"})
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                    {player.pts}
                    <span style={{ color: "#7f8c8d", fontSize: "12px" }}>
                      {" "}
                      ({formatPerGame(player.pts_pg, player.games)})
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                    {player.trb}
                    <span style={{ color: "#7f8c8d", fontSize: "12px" }}>
                      {" "}
                      ({formatPerGame(player.trb_pg, player.games)})
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                    {player.ast}
                    <span style={{ color: "#7f8c8d", fontSize: "12px" }}>
                      {" "}
                      ({formatPerGame(player.ast_pg, player.games)})
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{player.stl}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{player.blk}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
