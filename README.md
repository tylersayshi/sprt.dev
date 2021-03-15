# sprt.dev :basketball: :baseball: :ice_hockey: :football:

This project aims to provide you with the upcoming games near your location without ever needing to leave your terminal.

## Usage Instructions

Run

```
curl www.sprt.dev
```

[Or visit the site here](https://sprt.dev)

If you would like to search for a city or place other than your current location simply search for the city like this request for boston. Anything you type after the `/` will be searched for a location to find teams near.

![curl www.sprt.dev](docs/img/screenshot.png)

## Team Selection Strategy

## Note on Domain

I will be able to allow for the usage of just `sprt.dev` without the `www` in May when I can transfer the domain off of Google Domains. Unfortunately Google Domains does not allow ANAME records and that is the only way to configure Heroku custom domains without the `www`.

## Dev Setup Instructions

```
npm i -g yarn # if you do not already have yarn
yarn install
yarn dev # see package.json for other scripts
```
