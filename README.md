# Derpi Image Flagger

> A Discord bot that flags Depribooru images which may contain Discord TOS-violating content

DIF is a Discord bot that attempts to help server moderators maintain Discord ToS compliance by flagging and removig MLP images which may violate Discord's community guidelines. It achieves this by reverse-searching the image on Derpibooru and filtering images which have been tagged with blacklisted tags. It **will not catch all images**, aand is not a solves-all solution, but can be used in conjunction with regular moderation to help keep a server clean.

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

Copyright (c) 2019, Eliot Partridge. Licensed under [the MIT license](/LICENSE).