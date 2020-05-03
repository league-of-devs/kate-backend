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
module.exports = {
	/*
	  ___           _                                   _ 
	 |_ _|  _ __   | |_    ___   _ __   _ __     __ _  | |
	  | |  | '_ \  | __|  / _ \ | '__| | '_ \   / _` | | |
	  | |  | | | | | |_  |  __/ | |    | | | | | (_| | | |
	 |___| |_| |_|  \__|  \___| |_|    |_| |_|  \__,_| |_|

	*/

	/*
		Get all user info from token
	*/
	getUserFromToken: function(token,callback)
	{
		global.mysql_con.query("SELECT * FROM user WHERE token='" + token + "'", function(err, result, fields)
		{
			if(err)
				return callback(null);

			if(result.length == 0)
				return callback(null);

			callback(result[0]);
		});
	},

	/*
		Get only user id from token
	*/
	getUserIdFromToken: function(token,callback)
	{
		global.mysql_con.query("SELECT id FROM user WHERE token='" + token + "'", function(err, result, fields)
		{
			if(err)
				return callback(null);

			if(result.length == 0)
				return callback(null);

			callback(result[0]);
		});
	},

	/*
		Get only user secure data from token
	*/
	getUserFromTokenSecure: function(token,callback)
	{
		global.mysql_con.query("SELECT email,name,phone,setting_whatsapp_notifications,setting_bot_autosend,setting_whatsapp_delay FROM user WHERE token='" + token + "'", function(err, result, fields)
		{
			if(err)
				return callback(null);

			if(result.length == 0)
				return callback(null);

			callback(result[0]);
		});
	},
	

	/*
		Get user info using user_id
	*/
	getUserInfo: function(user_id, callback)
	{
		global.mysql_con.query("SELECT * FROM user WHERE id='" + user_id + "'", function(err, result, fields)
		{
			if(result == null)
				callback(null);

			if(result.length == 0)
				callback(null);
			callback(result[0]);
		});
	},

	/*
		Check if platform is valid
	*/
	isValidPlataform: function(platform)
	{
		return (global.platforms[platform] != null)
	},

	/*
		Get answer from answers.json
	*/
	getAnswerFor: function(category, values)
	{
		var s = global.answers[category][Math.floor(Math.random() * global.answers[category].length)];
		var k = Object.keys(values);
		for(var n in Object.keys(values))
		{
			var i = k[n];
			s = s.replace("{" + i + "}", values[i]);
		}

		return {
			type: "message",
			text: s
		};
	},

	/*
		Get sync data using platform user id
	*/
	getSyncUsingPlatformUserId: function(platform_user_id, platform, callback)
	{
		global.mysql_con.query("SELECT token,refresh_token,user_id,TIMESTAMPDIFF(SECOND,last_refresh,NOW()) as elapsed_time FROM user_token WHERE platform_user_id='" + platform_user_id + "' AND platform='" + platform + "'", function(err, result, fields)
		{

			if(err)
				return callback(null);



			if(result.length == 0)
				return callback(null);


			if(result[0].elapsed_time > 60 * 60 * 5)
			{
				let user_id = result[0].user_id;
				//Need to renew

				if(platform == "mercado_livre")
				{
					//Get access token

					global.request.post(
						'https://api.mercadolibre.com/oauth/token?grant_type=refresh_token&client_id=' + process.env.MELI_ID + '&client_secret=' + process.env.MELI_SECRET + '&refresh_token=' + result[0].refresh_token,
						{},
						(error, resb, body) =>
						{
							if(error)
								return callback(null);

							body = JSON.parse(body);
							//Everthing is okay


							//Save meli user information
							global.mysql_con.query("SELECT id FROM user_token WHERE user_id='" + user_id + "' AND platform='mercado_livre'", function(err, resultb, fields)
							{
								if(err)
									return callback(null);

								var sql = "";
								if(resultb.length == 0)
								{
									sql = "INSERT INTO user_token VALUES (NULL," + user_id + ",'mercado_livre','" + body.access_token + "','" + body.refresh_token + "','" + body.user_id + "',NOW())";
								}
								else
								{
									sql = "UPDATE user_token SET token='" + body.access_token + "',refresh_token='" + body.refresh_token + "', platform_user_id='" + body.user_id + "', last_refresh=NOW() WHERE user_id='" + user_id + "' AND platform='mercado_livre'";
								}
								global.mysql_con.query(sql, function(err, result, fields)
								{
									if(err)
										return callback(null);
									else
										return callback(
										{
											token: body.access_token,
											user_id: user_id,
											refresh_token: body.refresh_token,
											elapsed_time: 0
										});
								});
							});

						}
					)

				}
			}
			else
				callback(result[0]);
		});
	},

	/*
		Get sync data using internal user id
	*/
	getSync: function(user_id, platform, callback)
	{
		global.mysql_con.query("SELECT token,refresh_token,platform_user_id,TIMESTAMPDIFF(SECOND,last_refresh,NOW()) as elapsed_time FROM user_token WHERE user_id='" + user_id + "' AND platform='" + platform + "'", function(err, result, fields)
		{

			if(err)
				return callback(null);



			if(result.length == 0)
				return callback(null);


			if(result[0].elapsed_time > 60 * 60 * 5)
			{
				//Need to renew

				if(platform == "mercado_livre")
				{
					//Get access token

					global.request.post(
						'https://api.mercadolibre.com/oauth/token?grant_type=refresh_token&client_id=' + process.env.MELI_ID + '&client_secret=' + process.env.MELI_SECRET + '&refresh_token=' + result[0].refresh_token,
						{},
						(error, resb, body) =>
						{
							if(error)
								return callback(null);

							body = JSON.parse(body);
							//Everthing is okay


							//Save meli user information
							global.mysql_con.query("SELECT id FROM user_token WHERE user_id='" + user_id + "' AND platform='mercado_livre'", function(err, resultb, fields)
							{
								if(err)
									return callback(null);

								var sql = "";
								if(resultb.length == 0)
								{
									sql = "INSERT INTO user_token VALUES (NULL," + user_id + ",'mercado_livre','" + body.access_token + "','" + body.refresh_token + "','" + body.user_id + "',NOW())";
								}
								else
								{
									sql = "UPDATE user_token SET token='" + body.access_token + "',refresh_token='" + body.refresh_token + "', platform_user_id='" + body.user_id + "', last_refresh=NOW() WHERE user_id='" + user_id + "' AND platform='mercado_livre'";
								}



								global.mysql_con.query(sql, function(err, result, fields)
								{
									if(err)
										return callback(null);
									else
										return callback(
										{
											token: body.access_token,
											refresh_token: body.refresh_token,
											elapsed_time: 0
										});
								});
							});

						}
					)

				}
			}
			else
				callback(result[0]);
		});
	},

	/*
		Get value with injection protection
	*/
	getValue: function(val)
	{
		if(val == null)
			return "";
		else
			//Protect from mysql injections
			return (val + "").split("'").join("\\'").split('"').join('\\"');
	},

	/*
		Answer a question (For now only supports mercado_livre)
	*/
	answerAQuestion: function(platform, question, client_name, product_id, callback)
	{
		if(platform != "mercado_livre")
			callback(null);

		global.meliObject.get('items/' + product_id, function(err, res)
		{
			//Produto
			var product = {
				id: res.id,
				title: res.title,
				payment:
				{
					price: res.price,
					base_price: res.base_price,
					currency: res.currency_id,
					accepts_mercadopago: res.accepts_mercadopago
				},
				attributes: res.attributes,
				available_quantity: res.available_quantity
			};


			//Formatar preço
			product.attributes.push(
			{
				id: "PRICE",
				value_name: new Intl.NumberFormat('pt-BR',
				{
					style: 'currency',
					currency: product.payment.currency
				}).format(product.payment.price)
			});

			//Pegar resposta
			global.watson.answer(question, client_name).then(function(value)
			{
				var data = JSON.parse(value.output.generic[0].text);
				if(data.notunderstood)
				{
					callback(
					{
						type: "couldnt_understand"
					});
				}
				else
				{
					var answer;
					//Consultar a disponibilidade do produto
					if(data.type == "availability")
					{
						if(product.available_quantity > 0)
							answer = global.core.getAnswerFor("availability_yes",
							{
								quantidade: product.available_quantity,
								cliente: client_name,
								s: product.available_quantity > 1 ? "s" : "",
								m: product.available_quantity > 1 ? "m" : "",
								is: product.available_quantity > 1 ? "is" : "l"
							});
						else
							answer = global.core.getAnswerFor("availability_no",
							{
								cliente: client_name
							});
					}
					//Consulta um dos atributos suportados
					else if(data.type == "attribute")
					{
						//Avaliar atributo
						let f = false;
						for(let i in product.attributes)
						{
							let att = product.attributes[i];
							if(att.id == data.attribute && att.value_name != null)
							{
								if(global.answers["attribute_" + att.id] != null)
									answer = global.core.getAnswerFor("attribute_" + att.id,
									{
										cliente: client_name,
										value: att.value_name,
										id: att.id,
										label: attributes_labels[att.id]
									});
								else
									answer = global.core.getAnswerFor("generic_attribute",
									{
										cliente: client_name,
										value: att.value_name,
										id: att.id,
										label: attributes_labels[att.id]
									});

								f = true;
								break;
							}
						}
						if(!f)
						{
							answer = {
								type: "attribute_not_found",
								atribute_id: data.attribute,
								label: attributes_labels[data.attribute]
							};
						}
					}
					callback(answer)
				}
			})
		});
	},


	/*
		Save bot suggestion at database
	*/
	/*
		Source:
			0 - Bot from questions
			1 - Bot from description
	*/
	saveSuggestionAtDataBase: function(platform, user_id, product_id, source, name, value, callback)
	{
		global.mysql_con.query("INSERT INTO suggestion VALUES (NULL,'" + platform + "','" + user_id + "','" + product_id + "','" + source + "','" + name + "'," + (value == null ? "NULL" : "'" + value + "'") + ",'0')", function(err, result, fields)
		{
			if(err)
				return callback(
				{
					status: "error",
					error: "internal_server_error"
				});

			return callback(
			{
				status: "success"
			});
		});
	},

	/*
		Save question at database
	*/
	saveQuestionAtDataBase: function(platform, question_id, product_id, user_id, platform_user_id, answered_by, question, answer, callback)
	{
		global.mysql_con.query("INSERT INTO question VALUES (NULL,'" + platform + "','" + question_id + "','" + product_id + "','" + user_id + "','" + platform_user_id + "'," + answered_by + ",'" + question + "'," + (answer == null ? "NULL" : "'" + answer + "'") + ",NOW()," + (answer == null || answered_by == "3" ? "NULL" : "NOW()") + ",0,'')", function(err, result, fields)
		{

			if(err)
				return callback(
				{
					status: "error",
					error: "internal_server_error"
				});

			return callback(
			{
				status: "success"
			});


		});
	},

	/*
		Update question answer at database
	*/
	updateQuestionAnswerAtDataBase: function(platform, question_id, answered_by, answer, kindness, kindness_info, callback)
	{
		global.mysql_con.query("UPDATE question SET answered_at=NOW() , answered_by='" + answered_by + "', answer = " + (answer == null ? "NULL" : "'" + answer + "'") + ",kindness='" + kindness + "',kindness_info='" + kindness_info + "' WHERE question_id='" + question_id + "' AND platform='" + platform + "'", function(err, result, fields)
		{
			if(err)
				return callback(
				{
					status: "error",
					error: "internal_server_error"
				});

			return callback(
			{
				status: "success"
			});
		});
	}

};