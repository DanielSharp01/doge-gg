import { config } from 'dotenv';
import { CharmServer } from './CharmServer';
import { DiscordBot } from './DiscordBot';

config();

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const bot = new DiscordBot();