import * as Discord from 'discord.js';
import { Fetch } from 'node-derpi';
import getUrls = require('get-urls');
import * as URL from 'url';
import * as path from 'path';

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

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif'].map(ext => `.${ext}`);

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const config = require('../config.json') as BotConfig;

const client = new Discord.Client({
	disabledEvents: [
		'TYPING_START'
	],
	disableEveryone: true
});

client
	.on('ready', () => {
		console.log(`Ready at ${(new Date()).toISOString()}`);
		console.log(`Logged in as: @${client.user.username}#${client.user.discriminator} (${client.user.id})`);
	})
	.on('error', console.error)
	.on('warn', console.warn)
	.on('debug', msg => {
		if (process.env.NODE_ENV !== 'production') {
			console.log(msg);
		}
	});

async function isImageSafe(url: string, bannedTags: string[]): Promise<boolean> {
	const urlPath = URL.parse(url).pathname;
	if (!urlPath) return true; // we can't tell

	const ext = path.extname(urlPath);
	if (!ext || !IMAGE_EXTENSIONS.includes(ext)) return true; // probably not an image

	const reverseImageResults = await Fetch.reverseImageSearch({
		key: config.derpi.apiKey,
		url: url,
		fuzziness: 0.2
	});

	for (const result of reverseImageResults.images) {
		if (result.tagString.split(', ').some(tag => bannedTags.includes(tag))) {
			return false;
		}
	}

	return true;
}

client.on('message', async msg => {
	if (msg.author.bot) return;
	if (msg.channel.type !== 'text') return;
	if (msg.attachments.size >= 1) await sleep(200); // allow attachments some time to propagate to CDN

	const nsfwChannel = (msg.channel as Discord.TextChannel).nsfw;
	const appropriateTagSet = nsfwChannel ? config.derpi.bannedTags.nsfw : config.derpi.bannedTags.sfw;
	const bannedTags = config.derpi.bannedTags.both.concat(appropriateTagSet);

	const messageLinks = getUrls(msg.content);

	for (const url of messageLinks) {
		console.log(`${msg.id} - [text] Processing '${url}'`);

		if (!await isImageSafe(url, bannedTags) && msg.deletable) {
			await msg.delete();
			console.log(`${msg.id} - Message is NOT clean. Removing...`);
			return msg.reply(`your message was removed for containing images with one of the following tags: \`${bannedTags.join(', ')}\``);
		}
	}

	for (const attachment of msg.attachments.values()) {
		const url = attachment.url;

		console.log(`${msg.id} - [attach] Processing '${url}'`);

		if (!await isImageSafe(url, bannedTags) && msg.deletable) {
			await msg.delete();
			console.log(`${msg.id} - Message is NOT clean. Removing...`);
			return msg.reply(`your message was removed for containing images with one of the following tags: \`${bannedTags.join(', ')}\``);
		}
	}

	console.log(`${msg.id} - Message is probably clean.`);
});

client.login(config.discord.token)
	.catch(console.error);
