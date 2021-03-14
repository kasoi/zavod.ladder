import * as rm from 'typed-rest-client/RestClient';
import { IActiveGameData, IGameData, IMatchData, IMatchesData, IPlayerData } from './lol';

const PLAYER_CMD = (server: string, name: string) => BASE_URL(server) + `/lol/summoner/v4/summoners/by-name/${name}`;
const ACTIVE_MATCH_CMD = (server: string, accountId: string) => BASE_URL(server) + `/lol/spectator/v4/active-games/by-summoner/${accountId}`;
const MATCH_CMD = (server: string, id: string, start: number = 0, end: number = 10) => {
    return BASE_URL(server) + `/lol/match/v4/matchlists/by-account/${id}?beginIndex=${start}&endIndex=${end}`;
}
const BASE_URL = (server: string) => `https://${server}.api.riotgames.com/`;

export class LolApi {
    private key: string;
    private players: Array<IPlayerData>;
    private headers: rm.IRequestOptions;

    public constructor(key: string) {
        this.key = key;
        this.players = new Array<IPlayerData>();
        this.headers = {additionalHeaders: {'X-Riot-Token': this.key}};
    }

    public async getPlayerDataByName(name: string, server: string = 'euw1'): Promise<IPlayerData> {
        let found: IPlayerData | undefined = this.players.find(player => player.name.toLowerCase() == name.toLowerCase());
        if (found) {
            return found;
        }

        name = encodeURIComponent(name);
        let url: string = PLAYER_CMD(server, name);
        // let url: string = `https://${server}.api.riotgames.com/${PLAYER_CMD}/${name}`;
        let rest: rm.RestClient = new rm.RestClient(null, this.getBaseUrl(server));
        let response: rm.IRestResponse<IPlayerData> = await rest.get<IPlayerData>(url, this.headers);        

        if (response.statusCode >= 400) throw new Error(`getPlayerDataByName(): rejected with status code: ${response.statusCode}; Response: ${response.result}`);
        if (response.result !== null && response.result as IPlayerData !== null) {
            this.players.push(response.result);
        }        
        
        return response.result as IPlayerData;
    }

    async getMatches(name: string, start: number = 0, end: number = 10, server: string = 'euw1'): Promise<IMatchesData | null> {
        let playerData: IPlayerData | null = await this.getPlayerDataByName(name, server);
    
        if (!playerData) return new Promise( (resolve, reject) => {
            reject(null);
        });

        let url = MATCH_CMD(server, playerData?.accountId, start, end);
        let rest: rm.RestClient = new rm.RestClient(null, this.getBaseUrl(server));
        let response: rm.IRestResponse<IMatchesData> = await rest.get<IMatchesData>(url, this.headers);

        return (response.statusCode >= 400) ? null : response.result;
    }

    async getMatchData(id: number, server: string = 'euw1'): Promise<IGameData> {
        let url = `https://${server}.api.riotgames.com/lol/match/v4/matches/${id}`;
        
        let rest: rm.RestClient = new rm.RestClient(null, this.getBaseUrl(server));
        let response: rm.IRestResponse<IGameData> = await rest.get<IGameData>(url, this.headers);
        if (response.statusCode >= 400) throw new Error('get match data: status code >= 400');
        
        return response.result as IGameData;
    }

    async getActiveMatch(accountId: string, server: string = 'euw1'): Promise<IActiveGameData | null> {
        let url = ACTIVE_MATCH_CMD(server, accountId);

        let rest: rm.RestClient = new rm.RestClient(null, this.getBaseUrl(server));
        let response: rm.IRestResponse<IActiveGameData> = await rest.get<IActiveGameData>(url, this.headers);

        // console.log('acc id:', accountId);
        
        // console.log(response.result, response.statusCode);
        
        if (response.statusCode === 404) return null;
        if (response.statusCode >= 400) throw new Error(`get active match data: status code >= 400`);
        return response.result as IActiveGameData;
    }

    private getBaseUrl(server: string): string {
        return `https://${server}.api.riotgames.com/`;
    }

    private formatCommand(command: string, params?: any): string {
        let cmd: string = command;
        if (params !== null && params !== undefined) {
            cmd += '?' + new URLSearchParams(params);
        }
        return cmd;
    }

    private formatUrl(command: string, server: string, params?: any): string {
        let url: string = `https://${server}.api.riotgames.com/${command}`;
        
        if (params !== null && params !== undefined) {
            url += '?' + new URLSearchParams(params);
        }
        return url;
    }

    private getNullPromise<T>() : Promise<T> {
        return new Promise((resolve, reject) => {reject(null)});
    }
}