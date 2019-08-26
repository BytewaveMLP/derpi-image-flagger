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

/**
 * Common image extensions whitelist
 */
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
/**
 * List of known Derpibooru hostnames
 */
const DERPIBOORU_HOSTNAMES = [
	'derpibooru.org',
	'trixiebooru.org',
	'www.derpibooru.org',
	'www.trixiebooru.org'
];
/**
 * List of known Derpi CDN hostnames
 */
const DERPICDN_HOSTNAMES = [
	'derpicdn.net',
	'www.derpicdn.net'
];

const DERPIBOORU_IMAGE_ID_REGEXP = /^\/(?:images\/)?(\d+)/;
const DERPICDN_IMAGE_ID_REGEXP = /^\/img(?:\/(?:view|download))?\/\d+\/\d+\/\d+\/(\d+)/;

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

function unmangle(component: string): string {
	return DISCORD_URL_MANGLINGS.reduce((_component, badStr) => _component.split(badStr).join(''), component);
}

function cleanupUrl(url: string): string | null {
	const parsedUrl = URL.parse(url);
	const urlPath = parsedUrl.pathname;
	if (!urlPath) return null; // we can't tell

	const extRaw = path.extname(urlPath);
	const ext = unmangle(extRaw);
	if (!IMAGE_EXTENSIONS.includes(ext) && !DERPIBOORU_HOSTNAMES.includes(parsedUrl.hostname as string) && !DERPICDN_HOSTNAMES.includes(parsedUrl.hostname as string)) return null; // probably not an image

	parsedUrl.pathname = urlPath.replace(extRaw, ext);

	return parsedUrl.href as string;
}

async function isImageSafe(url: string, bannedTags: string[]): Promise<string[]> {
	const parsedURL = URL.parse(url);
	const hostname  = parsedURL.hostname as string;
	const path      = parsedURL.pathname as string;
	const isDerpibooruLink = DERPIBOORU_HOSTNAMES.includes(hostname);
	const isDerpiCDNLink   = DERPICDN_HOSTNAMES.includes(hostname);
	if (isDerpibooruLink || isDerpiCDNLink) {
		const matches = path.match(isDerpibooruLink ? DERPIBOORU_IMAGE_ID_REGEXP : DERPICDN_IMAGE_ID_REGEXP);

		if (!matches) return [];
		const imageId = matches[1];

		const image = await Fetch.fetchImage(imageId);
		return image.tagNames.filter(tag => bannedTags.includes(tag));
	}

	const reverseImageResults = await Fetch.reverseImageSearch({
		key: config.derpi.apiKey,
		url: url,
		fuzziness: 0.2
	});

	for (const result of reverseImageResults.images) {
		const badTags = result.tagNames.filter(tag => bannedTags.includes(tag));
		if (badTags.length > 0) {
			return badTags;
		}
	}

	return [];
}

async function processMessage(msg: Discord.Message) {
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

		const badTags = await isImageSafe(url, bannedTags);

		if (badTags.length > 0 && msg.deletable) {
			console.log(`${msg.id} - Message is NOT clean. Removing...`);
			await msg.delete();

			const warnStr = `Your message ${msg.id} was removed for containing images with the following disallowed tag(s) on Derpibooru: \`${badTags.join(', ')}\``;
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
}

client.on('message', processMessage);
client.on('messageUpdate', async (oldMessage, newMessage) => {
	if (oldMessage.content === newMessage.content) return; // no changes that we care about

	return processMessage(newMessage);
});

client.login(config.discord.token)
	.catch(console.error);
