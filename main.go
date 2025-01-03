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
	"slices"
	"strings"
	"time"

	"github.com/aquasecurity/table"
	_ "modernc.org/sqlite"
)

type Server struct {
}

type GoogleHistory struct {
	Search string
	City   string
	Lat    float64
	Lon    float64
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

type TeamWithDistance struct {
	ID       int
	Sport    string
	Lat      float64
	Lon      float64
	Name     string
	Abbr     string
	City     string
	Distance float64
}

// ConnectDatabase sets up a connection to the SQLite database.
func ConnectDatabase(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
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
	rows, err := db.Query("SELECT city, lat, lon FROM google_history where search = ?", search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []GoogleHistory
	for rows.Next() {
		var item GoogleHistory
		if err := rows.Scan(&item.City, &item.Lat, &item.Lon); err != nil {
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
		isCurl := s.isCurl(r)
		ip := s.getIP(r)
		if ip != "" && !strings.Contains(ip, "::1") {
			ip = strings.Split(ip, ":")[0]
		}
		insertRequestAsync(db, nil)

		cityGeo, err := getIpCity(ip)
		if err != nil {
			log.Printf("Failed to get city: %v", err)
			http.Error(w, "Failed to get city", http.StatusInternalServerError)
			return
		}

		locale := s.getLocale(r)

		city, err := getCitySportsFromGeo(db, cityGeo, locale)
		if err != nil {
			http.Error(w, "Failed to get sports data", http.StatusInternalServerError)
			return
		}

		textResponse, err := getTextResponse(city, isCurl)
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

func insertRequestAsync(db *sql.DB, query *string) {
	go func() {
		_, err := db.Exec("INSERT INTO requests (search) VALUES (?)", query)
		if err != nil {
			log.Printf("Error inserting into requests: %v", err)
		}
	}()
}

func (s *Server) handleCity(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := strings.TrimPrefix(r.URL.Path, "/")
		parsedQuery, err := url.QueryUnescape(query)
		if err != nil {
			http.Error(w, "Invalid query", http.StatusBadRequest)
			return
		}

		insertRequestAsync(db, &parsedQuery)

		isCurl := s.isCurl(r)
		ip := s.getIP(r)
		locale := s.getLocale(r)

		if ip != "" && !strings.Contains(ip, "::1") {
			ip = strings.Split(ip, ":")[0]
		}

		// used for timezone
		cityGeo, err := getIpCity(ip)
		if err != nil {
			log.Printf("Failed to get city: %v", err)
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
			city, err = getCityBySearch(db, parsedQuery, cityGeo.Timezone, locale)
			if err != nil {
				http.Error(w, "Failed to search city", http.StatusInternalServerError)
				return
			}
		}

		textResponse, err := getTextResponse(city, isCurl)
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
	server := &Server{}

	dbFile := os.Getenv("DB_FILE")
	if dbFile == "" {
		dbFile = "sprt-dev.db"
	}

	db, err := ConnectDatabase(dbFile)
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

	log.Printf("🥌 Server is running at http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// These types and functions would need to be implemented based on your actual utils
type CityTeam struct {
	Name string
	Abbr string
}

type CityResponse struct {
	Name     string
	Sports   map[Sport][]*SportRow
	Timezone string
}

const EarthRadiusKm = 6371.0 // Radius of the Earth in kilometers

// haversine calculates the distance between two points specified by latitude and longitude
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	// Convert latitude and longitude from degrees to radians
	lat1Rad := lat1 * math.Pi / 180
	lon1Rad := lon1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	lon2Rad := lon2 * math.Pi / 180

	// Calculate the differences
	dLat := lat2Rad - lat1Rad
	dLon := lon2Rad - lon1Rad

	// Apply the Haversine formula
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	// Distance in kilometers
	distance := EarthRadiusKm * c
	return distance
}

func getClosest(db *sql.DB, loc Geo, sport Sport) ([]TeamWithDistance, error) {
	query := `
SELECT 
        abbr, 
        name, 
        city,
								lat,
								lon
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
		if err := rows.Scan(&team.Abbr, &team.Name, &team.City, &team.Lat, &team.Lon); err != nil {
			return nil, fmt.Errorf("failed to scan row: %v", err)
		}
		teams = append(teams, team)
	}

	if len(teams) == 0 {
		log.Printf("No teams found for %s", sport)
		return nil, nil
	}

	result := []TeamWithDistance{}
	for i := 0; i < len(teams); i++ {
		var dist = haversine(loc.Latitude, loc.Longitude, teams[i].Lat, teams[i].Lon)

		result = append(result, TeamWithDistance{
			ID:       teams[i].ID,
			Sport:    teams[i].Sport,
			Lat:      teams[i].Lat,
			Lon:      teams[i].Lon,
			Name:     teams[i].Name,
			Abbr:     teams[i].Abbr,
			City:     teams[i].City,
			Distance: dist,
		})
	}

	// sort by distance
	slices.SortFunc(result, func(a, b TeamWithDistance) int {
		if a.Distance < b.Distance {
			return -1
		} else if a.Distance > b.Distance {
			return 1
		}
		return 0
	})

	finalResult := []TeamWithDistance{}
	for i := 0; i < 5; i++ {
		if (result[i].Distance - result[0].Distance) < 25 {
			finalResult = append(finalResult, result[i])
		}
	}

	return finalResult, nil
}

func getCitySportsFromGeo(db *sql.DB, cityGeo *Geo, locale string) (CityResponse, error) {
	if cityGeo == nil || cityGeo.City == "" {
		return CityResponse{
			Name:     "Default City",
			Sports:   make(map[Sport][]*SportRow),
			Timezone: "Unknown",
		}, nil
	}

	name := fmt.Sprintf("%s, %s, %s", cityGeo.City, cityGeo.RegionCode, cityGeo.CountryCode)
	sports := make(map[Sport][]*SportRow)

	// Example sports iteration (using NBA/NFL as a stub)
	sportTypes := []Sport{NBA, NFL, MLB, NHL}

	for _, sport := range sportTypes {
		closest, err := getClosest(db, *cityGeo, sport)
		if err != nil || len(closest) == 0 {
			continue
		}

		for _, team := range closest {
			// Fetch ESPN schedule for the closest team
			sportRow, err := getESPN(sport, team.Abbr, team.Name, cityGeo.Timezone, locale)
			if err != nil {
				log.Printf("Failed to fetch ESPN data for %s: %v", team.Name, err)
				// Handle the error or continue
				continue
			}

			// Only add if sportRow contains game data
			if sportRow != nil {
				if sports[sport] == nil {
					sports[sport] = []*SportRow{sportRow}
				} else {
					sports[sport] = append(sports[sport], sportRow)
				}
			}
		}
	}

	return CityResponse{
		Name:     name,
		Sports:   sports,
		Timezone: cityGeo.Timezone,
	}, nil
}

func getTextResponse(city CityResponse, isCurl bool) (string, error) {
	if len(city.Sports) == 0 {
		return "Error: Could not get any sports for schedule table, try again later.", nil
	}

	var responses [][]string

	for sport, sportRows := range city.Sports {
		for _, sportRow := range sportRows {
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
	}

	if len(responses) == 0 {
		return "Error: Could not get any sports for schedule table, try again later.", nil
	}

	builder := &strings.Builder{}
	t := table.New(builder)
	t.SetHeaders("Team", "Last Game", "Next Game", "Another Game")
	for _, response := range responses {
		t.AddRow(response...)
	}
	t.Render()

	response := fmt.Sprintf("Sport schedule: %s\n\n%s\nFor more info: https://github.com/tylersayshi/sprt.dev\n", city.Name, builder.String())

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
	<script async defer src="https://buttons.github.io/buttons.js"></script>
	<style>
	@media (prefers-color-scheme: dark) {
		body {
			background: #000;
			color: #bbb;
		}
	}
		</style>
</head>
<body>
	<pre>%s</pre>
	<a class="github-button" href="https://github.com/tylersayshi/sprt.dev" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" data-show-count="true" aria-label="Star tylersayshi/sprt.dev on GitHub">
		Star
	</a>
</body>
</html>`, cityName, text)
}

func getCityBySearch(db *sql.DB, search string, timezone string, locale string) (CityResponse, error) {
	history, err := GetGoogleHistory(db, search)
	if err != nil {
		fmt.Printf("Error getting google history: %v", err)
		return CityResponse{}, fmt.Errorf("error getting google history: %v", err)
	}
	var geo *Geo
	if len(history) > 0 {
		log.Printf("Found city in database: %s", history[0].City)
		geo = &Geo{
			City:      history[0].City,
			Latitude:  history[0].Lat,
			Longitude: history[0].Lon,
			Timezone:  timezone,
		}
	} else {
		log.Printf("No city found in database, searching for city: %s", search)
	}

	if geo == nil {
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
		cityName := res.FormattedAddress

		geo = &Geo{
			City:      cityName,
			Latitude:  res.Geometry.Location.Lat,
			Longitude: res.Geometry.Location.Lng,
			Timezone:  timezone,
		}

		// Save to database
		_, err = db.Exec("INSERT INTO google_history (search, city, lat, lon) VALUES (?, ?, ?, ?)", search, geo.City, geo.Latitude, geo.Longitude)
		if err != nil {
			return CityResponse{}, fmt.Errorf("error saving city to database: %v", err)
		} else {
			log.Printf("Saved city to database: %s", geo.City)
		}
	}

	sports, err := getCitySportsFromGeo(db, geo, locale)
	if err != nil {
		return CityResponse{}, fmt.Errorf("error getting city sports from geo: %v", err)
	}

	return CityResponse{
		Name:     geo.City,
		Sports:   sports.Sports,
		Timezone: timezone,
	}, nil
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
	Status      Status       `json:"status"`
	Broadcasts  []Broadcast  `json:"broadcasts"`
	Competitors []Competitor `json:"competitors"`
}

type Competitor struct {
	Score Score `json:"score"`
}

type Score struct {
	DisplayValue string `json:"displayValue"`
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
	Status string   `json:"status"`
	Data   *GeoData `json:"data"`
}

type GeoData struct {
	Geo Geo `json:"geo"`
}

type Geo struct {
	City        string  `json:"city"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Timezone    string  `json:"timezone"`
	Host        string  `json:"host"`
	IP          string  `json:"ip"`
	CountryName string  `json:"country_name"`
	CountryCode string  `json:"country_code"`
	RegionCode  string  `json:"region_code"`
	PostalCode  string  `json:"postal_code"`
	DateTime    string  `json:"datetime"`
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

	startIndex = startIndex - 1

	if startIndex < 0 {
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
		if status == "Final" {
			// assume home is index 0
			broadcast = fmt.Sprintf("%s - %s", competition.Competitors[1].Score.DisplayValue, competition.Competitors[0].Score.DisplayValue)
		} else {
			for _, broad := range competition.Broadcasts {
				if strings.ToLower(broad.Type.ShortName) == "tv" {
					if strings.ToLower(broad.Market.Type) == "national" {
						broadcast = broad.Media.ShortName
						break
					}
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
