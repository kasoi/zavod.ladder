import { ZavodGamePlayer, ZavodPlayer } from "../../models/zavodSchemas";

export const enum GameMatchResult {
    win = "Win",
    fail = "Fail"
}

export const enum GameMatchStatus {
    completed = 'completed',
    awaiting = 'awaiting',
    playing = 'playing',
    aborted = 'aborted'
}

export interface IPlayerData {
    id: string;
    accountId: string;
    puuid: string;
    name: string;
    profileIconId: number;
    revisionDate: number;
    summonerLevel: number;
}

export interface IMatchData {
    platformId: string,
    gameId: number,
    champion: number,
    queue: number,
    season: number,
    timestamp: number,
    role: string,
    lane: string
}

export interface IMatchesData {
    matches: Array<IMatchData>;
}

export interface IGameData {
    gameId: number;
    platformId: string;
    gameCreation: number,
    gameDuration: number,
    queueId: number,
    mapId: number,
    seasonId: number,
    gameVersion: string,
    gameMode: string,
    gameType: string,
    teams: Array<IGameDataTeam>,
    participants: Array<IGameDataParticipant>,
    participantIdentities: Array<IGameDataParticipantIdentitiy>
}

export interface IGameDataTeam {
    teamId: number,
    win: string,
    firstBlood: boolean,
    firstTower: boolean,
    firstInhibitor: boolean,
    firstBaron: boolean,
    firstDragon: boolean,
    firstRiftHerald: boolean,
    towerKills: number,
    inhibitorKills: number,
    baronKills: number,
    dragonKills: number,
    vilemawKills: number,
    riftHeraldKills: number,
    dominionVictoryScore: number,
    bans: any
}

export interface IGameDataParticipant {
    participantId: number,
    teamId: number,
    championId: number,
    spell1Id: number,
    spell2Id: number,
    stats?: any,
    timeline?: any
}

export interface IGameDataParticipantIdentitiy {
    participantId: number,
    player: IGameDataPlayer
}

export interface IGameDataPlayer {
    platformId: string,
    accountId: string,
    summonerName: string,
    summonerId: string,
    currentPlatformId: string,
    currentAccountId: string,
    matchHistoryUri: string,
    profileIcon: number
}

export interface IActiveGameData {
    gameId: number,
    mapId: number,
    gameMode: string,
    gameType: string,
    gameQueueConfigId: number,
    participants: Array<IActiveGameDataParticipant>,
    observers: IObserver,
    platformId: string,
    bannedChampions: Array<IBannedChampion>,
    gameStartTime: number,
    gameLength: number
}

export interface IObserver {
    encryptionKey: string
}

export interface IActiveGameDataParticipant extends IGameDataParticipant {
    profileIconId: number,
    bot: boolean,
    summonerName: string,
    summonerId: string,
    gameCustomizationObjects: Array<any>,
    perks: any
}

export interface IBannedChampion {
    championId: number,
    teamId: number,
    pickTurn: number
}