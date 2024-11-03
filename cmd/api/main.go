package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/olekukonko/tablewriter"
)

// RateLimiter implements a simple rate limiting mechanism
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
	}
}

func (rl *RateLimiter) IsAllowed(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	hourAgo := now.Add(-time.Hour)

	// Clean old requests
	if times, exists := rl.requests[ip]; exists {
		var valid []time.Time
		for _, t := range times {
			if t.After(hourAgo) {
				valid = append(valid, t)
			}
		}
		rl.requests[ip] = valid
	}

	// Check rate limit
	if len(rl.requests[ip]) >= 50 {
		return false
	}

	// Add new request
	rl.requests[ip] = append(rl.requests[ip], now)
	return true
}

type Server struct {
	rateLimiter *RateLimiter
}

type GoogleHistory struct {
	Search string
	Result string
}

type Team struct {
	ID    int
	Sport string
	Lat   float64
	Lon   float64
	Name  string
	Abbr  string
	City  string
}

// ConnectDatabase sets up a connection to the SQLite database.
func ConnectDatabase(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}
	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

// GetGoogleHistory retrieves all entries from the `google_history` table.
func GetGoogleHistory(db *sql.DB, search string) ([]GoogleHistory, error) {
	rows, err := db.Query("SELECT result FROM google_history where search = ?", search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []GoogleHistory
	for rows.Next() {
		var item GoogleHistory
		if err := rows.Scan(&item.Search, &item.Result); err != nil {
			return nil, err
		}
		history = append(history, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return history, nil
}


func (s *Server) getIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Envoy-External-Address")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	return ip
}

func (s *Server) getLocale(r *http.Request) string {
	acceptLang := r.Header.Get("Accept-Language")
	if acceptLang == "" {
		return "en"
	}

	locale := strings.Split(acceptLang, ",")[0]
	matched, _ := regexp.MatchString(`^[A-Za-z]{2,4}([_-][A-Za-z]{4})?([_-]([A-Za-z]{2}|[0-9]{3}))?$`, locale)
	if !matched {
		return "en"
	}
	return locale
}

func (s *Server) isCurl(r *http.Request) bool {
	return strings.Contains(r.Header.Get("User-Agent"), "curl")
}

func (s *Server) handleRoot(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.rateLimiter.IsAllowed(s.getIP(r)) {
			http.Error(w, "Easy big Fella - Too Many Requests", http.StatusTooManyRequests)
			return
		}

		isCurl := s.isCurl(r)
		ip := s.getIP(r)
		locale := s.getLocale(r)

		cityGeo, err := getIpCity(ip)
		if err != nil {
			http.Error(w, "Failed to get city", http.StatusInternalServerError)
			return
		}

		city, err := getCitySportsFromGeo(db, cityGeo)
		if err != nil {
			http.Error(w, "Failed to get sports data", http.StatusInternalServerError)
			return
		}

		textResponse, err := getTextResponse(city, isCurl, locale)
		if err != nil {
			http.Error(w, "Failed to generate response", http.StatusInternalServerError)
			return
		}

		if isCurl {
			fmt.Fprint(w, textResponse)
			return
		}

		response := responseView(textResponse, city.Name)
		fmt.Fprint(w, response)
	}
}

func (s *Server) handleCity(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.rateLimiter.IsAllowed(s.getIP(r)) {
			http.Error(w, "Easy big Fella - Too Many Requests", http.StatusTooManyRequests)
			return
		}

		query := strings.TrimPrefix(r.URL.Path, "/")
		parsedQuery, err := url.QueryUnescape(query)
		if err != nil {
			http.Error(w, "Invalid query", http.StatusBadRequest)
			return
		}

		isCurl := s.isCurl(r)
		ip := s.getIP(r)
		locale := s.getLocale(r)

		cityGeo, err := getIpCity(ip)
		if err != nil {
			http.Error(w, "Failed to get city", http.StatusInternalServerError)
			return
		}

		var city CityResponse
		matched, _ := regexp.MatchString(`^[A-Za-z\s-_]+$`, parsedQuery)
		if !matched {
            // Note default city was removed
			http.Error(w, fmt.Sprintf("Invalid city: %s", parsedQuery), http.StatusBadRequest)
            return
		} else {
			log.Printf("Search for city: %s", parsedQuery)
			city, err = getCityBySearch(db, parsedQuery, cityGeo.Timezone)
			if err != nil {
				http.Error(w, "Failed to search city", http.StatusInternalServerError)
				return
			}
		}

		textResponse, err := getTextResponse(city, isCurl, locale)
		if err != nil {
			http.Error(w, "Failed to generate response", http.StatusInternalServerError)
			return
		}

		if isCurl {
			fmt.Fprint(w, textResponse)
			return
		}

		response := responseView(textResponse, city.Name)
		fmt.Fprint(w, response)
	}
}

func (s *Server) handleFavicon() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "public/images/favicon/favicon.ico")
	}
}

func main() {
	server := &Server{
		rateLimiter: NewRateLimiter(),
	}

    db, err := ConnectDatabase("database.db")
    if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Static files
	fs := http.FileServer(http.Dir("public"))
	http.Handle("/public/", http.StripPrefix("/public/", fs))

	// Routes
	http.HandleFunc("/favicon.ico", server.handleFavicon())
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			server.handleRoot(db)(w, r)
		} else {
			server.handleCity(db)(w, r)
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🦊 Server is running at http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// These types and functions would need to be implemented based on your actual utils
type CityTeam struct {
	Name     string
	Abbr     string
}

type CityResponse struct {
	Name     string
	Sports   map[Sport]*SportRow
	Timezone string
}

func getClosest(db *sql.DB, loc Geo, sport Sport) ([]Team, error) {
	query := `
SELECT 
        abbr, 
        name, 
        city
FROM teams 
WHERE sport = ?;
	`

	rows, err := db.Query(query, sport)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer rows.Close()

	teams := []Team{}
	for rows.Next() {
		var team Team
		if err := rows.Scan(&team.Abbr, &team.Name, &team.City); err != nil {
			return nil, fmt.Errorf("failed to scan row: %v", err)
		}
		teams = append(teams, team)
	}

	if len(teams) == 0 {
        log.Printf("No teams found for %s", sport)
		return nil, nil
	}

	// Filter teams that are within a distance of 25 units
	result := []Team{teams[0]}
	for i := 1; i < len(teams) && len(result) < 5; i++ {
        var dist = math.Sqrt(math.Pow(loc.Longitude - teams[i].Lon, 2) + math.Pow(loc.Latitude - teams[i].Lat, 2))
        if dist < 25 {
            result = append(result, teams[i])
        }
	}

	return result, nil
}

func getCitySportsFromGeo(db *sql.DB, cityGeo *Geo) (CityResponse, error) {
	if cityGeo == nil || cityGeo.City == "" {
		return CityResponse{
			Name: "Default City",
			Sports: make(map[Sport]*SportRow),
			Timezone: "Unknown",
		}, nil
	}

	name := fmt.Sprintf("%s, %s, %s", cityGeo.City, "RegionUnknown", "CountryUnknown")
	sports := make(map[Sport]*SportRow)

	// Example sports iteration (using NBA/NFL as a stub)
	sportTypes := []Sport{NBA, NFL, MLB, NHL}

	for _, sport := range sportTypes {
		closest, err := getClosest(db, *cityGeo, sport)
		if err != nil {
			log.Printf("Error finding closest %s team: %v", sport, err)
			// Optionally handle the error or continue
			continue
		}
		sports[sport] = &SportRow{
            Name: sport,
            Games: make([]string, len(closest)),
            Team: closest[0].Name,
        }
	}

	return CityResponse{
		Name:     name,
		Sports:   sports,
		Timezone: cityGeo.Timezone,
	}, nil
}

func getTextResponse(city CityResponse, isCurl bool, locale string) (string, error) {
	if len(city.Sports) == 0 {
		return "Error: Could not get any sports for schedule table, try again later.", nil
	}

	var responses [][]string

	for sport, sportRow := range city.Sports {
		if sportRow != nil && len(sportRow.Games) > 0 {
			line := []string{}
			emoji := emojiMap[sport]
			team := sportRow.Team
			if isCurl {
				line = append(line, fmt.Sprintf("%s %s", emoji, team))
			} else {
				line = append(line, sportRow.Team)
			}
			line = append(line, sportRow.Games...)
			responses = append(responses, line)
		}
	}

	if len(responses) == 0 {
		return "Error: Could not get any sports for schedule table, try again later.", nil
	}

	builder := &strings.Builder{}
	table := tablewriter.NewWriter(builder)
	table.SetHeader([]string{"Team", "Game 1", "Game 2", "Game 3"})
	table.AppendBulk(responses)
	table.Render()

	response := fmt.Sprintf("Sport schedule: %s\n\n%s\nSee this project @tylerlaws0n/sprt.dev on Github for more information\n", city.Name, builder.String())

	// Example of an HTTP request to track requests (similar to the TypeScript version)
	go func() {
		query := url.Values{
			"p": []string{"48924da0-e9a3-4784-9897-3e7f50ab08af"},
			"i": []string{"1"},
		}
		_, _ = http.Get(fmt.Sprintf("https://app.piratepx.com/ship?%s", query.Encode()))
	}()

	return response, nil
}

var emojiMap = map[Sport]string{
	NHL: "🏒",
	NBA: "🏀",
	MLB: "⚾",
	NFL: "🏈",
}

func responseView(text string, cityName string) string {
	return fmt.Sprintf(
		`<!DOCTYPE html>
<html lang="en">
<head>
	<title>Sports Schedule: %s</title>
	<link rel="stylesheet" href="/public/stylesheets/style.css" />
	<link rel="apple-touch-icon" sizes="76x76" href="/public/images/favicon/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/public/images/favicon/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/public/images/favicon/favicon-16x16.png" />
	<link rel="manifest" href="/public/images/favicon/site.webmanifest" />
	<link rel="shortcut icon" href="/public/images/favicon/favicon.ico" />
	<meta name="msapplication-TileColor" content="#da532c" />
	<meta name="msapplication-config" content="/public/images/favicon/browserconfig.xml" />
	<meta name="theme-color" content="#ffffff" />
	<script async defer src="https://buttons.github.io/buttons.js"></script>
	<link href="/public/stylesheets/font.css" rel="stylesheet" />
</head>
<body>
	<pre>%s</pre>
	<a class="github-button" href="https://github.com/tylerlaws0n/sprt.dev" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" data-show-count="true" aria-label="Star tylerlaws0n/sprt.dev on GitHub">
		Star
	</a>
</body>
</html>`, cityName, text)
}

func getCityBySearch(db *sql.DB, search string, timezone string) (CityResponse, error) {
    history, err := GetGoogleHistory(db, search)
    if err != nil {
        return CityResponse{}, fmt.Errorf("error getting google history: %v", err)
    }
    if len(history) > 0 {
        return CityResponse{
            Name: history[0].Result,
            Sports: make(map[Sport]*SportRow),
            Timezone: timezone,
        }, nil
    }

	var geo *Geo
	resp, err := fetchData(fmt.Sprintf(
		"https://maps.googleapis.com/maps/api/geocode/json?address=%s&components=short_name:CA|short_name:US&region=us&key=%s",
		url.QueryEscape(search), os.Getenv("GOOGLE_API_KEY"),
	))
	if err != nil {
		return CityResponse{}, fmt.Errorf("error fetching data from Google: %v", err)
	}
	defer resp.Body.Close()

	var googRes struct {
		Results []struct {
			FormattedAddress  string `json:"formatted_address"`
			AddressComponents []struct {
				LongName string   `json:"long_name"`
				Types    []string `json:"types"`
			} `json:"address_components"`
			Geometry struct {
				Location struct {
					Lat float64 `json:"lat"`
					Lng float64 `json:"lng"`
				} `json:"location"`
			} `json:"geometry"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&googRes); err != nil {
		return CityResponse{}, fmt.Errorf("error decoding JSON response: %v", err)
	}

	if len(googRes.Results) == 0 {
		return CityResponse{}, fmt.Errorf("no results found for: %s", search)
	}

	res := googRes.Results[0]
	cityName := ""
	for _, comp := range res.AddressComponents {
		if contains(comp.Types, "locality") {
			cityName = comp.LongName
			break
		}
	}

	geo = &Geo{
		City:     cityName,
		Latitude: res.Geometry.Location.Lat,
		Longitude: res.Geometry.Location.Lng,
		Timezone:  timezone,
	}

	sports, err := getCitySportsFromGeo(db, geo)
	if err != nil {
		return CityResponse{}, fmt.Errorf("error getting city sports from geo: %v", err)
	}

	return CityResponse{
		Name:     res.FormattedAddress,
		Sports:   sports.Sports,
		Timezone: timezone,
	}, nil
}

// Helper to check if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Sport and League types
type Sport string

const (
	NFL     Sport = "football"
	NBA     Sport = "basketball"
	MLB     Sport = "baseball"
	NHL     Sport = "hockey"
	DEFAULT Sport = ""
)

var sportsLeagueMap = map[Sport]string{
	NFL: "nfl",
	NBA: "nba",
	MLB: "mlb",
	NHL: "nhl",
}

// ESPN API types
type ScheduleResponse struct {
	Events []Event `json:"events"`
}

type Event struct {
	ShortName    string        `json:"shortName"`
	Competitions []Competition `json:"competitions"`
}

type Competition struct {
	Status     Status      `json:"status"`
	Broadcasts []Broadcast `json:"broadcasts"`
}

type Status struct {
	Type StatusType `json:"type"`
}

type StatusType struct {
	Name        string `json:"name"`
	ShortDetail string `json:"shortDetail"`
}

type Broadcast struct {
	Type   BroadcastType   `json:"type"`
	Market BroadcastMarket `json:"market"`
	Media  BroadcastMedia  `json:"media"`
}

type BroadcastType struct {
	ShortName string `json:"shortName"`
}

type BroadcastMarket struct {
	Type string `json:"type"`
}

type BroadcastMedia struct {
	ShortName string `json:"shortName"`
}

// GeoIP types
type GeoSearchResponse struct {
	Status string    `json:"status"`
	Data   *GeoData `json:"data"`
}

type GeoData struct {
	Geo Geo `json:"geo"`
}

type Geo struct {
	City      string  `json:"city"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timezone  string  `json:"timezone"`
}

// SportRow represents a row of sports data
type SportRow struct {
	Name  Sport    `json:"name"`
	Games []string `json:"games"`
	Team  string   `json:"team"`
}

// Helper functions

func fetchData(url string, headers ...map[string]string) (*http.Response, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	if len(headers) > 0 {
		for key, value := range headers[0] {
			req.Header.Set(key, value)
		}
	}

	return client.Do(req)
}

func getIpCity(ip string) (*Geo, error) {
	ipAddress := ip

	if ipAddress == "127.0.0.1" || strings.Contains(ipAddress, "::1") || ipAddress == "" {
		// Get public IP for local development
		resp, err := fetchData("https://api64.ipify.org?format=json")
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		var ipResponse struct {
			IP string `json:"ip"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&ipResponse); err != nil {
			return nil, err
		}
		ipAddress = ipResponse.IP
	}

	// Get geo data
	resp, err := fetchData(
		"https://tools.keycdn.com/geo.json?host="+ipAddress,
		map[string]string{"User-Agent": "keycdn-tools:https://sprt.dev"},
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var geoResponse GeoSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&geoResponse); err != nil {
		return nil, err
	}

	if geoResponse.Status == "error" || geoResponse.Data == nil {
		return nil, fmt.Errorf("geo lookup failed")
	}

	log.Printf("ip: %s, city: %s", ipAddress, geoResponse.Data.Geo.City)
	return &geoResponse.Data.Geo, nil
}

func scheduleURL(sport Sport, team string) string {
	return fmt.Sprintf("https://site.api.espn.com/apis/site/v2/sports/%s/%s/teams/%s/schedule",
		sport, sportsLeagueMap[sport], team)
}

func getESPN(sport Sport, teamName, fullName, timezone, locale string) (*SportRow, error) {
	resp, err := fetchData(scheduleURL(sport, teamName))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var schedule ScheduleResponse
	if err := json.NewDecoder(resp.Body).Decode(&schedule); err != nil {
		return nil, err
	}

	// Find first non-final game
	startIndex := -1
	for i, event := range schedule.Events {
		statusName := event.Competitions[0].Status.Type.Name
		if statusName != "STATUS_FINAL" && statusName != "STATUS_POSTPONED" {
			startIndex = i
			break
		}
	}

	if startIndex == -1 {
		return nil, nil
	}

	// Get next 3 games
	endIndex := startIndex + 3
	if endIndex > len(schedule.Events) {
		endIndex = len(schedule.Events)
	}
	gameRows := schedule.Events[startIndex:endIndex]

	parsedRows := make([]string, 0, 3)
	for _, game := range gameRows {
		title := game.ShortName
		competition := game.Competitions[0]
		status := competition.Status.Type.ShortDetail

		// Parse and format time if it's a future game
		if strings.Contains(status, "AM") || strings.Contains(status, "PM") {
			// You'll need to implement time parsing similar to the TypeScript version
			// This is a simplified version
			status = formatGameTime(status, timezone, locale)
		}

		// Find broadcast
		broadcast := "Local Network"
		for _, broad := range competition.Broadcasts {
			if strings.ToLower(broad.Type.ShortName) == "tv" {
				if strings.ToLower(broad.Market.Type) == "national" {
					broadcast = broad.Media.ShortName
					break
				}
			}
		}

		gameInfo := fmt.Sprintf("%s\n%s\n%s", title, status, broadcast)
		parsedRows = append(parsedRows, gameInfo)
	}

	// Fill remaining slots with spaces
	for len(parsedRows) < 3 {
		parsedRows = append(parsedRows, " ")
	}

	return &SportRow{
		Name:  sport,
		Games: parsedRows,
		Team:  fullName,
	}, nil
}

func formatGameTime(timeStr, timezone, locale string) string {
	// Parse the input time string (e.g., "12/25 - 7:30 PM EDT")
	parts := strings.Split(timeStr, " - ")
	if len(parts) != 2 {
		return timeStr
	}

	date := parts[0]
	timePart := parts[1]

	// Parse date
	dateParts := strings.Split(date, "/")
	if len(dateParts) != 2 {
		return timeStr
	}
	month := dateParts[0]
	day := dateParts[1]

	// Parse time
	timeParts := strings.Split(timePart, " ")
	if len(timeParts) != 3 {
		return timeStr
	}
	timeComponent := timeParts[0]
	ampm := timeParts[1]
	sourceTimezone := timeParts[2]

	// Load time zones
	var sourceLocation *time.Location
	if sourceTimezone == "EDT" {
		sourceLocation = mustLoadLocation("America/New_York")
	} else {
		sourceLocation = mustLoadLocation("America/Chicago") // EST/CST
	}

	targetLocation := mustLoadLocation(timezone)

	// Parse the time
	now := time.Now()
	timeStr = fmt.Sprintf("%d-%s-%s %s %s",
		now.Year(), month, day, timeComponent, ampm)
	
	t, err := time.ParseInLocation("2006-1-2 3:04 PM", timeStr, sourceLocation)
	if err != nil {
		return timeStr
	}

	// Convert to target timezone
	t = t.In(targetLocation)

	// Format according to locale
	if strings.HasPrefix(locale, "en") {
		return t.Format("1/2 - 3:04 PM MST")
	}
	
	// For other locales, use day/month format
	return t.Format("2/1 - 3:04 PM MST")
}

func mustLoadLocation(timezone string) *time.Location {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.UTC
	}
	return loc
}
