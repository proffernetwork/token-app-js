# Modified Token App Template

This repo helps you build a [Token app](https://www.tokenbrowser.com) in Javascript. It modifies the app template provided by the tokenbrowser team by adding support for sending base64 image data as an attachment, and for doing server-side image rendering in the bot application code using node-canvas.

The bot built on this template will be able to:

* send messages as text or image (either by local file url inside the "attachments" folder or a base64 data uri)
* send and request money
* create simple UI for buttons and menus
* create server-side images and get a base64 data uri for them
* store sessions and state for each user

## Launch a Heroku app using this template

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/proffernetwork/token-app-template)

## Run app locally with Docker

You can run the project locally with

```
docker-compose up
```

If any new depencies are added you can rebuild the project with

```
docker-compose build
```

To reset the postgres database in your dev environment you can use

```
docker-compose down -v
```

## Example: create server-side image and send to Token Bot

```
var Canvas = require('canvas')
  , Image = Canvas.Image
  , canvas = new Canvas(200, 200)
  , ctx = canvas.getContext('2d');

ctx.font = '30px Impact';
ctx.fillText("Hi Proffer, Hi Token!", 50, 100);

var te = ctx.measureText('Awesome!');
ctx.strokeStyle = 'rgba(0,0,0,0.5)';
ctx.beginPath();
ctx.lineTo(50, 102);
ctx.lineTo(50 + te.width, 102);
ctx.stroke();

// and then in bot.js, use the built-in sendImageMessage function
// except no need to pass in the url of a file in the 'attachments' folder
sendImageMessage(session, canvas.toDataURL(), controls)
```

## See also

* [https://www.tokenbrowser.com]
