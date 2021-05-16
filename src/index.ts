import { config } from 'dotenv';
import { DiscordBot } from './DiscordBot';

config();

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

new DiscordBot();