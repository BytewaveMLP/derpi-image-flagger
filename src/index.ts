import * as Discord from 'discord.js';
import { Fetch } from 'node-derpi';

interface BotConfig {
	discord: {
		token: string;
	};
	derpi: {
		apiKey: string;
		bannedTags: {
			nsfw: string[],
			sfw: string[],
			both: string[]
		}
	};
}

const config = require('../config.json') as BotConfig;

const client = new Discord.Client();

client.login(config.discord.token);