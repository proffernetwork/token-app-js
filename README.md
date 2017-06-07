# Modified Token App Template

This repo helps you build a [Token app](https://www.tokenbrowser.com) in Javascript. It modifies the app template provided by the tokenbrowser team by adding support for sending base64 image data as an attachment, and for doing server-side image rendering in the bot application code using node-canvas.

The bot built on this template will be able to:

* send messages as text or image (either by local file url inside the "attachments" folder or a base64 data uri)
* send and request money
* create simple UI for buttons and menus
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

## See also

* [https://www.tokenbrowser.com]
