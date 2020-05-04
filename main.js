/*
                _  __          _          
   __ _   ___  | |/ /   __ _  | |_    ___ 
  / _` | / __| | ' /   / _` | | __|  / _ \
 | (_| | \__ \ | . \  | (_| | | |_  |  __/
  \__,_| |___/ |_|\_\  \__,_|  \__|  \___|
                                                   
	Authors:
		Árnilsen Arthur - Back-end Developer
		Daniel Oliveira	- Businessman
		Davi Rodigues	- UX/UI Designer
		Pablo Henrique	- Marketing
		Rafael Freitas	- Front-end Developer

	Data:
		30/04/2020

*/

/*
	Used Libraries
*/
var express = require('express');
var bodyParser = require('body-parser');
var app = express()
app.use(bodyParser.json());
global.watson = require('./watson.js');
global.core = require('./core.js');
var meli = require('mercadolibre');
require('dotenv').config();
var fs = require('fs');
var mysql = require('mysql');
global.request = require('request')
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var moment = require('moment');
const cors = require('cors');
app.use(cors());
const client = require('twilio')(process.env.TWILIO_A,process.env.TWILIO_B);

/*
export TWILIO_ACCOUNT_SID=Your-Account-SID
export TWILIO_AUTH_TOKEN=Your-Twilio-Auth-Token
export TWILIO_PHONE_NUMBER=Your-Twilio-Phone-Number
*/

/*
  ____            _                ___       ___           _                    __                             
 |  _ \    __ _  | |_    __ _     ( _ )     |_ _|  _ __   | |_    ___   _ __   / _|   __ _    ___    ___   ___ 
 | | | |  / _` | | __|  / _` |    / _ \/\    | |  | '_ \  | __|  / _ \ | '__| | |_   / _` |  / __|  / _ \ / __|
 | |_| | | (_| | | |_  | (_| |   | (_>  <    | |  | | | | | |_  |  __/ | |    |  _| | (_| | | (__  |  __/ \__ \
 |____/   \__,_|  \__|  \__,_|    \___/\/   |___| |_| |_|  \__|  \___| |_|    |_|    \__,_|  \___|  \___| |___/

*/

/*
	Mysql Connection
*/
global.mysql_con = null;

/*
	Parse answers file
*/
global.answers = JSON.parse(fs.readFileSync('answers.json', 'utf8'));

/*
	Label for attributes
*/
global.attributes_labels = JSON.parse(fs.readFileSync('attributes_labels.json', 'utf8'));

/*
	Lista das interfaces das plataformas aceitas no sistema
*/
global.platforms = {};

require('./platforms/mercado_livre.js');

/*
	Mercado Livre
*/
global.meliObject = new meli.Meli(process.env.MELI_ID, process.env.MELI_SECRET);




/*
  ____                    _                
 |  _ \    ___    _   _  | |_    ___   ___ 
 | |_) |  / _ \  | | | | | __|  / _ \ / __|
 |  _ <  | (_) | | |_| | | |_  |  __/ \__ \
 |_| \_\  \___/   \__,_|  \__|  \___| |___/

*/

function log(msg) {
  console.log(`[${moment().format('HH:mm:ss')}] ${msg}`)
}

app.use((req, _res, next) => {
  log(`${req.method} ${req.path}`)

  next()
})


/*
	User Login Route
*/
app.post("/user/login", function(req, res)
{
	let email = global.core.getValue(req.body.email);
	let password = global.core.getValue(req.body.password);

	global.mysql_con.query("SELECT id,password FROM user WHERE email='" + email + "'", function(err, result, fields)
	{
		if(err)
			return res.send(
			{
				status: "error",
				error: "internal_server_error"
			});

		if(result.length == 0)
			return res.send(
			{
				status: "error",
				error: "email_not_registred"
			});


		bcrypt.compare(password, result[0].password, function(err, bres)
		{
			if(bres)
			{
				crypto.randomBytes(48, function(err, buffer)
				{
					if(err)
						return res.send(
						{
							status: "error",
							error: "internal_server_error"
						});

					var token = buffer.toString('hex');

					token = token.substring(0, 60);
					global.mysql_con.query("UPDATE user SET token='" + token + "' WHERE id='" + result[0].id + "'", function(err, result, fields)
					{
						if(err)
							return res.send(
							{
								status: "error",
								error: "internal_server_error"
							});

						res.send(
						{
							status: "success",
							token: token
						});
					});


				});
			}
			else
			{
				return res.send(
				{
					status: "error",
					error: "wrong_password"
				});
			}
		});

	});

});

app.post("/user/reset_api_tokens", function(req, res)
{
	var token = req.headers['x-token']

	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		crypto.randomBytes(48, function(err, buffer)
		{
			if(err)
				return res.status(400).json(
				{
					status: "error",
					error: "internal_server_error"
				});

			var token1 = buffer.toString('hex');

			token1 = token1.substring(0, 60);

			crypto.randomBytes(48, function(err, buffer)
			{
				if(err)
					return res.status(400).json(
					{
						status: "error",
						error: "internal_server_error"
					});

				var token2 = buffer.toString('hex');

				token2 = token2.substring(0, 60);

				global.mysql_con.query("UPDATE user SET api_access_token='" + token1 + "' , api_secret_token='" + token2 + "' WHERE id='" + user_info.id + "'", function(err, result)
				{
					if(err)
					{
						return res.status(400).json(
						{
							status: "error",
							error: "internal_server_error"
						});
					}

					if(result.affectedRows == 0)
						return res.status(400).json(
						{
							status: "error",
							error: "invalid_token"
						});

					return res.status(200).json(
					{
						status: "success"
					});
				});
			});
		});
	});
});

/*
	User Register Route
*/
app.post("/user/register", function(req, res)
{
	let email = global.core.getValue(req.body.email);
	let name = global.core.getValue(req.body.name);
	let password = global.core.getValue(req.body.password);

	if(name.length < 10)
		return res.status(400).send(
		{
			status: "error",
			error: "too_short_name"
		});
	if(name.length > 30)
		return res.status(400).send(
		{
			status: "error",
			error: "too_long_name"
		});


	if(email.length < 10)
		return res.status(400).send(
		{
			status: "error",
			error: "too_short_email"
		});

	if(email.length > 60)
		return res.status(400).send(
		{
			status: "error",
			error: "too_long_email"
		});

	if(password.length > 24)
		return res.status(400).send(
		{
			status: "error",
			error: "too_long_password"
		});

	if(password.length < 6)
		return res.status(400).send(
		{
			status: "error",
			error: "too_short_password"
		});

	bcrypt.hash(password, 10, function(err, hash)
	{
		if(err)
		{
			return res.status(400).send(
			{
				status: "error",
				error: "internal_server_error"
			});
		}
		else
		{
			//Check if email is already in use	
			global.mysql_con.query("SELECT id FROM user WHERE email='" + email + "'", function(err, result, fields)
			{
				if(err)
					return res.status(400).send(
					{
						status: "error",
						error: "internal_server_error"
					});

				if(result.length > 0)
					return res.status(400).send(
					{
						status: "error",
						error: "email_already_in_use"
					});
				else
					//Register
					crypto.randomBytes(48, function(err, buffer)
					{
						if(err)
							return res.status(400).json(
							{
								status: "error",
								error: "internal_server_error"
							});

						var token1 = buffer.toString('hex');

						token1 = token1.substring(0, 60);

						crypto.randomBytes(48, function(err, buffer)
						{
							if(err)
								return res.status(400).json(
								{
									status: "error",
									error: "internal_server_error"
								});

							var token2 = buffer.toString('hex');

							token2 = token2.substring(0, 60);

							global.mysql_con.query("INSERT INTO user VALUES (NULL,'" + email + "','" + name + "',NULL,NULL,'" + token1 + "','" + token2 + "','" + hash + "',NULL,1,1,20)", function(err, result)
							{
								if(err) return res.status(400).send(
								{
									status: "error",
									error: "internal_server_error"
								});
								res.send(
								{
									status: "success"
								});
							});
						});
					});
			});

		}
	});
});

/*
	User Initial Sync Route
*/
app.post("/user/sync_with_platform", function(req, res)
{
	var token = req.headers['x-token']


	var platform = global.core.getValue(req.body.platform);


	if(token.length < 40)
	{
		return res.send("<script>window.location.href = 'https://askate.leagueofdevs.com.br?sync=" + platform + "&success=false';</script>");
	}

	//Check platform with supports
	if(global.core.isValidPlataform(platform))
	{
		//Generate sync token
		global.core.getUserIdFromToken(token, function(user_info)
		{
			if(user_info == null)
				return res.send("<script>window.location.href = 'https://askate.leagueofdevs.com.br?sync=" + platform + "&success=false';</script>");

			//Generate sync token
			crypto.randomBytes(48, function(err, buffer)
			{
				if(err)
					return res.send("<script>window.location.href = 'https://askate.leagueofdevs.com.br?sync=" + platform + "&success=false';</script>");

				var sync_token = buffer.toString('hex');

				sync_token = sync_token.substring(0, 60);
				global.mysql_con.query("UPDATE user SET sync_token='" + sync_token + "' WHERE id='" + user_info.id + "'", function(err, result, fields)
				{
					if(err || result.affectedRows == 0)
						return res.send("<script>window.location.href = 'https://askate.leagueofdevs.com.br?sync=" + platform + "&success=false';</script>");

					//Complete/Redirect auth user
					platforms[platform].authUser(sync_token, res);

				});


			});

		});

	}
	else
	{
		return res.status(400).json(
		{
			status: "error",
			error: "invalid_platform"
		});
	}
});

/*
	User Suggestion List for Product
*/
app.post("/user/suggestions", function(req, res)
{
	var token = req.headers['x-token']
	var product = global.core.getValue(req.body.product);
	var platform = global.core.getValue(req.body.platform);


	global.core.getUserIdFromToken(token, function(user_info)
	{

		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		global.mysql_con.query("SELECT * FROM suggestion WHERE platform='" + platform + "' AND product_id='" + product + "' AND solved = 0", function(err, result, fields)
		{
			let obj = [];

			for(let i = 0; i < result.length; i++)
			{
				obj.push(
				{
					source: result[i].source,
					attribute_name: global.attributes_labels[result[i].name],
					value: result[i].value,
					id: result[i].id
				});
			}
			res.send(obj);
		});
	});

});

/*
	User Product List
*/
app.get("/user/products", function(req, res)
{
	var token = req.headers['x-token']

	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		//Get products
		var keys = Object.keys(platforms);
		var ended = 0;
		var products = [];
		for(let i = 0; i < keys.length; i++)
		{
			platforms[keys[i]].getProducts(user_info.id, function(vs)
			{
				products = products.concat(vs);
				ended++;

				if(ended == keys.length)
				{
					//Fim
					return res.send(products);
				}
			});
		}

		if(keys.length == 0)
			return res.send([]);
	});

});

/*
	User info
*/
app.get("/user/info", function(req, res)
{
	var token = req.headers['x-token']

	global.core.getUserFromTokenSecure(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		user_info.settings = {
			whatsapp_notifications: user_info.setting_whatsapp_notifications == 1,
			whatsapp_notification_time: user_info.setting_whatsapp_delay,
			kate_auto_send: user_info.setting_bot_autosend == 1
		};

		delete user_info.setting_whatsapp_delay;
		delete user_info.setting_whatsapp_notifications;
		delete user_info.setting_bot_autosend;
		return res.status(200).json(user_info);
	});
});

/*
	Answer a kate attribute suggestion (Accept/Deny)
*/
app.post("/user/suggestion/attribute", function(req, res)
{
	var token = req.headers['x-token']
	var suggestion = global.core.getValue(req.body.suggestion);
	var value = global.core.getValue(req.body.value);

	let accept = global.core.getValue(req.body.accept) == true || global.core.getValue(req.body.accept) == "1" || global.core.getValue(req.body.accept) == "true";

	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		global.mysql_con.query("SELECT * FROM suggestion WHERE user_id='" + user_info.id + "' AND id='" + suggestion + "'", function(err, result, fields)
		{
			if(err)
				return res.status(400).json(
				{
					status: "error",
					error: "internal_server_error"
				});

			if(result.length == 0)
				return res.status(400).json(
				{
					status: "error",
					error: "invalid_suggestion"
				});

			let sug = result[0];

			if(sug.value == null && value == "")
			{
				return res.status(400).json(
				{
					status: "error",
					error: "invalid_value"
				});
			}
			if(accept)
				platforms[sug.platform].acceptSuggestion(user_info.id, sug, sug.value == null ? value : sug.value, res)
			global.mysql_con.query("DELETE FROM suggestion WHERE user_id='" + user_info.id + "' AND id='" + suggestion + "'", function(err, result, fields)
			{
				if(!accept)
				{

					res.send(
					{
						status: "success"
					})
				}
			});
		});
	});
});

/*
	Edit user info
*/
app.post("/user/edit_info", function(req, res)
{
	var token = req.headers['x-token']
	var email = global.core.getValue(req.body.email);
	var phone = global.core.getValue(req.body.phone);
	var name = global.core.getValue(req.body.name);


	if(name.length < 10)
		return res.status(400).send(
		{
			status: "error",
			error: "too_short_name"
		});
	if(name.length > 30)
		return res.status(400).send(
		{
			status: "error",
			error: "too_long_name"
		});

	if(email.length < 10)
		return res.send(
		{
			status: "error",
			error: "too_short_email"
		});

	if(email.length > 60)
		return res.send(
		{
			status: "error",
			error: "too_long_email"
		});

	if(req.body.settings == null)
		return res.send(
		{
			status: "error",
			error: "invalid_settings"
		});
	var whatsapp_notifications = global.core.getValue(req.body.settings.whatsapp_notifications);
	whatsapp_notifications = whatsapp_notifications == true || whatsapp_notifications == "true" || whatsapp_notifications == 1 || whatsapp_notifications == "1";
	var kate_auto_send = global.core.getValue(req.body.settings.kate_auto_send);
	kate_auto_send = kate_auto_send == true || kate_auto_send == "true" || kate_auto_send == 1 || kate_auto_send == "1";
	var whatsapp_notification_time = global.core.getValue(req.body.settings.whatsapp_notification_time);
	if(whatsapp_notification_time == "")
		whatsapp_notification_time = 0;
	kate_auto_send = kate_auto_send ? 1 : 0;
	whatsapp_notifications = whatsapp_notifications ? 1 : 0;


	global.mysql_con.query("UPDATE user SET name='" + name + "',email='" + email + "',setting_whatsapp_delay='" + whatsapp_notification_time + "',phone='" + phone + "',setting_bot_autosend='" + kate_auto_send + "',setting_whatsapp_notifications='" + whatsapp_notifications + "' WHERE token='" + token + "'", function(err, result, fields)
	{
		if(err)
			return res.status(400).json(
			{
				status: "error",
				error: "internal_server_error"
			});

		if(result.affectedRows == 0)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});


		return res.status(200).json(
		{
			status: "success"
		});
	});
});

/*
	Remove user sync with a platform
*/
app.delete("/user/remove_sync", function(req, res)
{
	var token = req.headers['x-token']
	var platform = global.core.getValue(req.body.platform);

	if(!global.core.isValidPlataform(platform))
		return res.status(400).json(
		{
			status: "error",
			error: "invalid_platform"
		});

	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		global.mysql_con.query("DELETE FROM user_token WHERE user_id='" + user_info.id + "' AND platform='" + platform + "'", function(err, result, fields)
		{
			if(result.affectedRows == 0)
				return res.status(400).json(
				{
					status: "error",
					error: "already_not_synced"
				});
			res.send(
			{
				status: "success"
			});
		});
	});
})

/*
	Get user syncronizations
*/
app.get("/user/syncs", function(req, res)
{
	var token = req.headers['x-token']

	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		global.mysql_con.query("SELECT platform FROM user_token WHERE user_id='" + user_info.id + "'", function(err, result, fields)
		{

			let ls = [];

			for(let i = 0; i < result.length; i++)
			{
				ls.push(result[i].platform);
			}

			res.send(ls);
		});
	});
});

/*
	Answer a question of a platform directly
*/
app.post("/question/answer", function(req, res)
{
	var token = req.headers['x-token']
	let question = global.core.getValue(req.body.question);
	let answer = global.core.getValue(req.body.answer);

	if(answer.length < 16)
		return res.status(400).json(
		{
			status: "error",
			error: "too_short_answer"
		});

	if(answer.length > 500)
		return res.status(400).json(
		{
			status: "error",
			error: "too_long_answer"
		});

	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.status(400).json(
			{
				status: "error",
				error: "invalid_token"
			});

		global.mysql_con.query("SELECT * FROM question WHERE id='" + question + "' AND user_id='" + user_info.id + "'", function(err, result, fields)
		{
			if(err)
				return res.status(400).json(
				{
					status: "error",
					error: "internal_server_error"
				});

			if(result.length == 0)
				return res.status(400).json(
				{
					status: "error",
					error: "invalid_question"
				});

			if(result[0].answered_by != "0" && result[0].answered_by != "3")
				return res.status(400).json(
				{
					status: "error",
					error: "already_answered"
				});


			let platform = result[0].platform;
			global.core.getSync(user_info.id, platform, function(data)
			{
				platforms[platform].answerQuestion(result[0].question_id, answer, data.token, function(err)
				{
					if(err)
						return res.status(400).json(
						{
							status: "error",
							error: "internal_server_error"
						});

					global.core.updateQuestionAnswerAtDataBase(platform, result[0].question_id, 1, answer, 1, "", function(cb)
					{
						return res.status(400).json(
						{
							status: "success"
						});
					});


				});
			});

		});

	});

});

/*
	Get full product info (with questions and suggestions)
*/
app.get("/product/full_info", function(req, res)
{
	var token = req.headers['x-token']
	var product = global.core.getValue(req.body.product);
	var platform = global.core.getValue(req.body.platform);

	if(global.core.isValidPlataform(platform))
	{
		global.core.getUserIdFromToken(token, function(user_info)
		{
			if(user_info == null)
				return res.status(400).json(
				{
					status: "error",
					error: "invalid_token"
				});

			//Do search
			global.platforms[platform].getProduct(user_info.id, product, res);
		});
	}
	else
	{
		res.send(
		{
			status: "error",
			error: "invalid_platform"
		})
	}

});

/*
	Accept or deny bot answer
*/
app.post("/kate/suggestion/question", function(req, res)
{
	var token = req.headers['x-token']
	let question = global.core.getValue(req.body.question);
	let accept = global.core.getValue(req.body.accept) == true || global.core.getValue(req.body.accept) == "1" || global.core.getValue(req.body.accept) == "true";



	global.core.getUserIdFromToken(token, function(user_info)
	{
		if(user_info == null)
			return res.json(
			{
				status: "error",
				error: "invalid_token"
			});
	
		global.mysql_con.query("SELECT * FROM question WHERE id='" + question + "' AND user_id='" + user_info.id + "'", function(err, result, fields)
		{
			if(err)
				return res.status(400).json(
				{
					status: "error",
					error: "internal_server_error"
				});

			if(result.length == 0)
				return res.status(400).json(
				{
					status: "error",
					error: "invalid_question"
				});

			if(result[0].answered_by != "3")
				return res.status(400).json(
				{
					status: "error",
					error: "no_kate_suggestion"
				});

			//Accepy or deny
			let platform = result[0].platform;

			if(accept)
			{
				global.core.getSync(user_info.id, platform, function(data)
				{
					platforms[platform].answerQuestion(result[0].question_id, result[0].answer, data.token, function(err)
					{
						if(err)
							return res.status(400).json(
							{
								status: "error",
								error: "internal_server_error"
							});

						global.core.updateQuestionAnswerAtDataBase(platform, result[0].question_id, 2, result[0].answer, 1, "", function(cb)
						{
							console.log("[!] Question bot-answer accepted!");

							return res.status(400).json(
							{
								status: "success"
							});
						});


					});
				});
			}
			else
			{
				global.core.updateQuestionAnswerAtDataBase(platform, result[0].question_id, 0, null, 1, "", function(cb)
				{
					console.log("[!] Question bot-answer denied!");

					return res.status(400).json(
					{
						status: "success"
					});
				});
			}
		});
	});
})

/*
	List supported platforms at askate system
*/
app.get("/kate/platforms", function(req, res)
{
	res.send(Object.keys(platforms));
});



/*
  _____          _                                   _ 
 | ____| __  __ | |_    ___   _ __   _ __     __ _  | |
 |  _|   \ \/ / | __|  / _ \ | '__| | '_ \   / _` | | |
 | |___   >  <  | |_  |  __/ | |    | | | | | (_| | | |
 |_____| /_/\_\  \__|  \___| |_|    |_| |_|  \__,_| |_|

*/
/*
	Recive notifications from platforms
*/
app.post("/external/notification", function(req, res)
{
	//console.log(req.body);
	//For now,only mercado_livre
	var platform = "mercado_livre";
	res.sendStatus(200);
	if(req.body.topic == "questions")
	{
		global.meliObject.get(req.body.resource, function(err, res)
		{
			
			if(res.status == "ANSWERED")
			{
				global.mysql_con.query("SELECT answered_by FROM question WHERE platform='" + platform + "' AND question_id='" + res.id + "'", function(err, result, fields)
				{

					if(result.length == 0)
						return;

					if(result[0].answered_by != "2" && result[0].answered_by != "3")
					{
						//Avaliar resposta usando ibm watson
						watson.forceNewSession();
						watson.answer("%kind-eval% " + res.answer.text + " %kind-eval%", "").then(function(value)
						{

							let kind_level = 0.5;
							let kind_info = "";
							try
							{
								let h = JSON.parse(value.output.generic[0].text);
								kind_info = h.kind;
								kind_level = kind_info.length == 0 ? 0 : kind_info.length / 2;
							}
							catch (err)
							{

							}

							global.core.updateQuestionAnswerAtDataBase(platform, res.id, 1, res.answer.text, kind_level, kind_info, function(cb)
							{
								console.log("[!] Question user-answer updated!");
							});

						});


					}
					else
					{
						global.core.updateQuestionAnswerAtDataBase(platform, res.id, 2, res.answer.text, 1, "", function(cb)
						{
							console.log("[!] Question bot-answer updated!");
						});
					}
				});

			}
			else
			if(res.status == "UNANSWERED")
			{
				//Get bot answer
				global.core.answerAQuestion(platform, res.text, "%ignore for now%", res.item_id, function(answer)
				{
					if(answer == null)
					{
						global.core.saveQuestionAtDataBase(platform, res.id, res.item_id, data.user_id, res.seller_id, 0, res.text, null,null, function(res)
						{
							console.log("[!] Question not answered added to database!");
						});
						return;
					}

					global.core.getSyncUsingPlatformUserId(req.body.user_id, platform, function(data)
					{
						
						if(data == null)
							return;

						if(answer.type == "couldnt_understand")
						{
							global.core.saveQuestionAtDataBase(platform, res.id, res.item_id, data.user_id, res.seller_id, 0, res.text, null,null, function(res)
							{
								console.log("[!] Question not answered added to database!");
							})
						}
						else if(answer.type == "attribute_not_found")
						{
							global.core.saveQuestionAtDataBase(platform, res.id, res.item_id, data.user_id, res.seller_id, 0, res.text, null,answer.atribute_id, function(resd)
							{
								console.log("[!] Question not answered added to database!");

								global.core.saveSuggestionAtDataBase(platform, data.user_id, res.item_id, res.id, answer.atribute_id, null, function(res)
								{
									console.log("[!] Suggestion added to database!");
								})
							})
						}
						else if(answer.type == "message")
						{	

							global.core.getUserInfo(data.user_id, function(dt)
							{
								if(dt.setting_bot_autosend == "1")
								{
									platforms[platform].answerQuestion(res.id, answer.text, data.token, function(err)
									{
										if(err)
										{
											return;
										}


										global.core.saveQuestionAtDataBase(platform, res.id, res.item_id, data.user_id, res.seller_id, 2, res.text, answer.text,answer.atribute_id, function(res)
										{
											console.log("[!] Question answered by kate added to database!");
										});
									});
								}
								else
								{
									global.core.saveQuestionAtDataBase(platform, res.id, res.item_id, data.user_id, res.seller_id, 3, res.text, answer.text,answer.atribute_id, function(resd)
									{
										console.log("[!] Question answer suggestion by kate added in database!");
									});
								}
							});
						}
					});
				});
			}
		});
	}
	if(req.body.topic == "items") //Parse description and check suggestions
	{
		global.core.getSyncUsingPlatformUserId(req.body.user_id, platform, function(user_data)
		{
			if(user_data == null)
				return;

			platforms[platform].itemNotification(user_data, req.body);

		});
	}
})

/*
	Get authorization from platform
*/
app.get("/external/auth", function(req, res)
{
	let full_sync_token = global.core.getValue(req.query.sync_token).split("-");

	if(full_sync_token.length != 2)
		return res.send(
		{
			type: "error",
			message: "invalid_sync_token"
		});

	let token = full_sync_token[0];
	let platform = full_sync_token[1];
	let code = global.core.getValue(req.query.code);

	if(global.core.isValidPlataform(platform))
	{
		platforms[platform].endAuth(req.body, token, code, res);
	}
	else
	{
		//Just ignore
		return res.sendStatus(200);
	}
})



/*
   ____                       
  / ___|   ___    _ __    ___ 
 | |      / _ \  | '__|  / _ \
 | |___  | (_) | | |    |  __/
  \____|  \___/  |_|     \___|

*/

/*
	Init server
*/
app.listen(process.env.PORT, function()
{
	console.log('[!] Example app listening on port ' + process.env.PORT +' !')

	global.mysql_con = mysql.createConnection(
	{
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DB
	});

	global.mysql_con.connect(function(err)
	{
		if(err) throw err;
		console.log("[!] Connected with database!");
	});

	
	/*
		Twilio Messaging
	*/
	twilioTick();
	
})

function twilioTick()
{
	setTimeout(function(){
		try{
			global.mysql_con.query("SELECT question.id,u.phone,u.name,question.question_id,question.user_id,question.answered_by FROM question INNER JOIN user u ON question.user_id = u.id WHERE answered_by IN (0,3) AND u.setting_whatsapp_notifications IS TRUE AND question.created_at <= DATE_SUB(NOW(), INTERVAL u.setting_whatsapp_delay MINUTE) AND (question.last_notification IS NULL OR question.last_notification <= DATE_SUB(NOW(), INTERVAL 1 HOUR))", function(err, result, fields){
				if(err)
				{
					console.log(err);
					return;
				}
				console.log("[Twilio System] Mandando: " + result.length + " perguntas");
				let lt = {};

				let h = "";

				for(let i = 0; i < result.length; i ++)
				{
					if(lt[result[i].user_id] == null)
					{
						lt[result[i].user_id] = {count: 1,phone: result[i].phone,name: result[i].name};
						
					}
					else
						lt[result[i].user_id].count = lt[result[i].user_id].count + 1;

					if(h != "")
						h += ",";

					h += result[i].id;
				}

				if(result.length > 0)
				{
					global.mysql_con.query("UPDATE question SET last_notification = NOW() WHERE id IN (" + h + ")", function(err, result, fields){});
				}

				let ltk = Object.keys(lt);

				console.log("[Twilio System] Para " + ltk.length + " usuários...");
				for(let j = 0; j < ltk.length; j ++)
				global.core.getUserInfo(ltk[j],function(user_data){
						if(user_data != null)
						{
							//Twilio send message
							client.messages.create({
							  from: 'whatsapp:+14155238886', //'+12057548870',
							  body: 'Olá ' + lt[ltk[j]].name + ", você tem " + lt[ltk[j]].count + (lt[ltk[j]].count > 1 ? " mensagens não lidas no asKate!" : " mensagem não lida no asKate!"),
							  to: 'whatsapp:+' + lt[ltk[j]].phone
							}).then(message => console.log(message.sid));
						}
					});
			});
		}
		catch(err)
		{

		}
		finally 
		{
		  twilioTick();
		}
	},60 * 1000);
}
