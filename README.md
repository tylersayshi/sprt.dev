# sprt.dev :basketball: :baseball: :ice_hockey: :football:

This project aims to provide you with the upcoming games in ~~your location~~ Boston without ever needing to leave your terminal. I am currently working on support for each of the other cities in the USA, so `sprt.dev` will be available in a city near you, very soon!

## Usage Instructions

Just run: `curl www.sprt.dev` or [click here](https://www.sprt.dev).

![docs/img/screenshot.png](curl www.sprt.dev)

I will be able to allow for the usage of just `sprt.dev` without the `www` in May when I can transfer the domain off of Google Domains. Unfortunately Google Domains does not allow ANAME records and that is the only way to configure Heroku custom domains without the `www`.

## Dev Setup Instructions

```
npm i -g yarn # if you do not already have yarn
yarn install
yarn dev # see package.json for other scripts
```
