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
/**
 * Various things that could end up on the end of URLs due to Discord formatting rules
 */
const DISCORD_URL_MANGLINGS = [
	'||',
	'%3E',
	'*',
	'_',
	')'
];

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

function cleanupUrl(url: string): string | null {
	const urlPath = URL.parse(url).pathname;
	if (!urlPath) return null; // we can't tell

	const extRaw = path.extname(urlPath);
	const ext = DISCORD_URL_MANGLINGS.reduce((ext, badStr) => ext.split(badStr).join(''), extRaw);
	if (!ext || !IMAGE_EXTENSIONS.includes(ext)) return null; // probably not an image

	return url.replace(extRaw, ext);
}

async function isImageSafe(url: string, bannedTags: string[]): Promise<boolean> {
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

	const messageLinks = [...getUrls(msg.content)].concat(msg.attachments.array().map(attachment => attachment.url));

	for (const urlRaw of messageLinks) {
		const url = cleanupUrl(urlRaw);
		if (!url) continue;
		console.log(`${msg.id} - Processing ${url}`);

		if (!await isImageSafe(url, bannedTags) && msg.deletable) {
			await msg.delete();
			console.log(`${msg.id} - Message is NOT clean. Removing...`);
			const warnStr = `Your message was removed for containing images with one of the following tags on Derpibooru: \`${bannedTags.join(', ')}\``;
			try {
				await msg.reply(warnStr);
			} catch (e) {
				try {
					console.log(`${msg.id} - Couldn't warn user in chat; Send Messages not allowed on channel #${(msg.channel as Discord.TextChannel).name}. Attempting to DM...`);
					await msg.author.send(warnStr);
				} catch (e) {
					console.log(`${msg.id} - Couldn't warn user over DMs.`);
				}
			}
			return;
		}
	}

	console.log(`${msg.id} - Message is probably clean.`);
});

client.login(config.discord.token)
	.catch(console.error);
