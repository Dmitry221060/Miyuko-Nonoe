<img src="https://i.imgur.com/CEsh2ow.jpg" width="150" height="150" align="left" style="float: left; margin: 0 10px 0 0;" alt="Miyuko"><br />
# Miyuko Nonoe
Miyuko is a Discord bot coded in JavaScript and [discord.js](https://github.com/discordjs/discord.js).

## Installing
1. Make sure you have installed [Node.js](https://nodejs.org/ru/) (you will need **at least v13.0.0**) and [Git](https://git-scm.com/).
2. Clone this repository with `git clone https://github.com/Dmitry221060/Miyuko-Nonoe.git`.
3. Run `cd Miyuko-Nonoe` to move into the folder that you just created.
4. Open an **ADMIN POWERSHELL** window and run `npm i -g windows-build-tools`.
5. [Follow these instructions to install the dependencies for `node-canvas`](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows).
6. [Follow these instructions to install ffmpeg](https://www.wikihow.com/Install-FFmpeg-on-Windows).
7. Run `npm i` in the folder you cloned the bot.

## Configure
1. Open `config.json` and fill in the following values:
* `bot`
    * `token` - Discord access token for your bot.
    * `serverID` - Identifier of the server you want the bot to run on.
    * `loggedChannels` - List of channels ID that will be logged for `imitate` and `acronym` commands.
    * `voiceChannels` - List of **voice** channels ID to which the bot can connect. **Not** the ID of text channels attached to voice channels.
    * `maxShortcutSize` - Maximum number of videos in the shortcut.
    * `AFKRoleID` - ID of the role, which will be automatically given to users who have not been active for 2 weeks. Set it to `null` if you do not need this functionality.
* `express.port` - The port to which you can connect to access the GUI.
* `mongodb`
    * `url` - The url to setup MongoDB connection.
    * `dbName` - The database name.
* `logger.debug` - Enable debug mode, which outputs **almost everything** to the console.
* `dropbox.token` - The Dropbox access token that will be used to upload the logs.
2. By default, all commands will be available in all channels for all users (except for the Service group, which is not accessible). You can configure access for each command separately. To do so:
    1. Open `src/commands/commandName.js`.
    2. Insert `allowedChannels: ["ID1", "ID2", "ID3..."],` with a list of allowed channels ID, after the `description` line. Now this command will only work in these channels. 
    3. If you want to allow access only for specific users, insert `allowedUsers: ["userID", "userID2", "userID3..."],` with the list of allowed users ID, after the line `description` or `allowedChannels` if you specified the last one.

## Launching
Once you are sure that you have configured the bot, you can run it using `node index.js` in the project directory. That's it!
<br />
<br />
<br />
If you need some help, you can add me in Discord (`Dmitry221060#3928`) or write an email.
