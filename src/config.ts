import dotenv from 'dotenv';

const config = dotenv.config();

export class DotenvConfig {
    // MONGO_DB_PATH: string = process.env.MONGO_DB_PATH_PROD as string;
    MONGO_DB_PATH: string = process.env.MONGO_DB_PATH as string;
    LOL_API_KEY: string = process.env.LOL_API_KEY as string;
    SHEET_PATH: string = process.env.SHEET_PATH as string;
    APP_PORT: number = Number(process.env.PORT);
}