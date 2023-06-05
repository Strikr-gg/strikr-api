import { ODYSSEY } from '@types'

export function sumRoleStatProperties(
  roleStatArray: ODYSSEY.RAW.RoleStats[],
): ODYSSEY.RAW.RoleStat {
  const sum: ODYSSEY.RAW.RoleStat = {
    assists: 0,
    games: 0,
    knockouts: 0,
    losses: 0,
    mvp: 0,
    saves: 0,
    scores: 0,
    wins: 0,
  }

  // Iterate over each RoleStats object in the array
  for (const roleStats of roleStatArray) {
    // Iterate over each property in RoleStat
    for (const role of Object.values(roleStats)) {
      sum.assists += role.assists
      sum.games += role.games
      sum.knockouts += role.knockouts
      sum.losses += role.losses
      sum.mvp += role.mvp
      sum.saves += role.saves
      sum.scores += role.scores
      sum.wins += role.wins
    }
  }

  return sum
}
