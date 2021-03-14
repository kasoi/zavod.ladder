import { GameMatchResult, IGameDataTeam } from "./lol";

export class LolHelper {
    public static teamIsWinner(team: IGameDataTeam): boolean {
        return team.win.toLowerCase() === GameMatchResult.win.toLowerCase();
    }
}