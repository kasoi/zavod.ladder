import { ILolRequest } from "./lol";

export class LolRequestManager {
    private baseUrl: string;
    private limit: number;
    private apiKey: string;

    private constructor(baseUrl: string, limit: number, key: string) {
        this.baseUrl = baseUrl;
        this.limit = limit;
        this.apiKey = key;
    }

    public async get(params: ILolRequest): Promise<void> {
        
    }
}