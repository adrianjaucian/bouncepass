export function getPlayerNameFromRow(player, index = 0) {
  return (
    player?.Player ||
    player?.Name ||
    player?.PLAYER ||
    player?.player ||
    Object.values(player || {})[0] ||
    `Player ${index + 1}`
  );
}

export function getPlayerDashboardHref(playerName) {
  return `/player-dashboard?player=${encodeURIComponent(playerName)}`;
}
