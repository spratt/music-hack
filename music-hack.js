/*
 * http://ampache.org/wiki/dev:xmlapi
 */

var AMPACHE_URL     = 'http://localhost/~spratt/ampache/server/xml.server.php';
var AMPACHE_VERSION = '350001';
var LOGIN_TOKEN = null;
var PING_ID = null;
var PING_INTERVAL = 5000;

function parseXMLTag(xmldata,tag) {
    var xml_auth = $(xmldata).find(tag).get(0);
    if(xml_auth == undefined) return null;
    return xml_auth.textContent;
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

function addArtist(name,id) {
    var open = false;
    var artist_button = $('<li>' + name + '</li>');
    artist_button.click(function() {
	if(open) {
	    // close it
	} else {
	    // open it
	}
    });
    artist_button.appendTo($('#songs'));
}

function getArtists() {
    ARTISTS = {};
    ampacheRequest(LOGIN_TOKEN,'artists',function(data){
	$(data).find('artist').each(function() {
	    var artist = this.getElementsByTagName("name")[0].textContent;
	    var id = $(this).attr('id');
	    console.log(artist);
	    addArtist(artist,id);
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