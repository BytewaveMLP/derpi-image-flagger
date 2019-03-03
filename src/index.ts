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

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const config = require('../config.json') as BotConfig;

const client = new Discord.Client();

client
	.on('error', console.error)
	.on('warn', console.warn)
	.on('debug', msg => {
		if (process.env.NODE_ENV !== 'production') {
			console.log(msg);
		}
	});

client.on('message', async msg => {
	if (msg.channel.type !== 'text') return;
	if (msg.attachments.size < 1) return;

	await sleep(200);

	const nsfwChannel = (msg.channel as Discord.TextChannel).nsfw;
	const appropriateTagSet = nsfwChannel ? config.derpi.bannedTags.nsfw : config.derpi.bannedTags.sfw;
	const bannedTags = config.derpi.bannedTags.both.concat(appropriateTagSet);

	for (const attachment of msg.attachments.values()) {
		const url = attachment.url;

		console.log(`${msg.id} - Processing '${url}'`);

		const reverseImageResults = await Fetch.reverseImageSearch({
			key: config.derpi.apiKey,
			url: url,
			fuzziness: 0.2
		});

		for (const result of reverseImageResults.images) {
			if (result.tagString.split(', ').some(tag => bannedTags.includes(tag)) && msg.deletable) {
				await msg.delete();
				return msg.reply(`your message was removed for containing images with one of the following tags: ${bannedTags.join(', ')}`);
			}
		}
	}
});

client.login(config.discord.token);