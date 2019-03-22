# Derpi Image Flagger

[![Discord chat](https://img.shields.io/discord/275711953274404866.svg?logo=discord&color=7289DA&label=Discord%20chat)](https://discord.gg/AukVbRR)

> A Discord bot that flags Depribooru images which may contain Discord TOS-violating content

DIF is a Discord bot that attempts to help server moderators maintain Discord ToS compliance by flagging and removing MLP images which may violate Discord's community guidelines. This is achieved by reverse-searching the image on Derpibooru and filtering images which have been tagged with blacklisted tags. The bot **will not catch all images**, so this isn't a perfect solution, but it can be used in conjunction with regular moderation to help keep a server clean.

## Installation

```bash
$ git clone https://github.com/BytewaveMLP/derpi-image-flagger
$ cp config.example.json config.json
$ $EIDTOR config.json
```

## Configuration

- `discord.token` - Your Discord bot's authorization token ([get one here](https://discordapp.com/developers/applications/))
- `derpi.apiKey` - Your Derpibooru account's API key ([get this here](https://derpibooru.org/users/edit))
- `derpi.bannedTags` - Tags which you'd like to ban
	- `.sfw` - Tags you'd like to disallow from *just* SFW channels
	- `.nsfw` - Tags you'd like to disallow from *just* NSFW channels
	- `.both` - Tags you'd like to disallow from *both types* of channels

## Contribute

**Issues, suggestions, or concerns?** Submit a GitHub issue!

**Want to add a feature or fix a bug?** We accept PRs!

## Maintainers

- [BytewaveMLP](https://github.com/BytewaveMLP)

## License

Copyright (c) Eliot Partridge, 2019. Licensed under [the MIT license](/LICENSE).
