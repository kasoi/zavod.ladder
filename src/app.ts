import express from 'express';
import { DotenvConfig } from './config';
import { DocumentType, getModelForClass, mongoose, prop } from '@typegoose/typegoose';
import { LolManager } from './lol/lolManager';
import cors from 'cors';
import * as rm from 'typed-rest-client/RestClient';
import { ISheetDocument } from './models/sheetTypes';
import { ZavodLadder } from './zavod/zavodLadder';
import { ZavodPlayerApi } from './models/zavodTypes';
import { ZavodPlayer } from './models/zavodSchemas';

console.log('init');

const envConfig: DotenvConfig = new DotenvConfig();

const db: string = envConfig.MONGO_DB_PATH;

console.log(`connect mongo: ${String(db).substr(0, 15)}...`);

mongoose.connect(db, {useNewUrlParser: true, useUnifiedTopology: true}).then(startApp);

let ladder: ZavodLadder = new ZavodLadder();

async function startApp() {
    let rest: rm.RestClient = new rm.RestClient(null, envConfig.SHEET_PATH);
    let response: rm.IRestResponse<ISheetDocument> = await rest.get<ISheetDocument>(envConfig.SHEET_PATH);
    
    ladder.parseDoc(response.result as ISheetDocument);
}

const app = express();
const lolMan = new LolManager();

console.log('start express');


app.use(cors());

app.get('/', (req, res) => {
    res.send('Well done!');
});

app.get('/users', async (req, res) => {
    const players = await lolMan.getAllPlayers();

    let newPlayers = players.map(player => {
        const p: ZavodPlayer = (player as DocumentType<ZavodPlayer>).toObject();
        
        const result: ZavodPlayerApi = {
            ...(p),
            ladderPositionName: ladder.getLadderPositionName(p.ladderPosition)
        }
        return result;
    });    

    res.json(newPlayers);
});

app.get('/games', async (req, res) => {
    const games = await lolMan.getGames();

    res.json(games);
})

app.get('/users/:id', (req, res) => {
    // console.log(req);
    
    res.send(`asking for id: ${req.params.id}, ${req.body}`); 
});

console.log('start listen...');

app.listen(envConfig.APP_PORT, () => {
    console.log(`The application is listening on port ${envConfig.APP_PORT}!`);
})