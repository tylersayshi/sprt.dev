# sprt.dev 🥌 ⚾ 🏀 🏈 🏒

This project aims to provide you with the upcoming games near your location without ever needing to leave your terminal.

## Usage Instructions

Run

```
curl sprt.dev
```

If you would like to search for a city or place other than your current location simply search for the city like this request for boston. Anything you type after the `/` will be searched for a location to find teams near.

```
Sport schedule: Detroit

┌──────────────────────┬─────────────────────┬──────────────────────┬──────────────────────┐
│         Team         │       Game 1        │        Game 2        │        Game 3        │
├──────────────────────┼─────────────────────┼──────────────────────┼──────────────────────┤
│ 🏈 Detroit Lions     │ DET @ HOU           │ JAX @ DET            │ DET @ IND            │
│                      │ 11/10 - 6:20 PM PST │ 11/17 - 11:00 AM PST │ 11/24 - 11:00 AM PST │
│                      │ NBC                 │ CBS                  │ FOX                  │
├──────────────────────┼─────────────────────┼──────────────────────┼──────────────────────┤
│ 🏒 Detroit Red Wings │ DET @ CHI           │ DET @ TOR            │ NYR @ DET            │
│                      │ 11/6 - 6:00 PM PST  │ 11/8 - 5:00 PM PST   │ 11/9 - 5:00 PM PST   │
│                      │ TNT                 │ Local Network        │ Local Network        │
├──────────────────────┼─────────────────────┼──────────────────────┼──────────────────────┤
│ 🏀 Detroit Pistons   │ LAL @ DET           │ DET @ CHA            │ ATL @ DET            │
│                      │ 11/4 - 5:30 PM PST  │ 11/6 - 5:00 PM PST   │ 11/8 - 5:00 PM PST   │
│                      │ Local Network       │ Local Network        │ Local Network        │
└──────────────────────┴─────────────────────┴──────────────────────┴──────────────────────┘
```

## Team Selection Strategy

For this app we are currently supporting the four major US professional sports: basketball, baseball, hockey, & football. When using your current location or a location that you have searched for we will show the schedule for the sports that are closest geographically to you and also currently have upcoming scheduled games (in-season sports). When there is a city that has multiple teams in the same sport, we go ahead and give you the schedule for both teams.

```
Sport schedule: Los Angeles

┌─────────────────────────┬─────────────────────┬──────────────────────┬─────────────────────┐
│          Team           │       Game 1        │        Game 2        │       Game 3        │
├─────────────────────────┼─────────────────────┼──────────────────────┼─────────────────────┤
│ 🏀 LA Clippers          │ SA @ LAC            │ PHI @ LAC            │ LAC @ SAC           │
│                         │ 11/4 - 8:30 PM PST  │ 11/6 - 8:00 PM PST   │ 11/8 - 8:00 PM PST  │
│                         │ Local Network       │ ESPN                 │ Local Network       │
├─────────────────────────┼─────────────────────┼──────────────────────┼─────────────────────┤
│ 🏀 Los Angeles Lakers   │ LAL @ DET           │ LAL @ MEM            │ PHI @ LAL           │
│                         │ 11/4 - 5:30 PM PST  │ 11/6 - 6:00 PM PST   │ 11/8 - 8:00 PM PST  │
│                         │ Local Network       │ Local Network        │ ESPN                │
├─────────────────────────┼─────────────────────┼──────────────────────┼─────────────────────┤
│ 🏈 Los Angeles Rams     │ MIA @ LAR           │ LAR @ NE             │ PHI @ LAR           │
│                         │ 11/11 - 6:15 PM PST │ 11/17 - 11:00 AM PST │ 11/24 - 6:20 PM PST │
│                         │ ESPN                │ FOX                  │ NBC                 │
├─────────────────────────┼─────────────────────┼──────────────────────┼─────────────────────┤
│ 🏈 Los Angeles Chargers │ TEN @ LAC           │ CIN @ LAC            │ BAL @ LAC           │
│                         │ 11/10 - 2:05 PM PST │ 11/17 - 2:25 PM PST  │ 11/25 - 6:15 PM PST │
│                         │ FOX                 │ CBS                  │ ESPN                │
├─────────────────────────┼─────────────────────┼──────────────────────┼─────────────────────┤
│ 🏒 Los Angeles Kings    │ LA @ NSH            │ LA @ MIN             │ VAN @ LA            │
│                         │ 11/4 - 6:00 PM PST  │ 11/5 - 6:00 PM PST   │ 11/7 - 8:30 PM PST  │
│                         │ Local Network       │ Local Network        │ Local Network       │
└─────────────────────────┴─────────────────────┴──────────────────────┴─────────────────────┘
```

## Progress Plan / Ideas

I would like to build this application out to support more teams, sports, or general flexibility. All ideas are welcome as issues or Pull Requests!

## Dev Setup Instructions

1. [Install golang](https://go.dev/learn/)
2. Add `GOOGLE_API_KEY` as environment variable for [google maps api](https://developers.google.com/maps/documentation/javascript/get-api-key)
3. `go run .`
