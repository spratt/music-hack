/*
 * http://ampache.org/wiki/dev:xmlapi
 */

var AMPACHE_URL     = 'http://localhost/~spratt/ampache/server/xml.server.php';
var AMPACHE_VERSION = '350001';
var LOGIN_TOKEN = null;
var PING_ID = null;
var PING_INTERVAL = 5000;

var PLAYLIST = [];

function parseXMLTag(xmldata,tag) {
    try {
	var xml_auth = xmldata.getElementsByTagName(tag)[0];
	if(xml_auth == undefined) return null;
	return xml_auth.textContent;
    } catch (error) {
	return null;
    }
}

// Returns null if no auth token
function parseAuthToken(xmldata) {
    return parseXMLTag(xmldata,'auth');
}

// Returns null if login failed
function getAuthToken(user,pass,url) {
    if(url != undefined) AMPACHE_URL = url;
    var time = new Date().getTime();
    
    var key = SHA256_hash(pass);
    var phrase = SHA256_hash(time + '' + key);

    var authToken = null;

    $.ajax({'url':      AMPACHE_URL,
	    'async':    true,
	    'type':     'GET',
	    'timeout':  2000,   // don't wait for more than 2 seconds
	    'data':     {'action':    'handshake',
			 'auth':      phrase,
			 'timestamp': time,
			 'version':   AMPACHE_VERSION,
			 'user':      user},
	    'dataType': 'xml',
	    'success':  function(data, textStatus, XMLHttpRequest) {
		var token = parseAuthToken(data);
		if(token != null)
		    loginSuccess(user,token);
		else
		    loginFail('Could not authenticate');
	    },
	    'error':    function(XMLHttpRequest, textStatus, errorThrown) {
		loginFail();
	    }
	   });

    return authToken
}

function ping() {
    ampacheRequest(LOGIN_TOKEN,'ping');
}

function playSong(url) {
    clearPlayer();
    var video =
	$('<audio src="' + url + '" id="audio_with_controls" width="320" controls autobuffer>');
    video.appendTo($('#info'));
    
}

function addSongToCurrentPlaylist(name,url) {
    var playlist_song = $('<li>' + name + '</li>');
    playlist_song.click(function() {
	playSong(url);
    });
    playlist_song.appendTo($('#playlist'));
}

function createSong(name,url) {
    var song_button = $('<br /><span class="song">' + name + '</li>');
    song_button.click(function() {
	addSongToCurrentPlaylist(name,url);
    });
    return song_button;
}

function getSongs(container,album_id) {
    ampacheRequest(LOGIN_TOKEN,'album_songs',function(data){
	$(data).find('song').each(function() {
	    var name = parseXMLTag(this,'title');
	    var url = parseXMLTag(this,'url');
	    container.append(createSong(name,url));
	});
    },{'filter':album_id});
}

function createAlbum(name,id) {
    var open = false;
    var album_li = $('<li class="album">');
    var album_button = $('<span>' + name + '</span>');
    var song_container = $('<span>');
    album_button.click(function() {
	if(open) {
	    // close it
	    song_container.children().remove();
	    open = false;
	} else {
	    // open it
	    getSongs(song_container,id);
	    open = true;
	}
    });
    album_button.appendTo(album_li);
    song_container.appendTo(album_li);
    return album_li;
}

function getAlbums(container,artist_id) {
    ampacheRequest(LOGIN_TOKEN,'artist_albums',function(data){
	$(data).find('album').each(function() {
	    var name = parseXMLTag(this,'name');
	    var id = $(this).attr('id');
	    container.append(createAlbum(name,id));
	});
    },{'filter':artist_id});
}

function addArtist(name,id) {
    var open = false;
    var artist_li = $('<li class="artist">');
    var artist_button = $('<span>' + name + '</span>');
    var album_container = $('<span>');
    artist_button.click(function() {
	if(open) {
	    // close it
	    album_container.children().remove();
	    open = false;
	} else {
	    // open it
	    getAlbums(album_container,id);
	    open = true;
	}
    });
    artist_button.appendTo(artist_li);
    album_container.appendTo(artist_li);
    artist_li.appendTo($('#songs'));
}

function getArtists() {
    ampacheRequest(LOGIN_TOKEN,'artists',function(data){
	$(data).find('artist').each(function() {
	    var artist = parseXMLTag(this,'name');
	    var id = $(this).attr('id');
	    addArtist(artist,id);
	});
    });
}

function clearPlayer() {
    $('#player').children().remove();
}

function playVideo(url) {
    clearPlayer();
    var video =
	$('<video src="' + url + '" id="video_with_controls" width="320" controls autobuffer>');
    video.appendTo($('#player'));
}

function addVideo(name,url) {
    var open = false;
    if(name == '' || name == undefined) name = 'untitled';
    var video_button = $('<li>' + name + '</li>');
    video_button.click(function() {
	playVideo(url);
    });
    video_button.appendTo($('#videos'));
}

function getVideos() {
    ampacheRequest(LOGIN_TOKEN,'videos',function(data){
	$(data).find('video').each(function() {
	    var video = parseXMLTag(this,'title');
	    var url = parseXMLTag(this,'url');
	    addVideo(video,url);
	});
    });
}

function loginSuccess(user,token) {
    $('#login').hide();
    $('#ui').show();
    LOGIN_TOKEN = token;
    if(PING_ID != null)
	clearInterval(PING_ID);
    PING_ID = setInterval(ping,PING_INTERVAL);
    getArtists();
    getVideos();
}

function loginFail(text) {
    $('#login').show();
    $('#ui').hide();
    if(text != undefined)
	$('#login_output').append(text + '<br>');
    if(PING_ID != null) {
	clearInterval(PING_ID);
	PING_ID = null;
    }
}

function ampacheRequest(token,method,success_fn,send_data) {
    var data = {
	'auth':   token,
	'action': method
    };
    if(send_data != undefined)
	for(var i in send_data)
	    data[i] = send_data[i];
    return $.ajax({'url':  AMPACHE_URL,
		   'data': data,
		   'success': success_fn});
}

function startup() {
    $('#login').show();
    $('#ui').hide();
    $('#login_form').submit(function() {
	var user = $('#user_text').val();
	var pass = $('#pass_text').val();
	var url  = $('#url_text').val();
	getAuthToken(user,pass,url);
	return false; // Don't submit the form
    });
}

// Runs when jQuery finishes loading
$(function() {
    $(document).ready(startup);
});