/*
=-=-=-=-=-=-=-=-=-=-=-=-
Cataas X Discord
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID: 23621112
=-=-=-=-=-=-=-=-=-=-=-=-
*/

const http = require('http');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const port = 3000;
const server = http.createServer();
const credentials = require('./auth/credentials.json');
let cat_code = 0;

server.on("request", connection_handler);
function connection_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
	const main = fs.createReadStream('html/main.html');
	if(req.url === "/"){
		res.writeHead(200, {'Content-Type':'text/html'});
		main.pipe(res);
	}
	else if(req.url === '/favicon.ico'){
		const favicon = fs.createReadStream('images/favicon.ico');
		res.writeHead(200, {'Content-Type':'image/x-icon'});
		favicon.pipe(res);
	}
	else if(req.url === '/images/banner.jpg'){
		const banner = fs.createReadStream('images/banner.jpg');
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		banner.pipe(res);
	}
	else if(req.url === '/images/cat.jpg'){
		const cat = fs.createReadStream('images/cat.jpg');
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		cat.pipe(res);
	}
	else if(req.url === '/images/sad_cat.jpg'){
		const cat = fs.createReadStream('images/sad_cat.jpg');
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		cat.pipe(res);
	}
	else if(req.url === '/images/moving_cat.gif'){
		const moving_cat = fs.createReadStream('images/moving_cat.gif');
		res.writeHead(200, {'Content-Type':'image/gif'});
		moving_cat.pipe(res);
	}
	else if(req.url.startsWith('/search')){
		const url_search = new URL(req.url, `http://localhost:${port}`);
		const cat = url_search.searchParams.get("field");
		if(cat === "cat"){
			cat_code = 0;
			request_cat(res);
		}
		else if(cat === "cat/gif"){
			cat_code = 1;
			request_cat_gif(res);
		}
		else {
			const error_field = fs.createReadStream('./html/error.html');
			res.writeHead(404, {'Content-Type':'text/html'});
			error_field.pipe(res);
		}
	}
	else if(req.url.startsWith('/?code')){
		const url_search = new URL(req.url, `http://localhost:${port}`);
		const code = url_search.searchParams.get('code');
		console.log('Code: ' + code);
		request_access_token(code, res);
	}
	else if(req.url.startsWith('/posted')){
		const url_search = new URL(req.url, `http://localhost:${port}`);

		let nickname = url_search.searchParams.get('nickname');
		let discord_id = url_search.searchParams.get('discord_id');
		let avatar_id = url_search.searchParams.get('avatar_id');

		let results = '<h1>Here is your cat and your discord information<h1>';
		if(cat_code == 0){
			results += '<img src="images/cat.jpg" alt="Cat" />';
		} 
		else if(cat_code == 1) {
			results += '<img src="images/moving_cat.gif" alt="Cat" />';
		}

		results += `<h3>Nickname: ${nickname}<h3/>`;
		results += `<h3>Discord ID: ${discord_id}<h3/>`;
		results += `<h3>Avatar: <h3/>`
		results += `<img src="https://cdn.discordapp.com/avatars/${discord_id}/${avatar_id}.png" alt="your avatar"/> `
		results += `<a href="http://localhost:3000">Go back</a>`
		res.write(results);
		res.end();
	}
	else {
		res.writeHead(404, {'Content-Type':'text/plain'});
		res.end("404 Not Found");
	}
}

function request_cat(res){
	console.log("Requesting a cat...");
	const cat_endpoint = "https://cataas.com/cat";
	const img_path = 'images/cat.jpg';
	const image_request = https.get(cat_endpoint);

	image_request.on("response", function receive_image_data(image_stream){
		const save_image = fs.createWriteStream(img_path, {endocing:null});
		save_image.on('finish', ()=>{
			console.log('The cat has been saved!');
			save_image.end();
			image_request.end();
			get_authorization(res);
		})
		image_stream.on('error', function image_error_handler(err){
			res.writeHead(404, {'Content-Type':'text/plain'});
			res.end("404 Not Found");
		});
		image_stream.on('end', () => {
			console.log("A cat has been received!");
		});
		image_stream.pipe(save_image);
	});
}

function get_authorization(res){
	const authorization_endpoint = 'https://discord.com/api/oauth2/authorize';
	const redirect_uri = `http://localhost:${port}`;

	const params = {
		'client_id': credentials.client_id,
		'scope': 'identify',
		'response_type': 'code',
		'redirect_uri': redirect_uri,
		'prompt': 'consent',
	}
	const query = querystring.stringify(params);

	res.writeHead(301, {Location: `${authorization_endpoint}?${query}`});
	res.end();
}

function request_access_token(code, res){
	const api_endpoint = 'https://discord.com/api/oauth2/token';
	const redirect_uri = `http://localhost:${port}`;
	const options = {
		method: "POST",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	}
	const data = {
		'client_id': credentials.client_id,
		'client_secret': credentials.client_secret,
		'grant_type': 'authorization_code',
		'code': code,
		'redirect_uri': redirect_uri
	}
	const post_data = querystring.stringify(data);
	const token_request = https.request(api_endpoint, options);
	token_request.once("response", (token_stream) => stream_to_message(token_stream, received_token, res));
	token_request.end(post_data);
}

function received_token(token_object, res){
	const token = JSON.parse(token_object);
	console.log('Token object: ' + token_object);
	console.log('Access Token: ' + token.access_token);
	
	// post_cat(token.access_token, res);
	get_user_info(token.access_token, res)
}

function get_user_info(token, res){
	const get_user_url = 'https://discord.com/api/users/@me';
	const options = {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${token}`,
		}
	};

	const user_request = https.request(get_user_url, options);
	user_request.once("error", (err) => {throw err});
	user_request.once("response", (user_stream) => stream_to_message(user_stream, received_user, res));
	user_request.end();
}

function received_user(user_object, res){
	const user = JSON.parse(user_object);
	console.log(user);
	console.log('Your information: ');
	console.log('Nickname: ' + user.username);
	console.log('Discord ID: ' + user.id);
	console.log('Avatar ID: ', user.avatar);
	const params = {
		'nickname': user.username,
		'discord_id': user.id,
		'avatar_id': user.avatar
	}
	const query = querystring.stringify(params);
	res.writeHead(301, {Location: `./posted?${query}`});
	res.end();
}

function request_cat_gif(res){
	console.log("Requesting a cat...");
	const cat_endpoint = "https://cataas.com/cat/gif";
	const img_path = 'images/moving_cat.gif';
	const image_request = https.get(cat_endpoint);

	image_request.on("response", function receive_image_data(image_stream){
		const save_image = fs.createWriteStream(img_path, {endocing:null});
		save_image.on('finish', ()=>{
			console.log('The cat has been saved!');
			get_authorization(res);
		})
		image_stream.on('error', function image_error_handler(err){
			res.writeHead(404, {'Content-Type':'text/plain'});
			res.end("404 Not Found");
		});
		image_stream.on('end', () => {
			console.log("A cat has been received!");
		});
		image_stream.pipe(save_image);
	});
}

// STREAM TO MESSAGE
function stream_to_message(stream, callback, ...args){
	let body = "";
	stream.on("data", chunk=> body += chunk);
	stream.on("end", () => callback(body, ...args));
}

server.on("listening", listening_handler);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}

server.listen(port);

// ABANDONED.
// Submitting multipart/form-data was successful,
// but I don't know how to conver the image into image bytes that can be received by discord.
// function post_cat(token, res){
// 	const post_url = "https://discord.com/api/channels/842899235350249526/messages";
// 	const image_cat = fs.createReadStream("./album-art/cat.jpg");
// 	let x = "";
// 	image_cat.setEncoding('base64');
// 	image_cat.on('data', function(chunk){
// 		x += chunk;
// 	})
// 	const image_path = './album-art/cat.jpg';
// 	const image = fs.readFileSync('./album-art/cat.jpg');
// 	const boundary = 'POST-CAT-BOUNDARY';
// 	const content_disposition ='Content-Disposition: form-data; name="file"; filename="cat.jpg"';
// 	const content_disposition2 ='Content-Disposition: form-data; name="content"';
// 	const content_type = 'Content-Type: image/jpeg';
// 	const options = {
// 		method: "POST",
// 		headers: {
// 			"Authorization": `Bot ${credentials.bot_token}`,
// 			"Content-Type": `multipart/form-data; boundary=${boundary}`
// 		},
// 	};
// 	const data = `--${boundary}\n${content_disposition}\n${content_type}\n\n${image_path}\n--${boundary}--`;
// 	const bot_request = https.request(post_url, options);
// 	bot_request.once("error", err => {throw err});
// 	bot_request.once("response", (cat_stream) => stream_to_message(cat_stream, post_done, res));
// 	bot_request.end(data);
// }