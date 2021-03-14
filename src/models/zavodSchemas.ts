import { getModelForClass, mongoose, prop, ReturnModelType } from "@typegoose/typegoose";
import { Document, Model, PromiseProvider } from "mongoose";
import { ModelType, Typegoose } from "typegoose";

export class ZavodPlayer {
    @prop({required: true})
    public discordName: string;
    
    @prop({required: true})
    public discordId: string;

    @prop({required: true})
    public lolName: string;

    @prop()
    public accountId: string;

    @prop()
    public server: string;

    @prop()
    public wins: number;

    @prop()
    public loses: number;

    @prop()
    public games: number;

    @prop()
    public successfullLosePredictions?: number;

    @prop()
    public ladderPosition: number;

    @prop({required: true})
    public id: string;

    public static async exists(this: ReturnModelType<typeof ZavodPlayer>, lolName: string, discordId: string) {
        return this.find({ lolName, discordId }).exec();
    }

    public static async findByName(this: ReturnModelType<typeof ZavodPlayer>, lolName: string) {
        return this.find({ lolName }).exec();
    }

    public static async findByPlayerId(this: ReturnModelType<typeof ZavodPlayer>, id: string) {
        return this.find({ id} ).exec();
    }

    public static async findByDiscordId(this: ReturnModelType<typeof ZavodPlayer>, discordId: string): Promise<ZavodPlayer | null> {
        let result: Array<ZavodPlayer> = await this.find({ discordId }).exec();
        return result[0];
    }
}

export class ZavodGamePlayer {
    @prop()
    id?: string;

    @prop()
    winner?: boolean;
}

export enum ZavodPrediction {
    win = 'win',
    fail = 'neshitovaya'
}

export class ZavodGame {
    @prop()
    public lolGameId?: number;

    @prop({required: true})
    public discordChannel?: string;

    @prop()
    public prediction?: string;

    @prop({type: ZavodGamePlayer})
    public players: Array<ZavodGamePlayer>;

    @prop({required: true})
    public status?: string;

    @prop({required: true})
    public time?: number;

    @prop()
    public server: string;

    @prop()
    public completed: boolean;

    @prop()
    public isWin: boolean;
    
    public static async findByPlayerId(this: ReturnModelType<typeof ZavodGame>, playerId: string, completed: boolean): Promise<Document<ZavodGame> & ZavodGame | null> {
        let result: Array<Document<ZavodGame> & ZavodGame> = await this.find({ "players.id": playerId, "completed": completed }).exec();
        return result.length > 0 ? result[0] : null;
    }

    public static async findIncompleteGames(this: ReturnModelType<typeof ZavodGame>) {
        return this.find({ "completed": false }).exec();
    }
}

export const ZavodPlayerModel = getModelForClass(ZavodPlayer);
export const ZavodPlayerModelTyped: ReturnModelType<typeof ZavodPlayer, {}> = getModelForClass(ZavodPlayer);

export const ZavodGameModel = getModelForClass(ZavodGame);
export const ZavodGameModelTyped: ReturnModelType<typeof ZavodGame, {}> = getModelForClass(ZavodGame);

export const ZavodGamePlayerModel = getModelForClass(ZavodGamePlayer);
export const ZavodGamePlayerModelTyped: ReturnModelType<typeof ZavodGamePlayer> & ZavodGamePlayer = getModelForClass(ZavodGamePlayer);



export interface ZavodCheckPlayer {
    player: ZavodPlayer,
    gameModelData?: ModelType<ZavodGame> & ZavodGame,
    game?: ZavodGame
}