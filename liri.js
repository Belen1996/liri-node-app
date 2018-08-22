require("dotenv").config();
var moment = require("moment");
var request = require("request");
var Spotify = require("node-spotify-api");
var fs = require("fs");

var keys = require("./keys.js");
var spotify = new Spotify(keys.spotify);

const usage = "Expected usage: node liri.js <command> [command argument]\n\n" +
              "Commands:\n\n" +
              "* concert-this <artist/band name here>: Will search Bands in Town Artist Events\n\n" +
              "* spotify-this-song [<song name here>]: Will search song information from Spotify or will default to 'The Sign' by Ace of Base\n\n" +
              "* movie-this <movie name here>: Will search for movie information from OMDB\n\n" +
              "* do-what-it-says: Will read the contents of random.txt file and interpret it as LIRI command.\n";


function validateArguments(arguments) {
    if(arguments && arguments.length > 2) {
        let command = arguments[2];
        if(command === 'concert-this' && process.argv.length === 4) {
            return true;
        } else if(command === 'spotify-this-song' && (process.argv.length === 3 || process.argv.length === 4)) {
            return true;
        } else if(command === 'movie-this' && (process.argv.length === 3 || process.argv.length === 4)) {
            return true;
        } else if(command === 'do-what-it-says' && process.argv.length === 3) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

if(validateArguments(process.argv)) {
    let command = process.argv[2];
    var argument;
    if(process.argv.length === 4) {
        argument = process.argv[3];
    } else {
        argument = null;
    }
    processCommand(command, argument);
} else {
    console.error("Invalid arguments");
    console.error(usage);
}

function processCommand(command, argument) {
    if(command === 'concert-this') {
        processConcertThis(argument);
    } else if(command === 'spotify-this-song') {
        var song;
        if(argument == null) {
            song = "The Sign";
        } else {
            song = argument;
        }
        processSpotifyThisSong(song); 
    } else if(command === 'movie-this') {
        var movie;
        if(argument == null) {
            movie = "Mr. Nobody";
        } else {
            movie = argument;
        }
        processMovieThis(movie);
    } else if(command === 'do-what-it-says') {
        processDoWhatItSays();
    } else {
        console.error("Invalid arguments");
        console.error(usage);    
    }
}

function processDoWhatItSays() {
    fs.readFile("./random.txt", "utf-8", function(error, data) {
        if(error) {
            console.error(error);
        } else {
            if(data === "") {
                console.error("Empty random.txt file. No command found to execute");
                console.error(usage);
            } else {
                let words = data.split(" ");
                if(words.length < 1) {
                    console.error("Empty random.txt file. No command found to execute");
                    console.error(usage);
                } else {
                    let command = words[0];
                    var argument;
                    if(words.length > 1) {
                        argument = words.slice(1).join(" ");
                    } else {
                        argument = null;
                    }
                    if(command !== 'do-what-it-says') {
                        processCommand(command, argument);
                    } else {
                        console.error("Tried calling do-what-it-says infinitely");
                    }
                }
            }
        }
    });
}

function processMovieThis(movie) {
    let movie_request = "http://www.omdbapi.com/?t=" + movie + "&apikey=706d5031";

    request(movie_request, function(error, response, body) {
        if(response && response.statusCode == "200") {
            let json_body = JSON.parse(body);
            printInformation(extractMovieInformation(json_body));
        } else {
            console.error(error);
        }
    });
}

function processSpotifyThisSong(song) {
    spotify.search({ type: 'track', query: song }, function(error, data) {
        if (error) {
            console.error(error);
        } else {
            var track;
            if(data.tracks.items.length === 1) {
                track = data.tracks.items[0];
            } else {
                track = data.tracks.items.reduce(function(prev, current) {
                    if(prev.popularity > current.popularity) {
                        return prev;
                    } else {
                        return current;
                    }
                });    
            }

            let artist = track.artists[0].name;
            let song_name = track.name;
            let preview_link = track.preview_url;
            let album = track.album.name;

            console.info("Artist: " + artist + ", Song name: " + song_name + ", Preview link: " + preview_link + ", Album: " + album );
        }
      });
}

function processConcertThis(artist) {
    let band_information_request = "https://rest.bandsintown.com/artists/" + artist + "/events?app_id=codingbootcamp";

    request(band_information_request, function(error, response, body) {
        if(response && response.statusCode == "200") {
            let json_body = JSON.parse(body);
            json_body.map(extractVenueInformation).forEach(printInformation);
        } else {
            console.error(error);
        }
    });
}

function printInformation(venue_item) {
    console.info(venue_item + "\n");
}

function extractMovieInformation(movie) {
    if(movie) {
        let movie_title = movie.Title;
        let movie_year = movie.Year;
        let movie_rating = movie.imdbRating;
        let rotten_tomatoes_rating = movie.Ratings.find(i => i.Source === "Rotten Tomatoes").Value;
        let movie_country = movie.Country;
        let movie_language = movie.Language;
        let movie_plot = movie.Plot;
        let movie_actors = movie.Actors;
        return "Title: " + movie_title + 
               ", Year: " + movie_year + 
               ", IMDB Rating: " + movie_rating +
               ", Rotten Tomatoes Rating: " + rotten_tomatoes_rating + 
               ", Produced in: " + movie_country + 
               ", Language: " + movie_language + 
               ", Plot: " + movie_plot + 
               ", Actors: " + movie_actors;
    } else {
        return "";
    }
}

function extractVenueInformation(venue_item) {
    if(venue_item) {
        let venue = venue_item.venue;
        let venue_name = venue.name;
        let venue_location = venue.city + ', ' + venue.region + ', ' + venue.country;
        let venue_datetime = moment(venue_item.datetime, 'YYYY-MM-DDTHH:mm:ss').format('MM/DD/YYYY');
        return "Name of venue: " + venue_name + ", Location: " + venue_location + ", Date of Event: " + venue_datetime;
    } else {
        return "";
    }
}

