import { mongoose } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
import EventEmitter from "events";
import { ObjectId } from "mongodb";
import { Document, Model } from "mongoose";
import { DotenvConfig } from "../config";
import { ZavodCheckPlayer, ZavodGame, ZavodGameModel, ZavodGameModelTyped, ZavodGamePlayer, ZavodPlayer, ZavodPlayerModel, ZavodPrediction } from "../models/zavodSchemas";
import { GameMatchStatus, IActiveGameData, IGameData, IPlayerData } from "./lol";
import { LolApi } from "./lolApi";
import { AWAITING_FOR_TOO_LONG, GAME_COMPLETED, GAME_PLAY_TIME_TOO_BIG, GAME_STARTED } from "./lolEvents";
import { LolHelper } from "./lolHelper";

export class LolManager extends EventEmitter{
    private api: LolApi = new LolApi(new DotenvConfig().LOL_API_KEY);

    private intervalId: NodeJS.Timeout | null = null;

    private defaultServer: string = 'euw1';

    public async registerPlayer(lolName: string, discordId: string, discordName: string, server: string = 'euw1'): Promise<ZavodPlayer> {
        const playerInfo: IPlayerData = await this.api.getPlayerDataByName(lolName, server);

        let playerData: ZavodPlayer = {
            lolName: lolName,
            discordId: discordId,
            discordName: discordName,
            server: server,
            games: 0,
            wins: 0,
            accountId: playerInfo.accountId,
            ladderPosition: 0,
            loses: 0,
            successfullLosePredictions: 0,
            id: (new ObjectId()).toHexString(),
        } 

        let found: Array<ZavodPlayer> = await ZavodPlayerModel.exists(playerData.lolName, discordId);        
        if (found.length > 0) return found[0];
        
        let player = await ZavodPlayerModel.create(playerData);
        return playerData;
    }

    public startTimer(): void {
        if (this.intervalId) this.stopTimer();

        this.intervalId = setInterval(this.checkMatches.bind(this), 25000);
    }

    public stopTimer(): void {
        if (this.intervalId) clearInterval(this.intervalId as NodeJS.Timeout);
    }

    private async checkMatches(): Promise<void> {
        let games: Array<ZavodGame> = await ZavodGameModel.findIncompleteGames();
        // console.log(games);
        
        let merged: Array<ZavodGame> = new Array<ZavodGame>();

        for (const game of games) {
            let found: ZavodGame | undefined = merged.find(game => game.lolGameId === game.lolGameId);
            if (found && found.lolGameId !== undefined) {
                (found.players as Array<ZavodGamePlayer>).concat(game.players as Array<ZavodGamePlayer>);
            }
            else {
                const index = games.indexOf(game);
                games.splice(index, 1);
                merged.push(game);
            }
        }

        for (const p of merged) {
            let players: Array<ZavodGamePlayer> | undefined = p.players;
            
            if (players) {
                let foundPlayers: Array<ZavodPlayer> = await ZavodPlayerModel.findByPlayerId(players[0].id || '');
                if (foundPlayers.length > 0) this.checkMatchByPlayer(foundPlayers[0]).then().catch(err => err);
            }
        }

        for (const game of games) {
            console.log('delete clone:', game);
            
            await ZavodGameModel.deleteOne(game);
        }
    }

    public async getAllPlayers(): Promise<Array<ZavodPlayer>> {
        let players: Array<ZavodPlayer> = [];

        players = await ZavodPlayerModel.find().exec();

        return players;
    }

    public async getGames(from: number = 0, amount: number = 10): Promise<ZavodGame[]> {
        let games: ZavodGame[] = [];

        games = await ZavodGameModel.find().limit(amount).skip(from).exec();

        return games;
    }

    public async changeMatchPrediction(win: boolean, discordId: string): Promise<ZavodGame | null> {
        let game = await this.getGameByDiscordId(discordId as string); 
        if (game == null) throw new Error("No games found");

        let zGame: ZavodGame = game as ZavodGame;
        
        let player: ZavodPlayer | null = await ZavodPlayerModel.findByDiscordId(discordId);
        
        if (player) {
            let match: IActiveGameData | null = await this.getActiveGameByName(player.lolName as string, player.server);
            if (match?.gameLength as number > 30) throw new Error("Game already running. Can't predict anymore");
        }
        
        zGame.prediction = win ? ZavodPrediction.win : ZavodPrediction.fail;
        await game.save();

        return game;
    }

    public async registerMatch(discordId: string, discordChannel: string): Promise<ZavodGame | null> {
        let player: ZavodPlayer | null = await ZavodPlayerModel.findByDiscordId(discordId);
        
        if (player == null) return null;
        
        return await this.checkMatchByPlayer(player, discordChannel);
    }

    public async checkMatchByDiscordId(discordId: string): Promise<ZavodGame | null> {
        let player: ZavodPlayer | null = await ZavodPlayerModel.findByDiscordId(discordId);
        if (player == null) return null;
        
        return await this.checkMatchByPlayer(player);
    }

    public async checkMatchByGame(game: Document<ZavodGame>, player: ZavodPlayer): Promise<ZavodGame | null> {
        let server: string = player.server as string;
        let zGame = game.toObject() as ZavodGame;

        console.log('check match. Game status:', zGame.status);
        
        if (zGame.completed === true) return zGame;

        let activeGame: IActiveGameData | null = await this.getActiveGameByName(player.lolName as string, server);
        
        // if game is null, it seems its ended
        if (activeGame === null && zGame.lolGameId as number > 0 && zGame.status === GameMatchStatus.playing) {
            // complete the game
            zGame = await this.completeGame(game, server);
            return zGame;
        }

        if (activeGame === null) {
            let currentTime = new Date().getTime() / 1000;
            let diff = currentTime - (zGame.time as number);
            
            if (diff > 60 * 10) {
                // console.log(`Awaiting more than 10 minutes, deleting the game`);
                let q = await ZavodGameModelTyped.deleteOne(zGame);
                this.emit(AWAITING_FOR_TOO_LONG, game);
                throw new Error('Awaiting more than 10 minutes, game deleted');
            }
            return null;
        }

        // console.log('checkMatch(): game length:', Math.floor(activeGame.gameLength / 60) + ':' + activeGame.gameLength % 60);
        
        if (zGame.status === GameMatchStatus.awaiting) {
            zGame.status = GameMatchStatus.playing;
            zGame.lolGameId = activeGame.gameId;
            await game.save();
            
            if (activeGame.gameLength > 0) {
                let q = await ZavodGameModelTyped.deleteOne(zGame);
                zGame.status = GameMatchStatus.aborted;
                this.emit(GAME_PLAY_TIME_TOO_BIG, game);
                throw new Error("Game already started. Not fair");
            }

            this.emit(GAME_STARTED, zGame);
            return zGame;
        }
        if (zGame.status === GameMatchStatus.playing) {
            // do nothing
        }

        return null;
    }

    private async completeGame(game: Document<ZavodGame>, server: string): Promise<ZavodGame> {
        console.log('completing the game...');

        const zGame: ZavodGame = game.toObject() as ZavodGame;
        let matchData = await this.getMatchById(zGame.lolGameId as number, server);
        let parsedGame = await this.parseMatch(matchData);
        
        zGame.players = parsedGame.players;
        zGame.status = GameMatchStatus.completed;
        zGame.completed = true;

        const predicted = (zGame.prediction == ZavodPrediction.win && zGame.isWin) || (zGame.prediction == ZavodPrediction.fail && !zGame.isWin);
        for (const p of zGame.players) {
            const found: Array<ZavodPlayer> = await ZavodPlayerModel.findByPlayerId(p.id || '');
            if (found.length < 1) continue;
            const player = found[0];

            await this.changePlayerLadderPosition(player, zGame.isWin, predicted);

        }

        await game.save();
        this.emit(GAME_COMPLETED, zGame);
        return zGame;
    }

    private async changePlayerLadderPosition(player: ZavodPlayer, up: boolean, predicted: boolean = false): Promise<void> {

    }

    public async checkMatchByPlayer(player: ZavodPlayer, discordChannel: string | null = null): Promise<ZavodGame | null> {
        let game: Document<ZavodGame> = await this.findOrCreateGame(player.discordId as string, discordChannel);        
        return await this.checkMatchByGame(game, player);
    }

    private async getGameByDiscordId(discordId: string): Promise<Document<ZavodGame> & ZavodGame | null> {
        let player: ZavodPlayer | null = await ZavodPlayerModel.findByDiscordId(discordId);
        
        if (!player) throw new Error('no players found with this discord id');

        let found: Document<ZavodGame> & ZavodGame | null = await ZavodGameModel.findByPlayerId(player.id, false);
        
        if (found != null) return found;
        return null;
    }

    private async findOrCreateGame(discordId: string, discordChannel: string | null = null): Promise<Document<ZavodGame>> {
        let player: ZavodPlayer | null = await ZavodPlayerModel.findByDiscordId(discordId);
        
        if (!player) throw new Error('no players found with this discord id');
        
        let found: Document<ZavodGame> | null = await ZavodGameModel.findByPlayerId(player.id, false);
        
        if (found != null) return found;
                
        let game: ZavodGame = {
            completed: false, 
            discordChannel: discordChannel as string, 
            players: new Array<ZavodGamePlayer>(),
            isWin: false,
            server: player.server
        };
        game.time = Math.floor(new Date().getTime() / 1000);
        game.status = GameMatchStatus.awaiting;
        game.players.push({id: player.id});

        const created: Document<ZavodGame> = await ZavodGameModel.create(game);
        
        return created;
    }

    public async getMatchById(id: number, server: string = 'euw1'): Promise<IGameData> {
        let match = await this.api.getMatchData(id, server);
        return match;
    }

    public async parseMatch(match: IGameData): Promise<ZavodGame> {
        let players: Array<ZavodGamePlayer> = new Array<ZavodGamePlayer>();
        let winnerIds: Array<number> = new Array<number>();
        let server: string = this.defaultServer;

        const winningTeamNum: number = LolHelper.teamIsWinner(match.teams[0]) ? match.teams[0].teamId : match.teams[1].teamId;
        
        match.participants.forEach(par => {
            if (par.teamId == winningTeamNum) winnerIds.push(par.participantId);
        });
        
        for(const par of match.participantIdentities) {
            let zgPlayer: ZavodGamePlayer = {};
            let found: Array<ZavodPlayer> = await ZavodPlayerModel.findByName(par.player.summonerName);
            
            if (found.length > 0) {
                server = found[0].server;
                zgPlayer.id = found[0].id;
                zgPlayer.winner = winnerIds.includes(par.participantId);
                players.push(zgPlayer);
            }
        }
        
        const isWinner: boolean = players[0].winner || false;

        let gameData: ZavodGame = {
            lolGameId: match.gameId,
            prediction: isWinner ? ZavodPrediction.win : ZavodPrediction.fail,
            players: players,
            completed: true,
            isWin: isWinner,
            server: server,
        }

        return gameData;
    }

    public async getLastMatchByName(name: string): Promise<IGameData | null> {
        let data = await this.api.getMatches(name, 0, 1);  
        let lastMatch = data?.matches[0];
        let match = await this.api.getMatchData(lastMatch?.gameId || 0);

        return match;
    }

    public async getActiveGame(player: IPlayerData, server: string = 'euw1'): Promise<IActiveGameData | null> {
        if (player === undefined || player === null) throw new Error(`can't retrieve player data`);

        let data: IActiveGameData | null = await this.api.getActiveMatch(player.id, server);

        return data;
    }

    public async getActiveGameByName(lolName: string, server: string = 'euw1'): Promise<IActiveGameData | null> {
        let player: IPlayerData = await this.api.getPlayerDataByName(lolName, server);
        
        return this.getActiveGame(player, server);
    }
}