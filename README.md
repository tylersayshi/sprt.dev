# sprt.dev 🥌 ⚾ 🏀 🏈 🏒

This project aims to provide you with the upcoming games near your location without ever needing to leave your terminal.

## Usage Instructions

Run

```
curl https://sprt.dev
```

If you would like to search for a city or place other than your current location simply search for the city like this request for boston. Anything you type after the `/` will be searched for a location to find teams near.

![output for detroit sports schedule](/docs/detroit.png)

## Team Selection Strategy

For this app we are currently supporting the four major US professional sports: basketball, baseball, hockey, & football. When using your current location or a location that you have searched for we will show the schedule for the sports that are closest geographically to you and also currently have upcoming scheduled games (in-season sports). When there is a city that has multiple teams in the same sport, we go ahead and give you the schedule for both teams.

![output for los angeles sports schedule](/docs/default.png)

## Progress Plan / Ideas

I would like to build this application out to support more teams, sports, or general flexibility. All ideas are welcome as issues or Pull Requests!

## Dev Setup Instructions

1. [Install golang](https://go.dev/learn/)
2. Add `GOOGLE_API_KEY` as environment variable for [google maps api](https://developers.google.com/maps/documentation/javascript/get-api-key)
3. `cp example.db sprt-dev.db`
4. `go run .`
