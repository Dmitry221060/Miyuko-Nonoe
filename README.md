# DiscordBot
This project is a bot, developed by me for the [DS & HK server](https://discordapp.com/invite/sneu4V). If you want to use this project, you must do a few things. 
<br />**Note: To use 100% of the project features, you need to have a user and a bot accounts**

## Download all dependencies
npm i discord.js express express-fileupload body-parser mongodb winston jsdom require-all images dropbox

## Configure
Open the config.json and fill empty fields:

1. logger.path - Absolute path to the main directory (ex. "C:\Projects\DiscordBot")
2. token - The token of your account. You can also use the bot token, but you'll lose some features.
3. botToken - The token of your bot. If in the previous step you used a bot token, duplicate it here.
4. ownerIP - IPv4 address of the PC for remote control of the bot. If you don't need remote control, put here "::1" ![How to find](https://www.groovypost.com/wp-content/uploads/2009/10/image_417.png)
5. dropboxToken - The Dropbox token for logs upload. [How to get](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/)

## Database
1. [Download](https://www.mongodb.com/download-center#community) and install MongoDB.
2. Assemble the database. You can find the architecture in "modules/database.js".
OR
1. [Download](----Coming_soon----) MongoDB with the assembled database, BUT many users must be added manually.

## Usage
1. Launch "runDB" at "pathToMongo/bin/runDB.bat" (If you filled out the database yourself, you can download it [here](https://www.dropbox.com/s/w5gofcpcw024qn6/runDB.bat?dl=0))
2. Launch "run" at "pathToThisProject/run.bat"


Done! Until you close the console windows, the bot will be online. If you need some help, add me in Discord - Dmitry221060#8728
