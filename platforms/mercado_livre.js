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
global.platforms["mercado_livre"] = {
	/*
		Auth user
	*/
	authUser: function(sync_token, res)
	{
		res.status(200).json(
		{
			status: "success",
			link: "http://auth.mercadolivre.com.br/authorization?response_type=code&client_id=" + process.env.MELI_ID + "&redirect_uri=https://test.devdavi.com.br/kate-auth?sync_token=" + sync_token + "-mercado_livre"
		});
	},

	/*
		End user auth
	*/
	endAuth: function(body, token, code, res)
	{
		//Get access token

		global.request.post(
			'https://api.mercadolibre.com/oauth/token?grant_type=authorization_code&client_id=' + process.env.MELI_ID + '&client_secret=' + process.env.MELI_SECRET + '&code=' + code + '&redirect_uri=https://test.devdavi.com.br/kate-auth?sync_token=' + token + '-mercado_livre',
			{},
			(error, resb, body) =>
			{
				if(error)
				{
					return res.send(
					{
						type: "error",
						message: "internal_server_error"
					});
				}
				body = JSON.parse(body);
				//Everthing is okay

				global.mysql_con.query("SELECT id FROM user WHERE sync_token='" + token + "'", function(err, result, fields)
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
							type: "error",
							message: "invalid_sync_token"
						});

					global.mysql_con.query("UPDATE user SET sync_token=NULL WHERE id='" + result[0].id + "'", function(err, result, fields){});


					//Save meli user information
					global.mysql_con.query("SELECT id FROM user_token WHERE user_id='" + result[0].id + "' AND platform='mercado_livre'", function(err, resultb, fields)
					{
						if(err)
							return res.send(
							{
								status: "error",
								error: "internal_server_error"
							});

						var sql = "";
						if(resultb.length == 0)
						{
							sql = "INSERT INTO user_token VALUES (NULL," + result[0].id + ",'mercado_livre','" + body.access_token + "','" + body.refresh_token + "','" + body.user_id + "',NOW())";
						}
						else
						{
							sql = "UPDATE user_token SET token='" + body.access_token + "',refresh_token='" + body.refresh_token + "', platform_user_id='" + body.user_id + "', last_refresh=NOW() WHERE user_id='" + result[0].id + "' AND platform='mercado_livre'";
						}


						global.mysql_con.query(sql, function(err, result, fields)
						{
							if(err)
								return res.send(
								{
									status: "error",
									error: "internal_server_error"
								});
							else
								return res.send(
								{
									status: "success",
									platform: "mercado_livre",
								});
						});
					});
				});
			}
		)
	},

	/*
		Do answer to question
	*/
	answerQuestion: function(question_id, answer, access_token, callback)
	{
		global.meliObject.post('answers?access_token=' + access_token,
		{
			question_id: question_id,
			text: answer
		}, function(err, resb)
		{
			callback(err);
		});
	},

	/*
		on item notification
	*/
	itemNotification: function(user_data, body)
	{

		global.meliObject.get(body.resource, function(err, res)
		{
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

			global.meliObject.get(body.resource + "/descriptions/" + res.descriptions[0].id, function(err, res)
			{
				var description = res.plain_text;
				//Try to parse
				var lines = description.split("\n");

				var possible_attributes = {};

				for(let i = 0; i < lines.length; i++)
				{
					lines[i] = lines[i].trim();


					if(lines[i].match(/^.*=.*$/gm))
					{
						var key = lines[i].split("=")[0];
						var value = lines[i].split("=")[1];
						possible_attributes[key] = value;
					}
					else if(lines[i].match(/^\(.*\):\(.*\)$/gm))
					{
						var key = lines[i].substring(1).split("):(")[0];
						var value = lines[i].substring(1).split("):(")[1];
						value = value.slice(0, -1);
						possible_attributes[key] = value;
					}
					else if(lines[i].match(/^\(.*\):.*$/gm))
					{
						var key = lines[i].substring(1).split("):")[0];
						var value = lines[i].substring(1).split("):")[1];
						possible_attributes[key] = value;
					}
					else if(lines[i].match(/^.*:\(.*\)$/gm))
					{
						var key = lines[i].split(":(")[0];
						var value = lines[i].split(":(")[1];
						value = value.slice(0, -1);
						possible_attributes[key] = value;

					}
					else if(lines[i].match(/^.*\(.*\)$/gm))
					{
						var key = lines[i].split("(")[0];
						var value = lines[i].split("(")[1];
						value = value.slice(0, -1);
						possible_attributes[key] = value;
					}
					else if(lines[i].match(/^\(.*\).*$/gm))
					{
						var key = lines[i].substring(1).split(")")[0];
						var value = lines[i].substring(1).split(")")[1];
						possible_attributes[key] = value;
					}
					else if(lines[i].match(/^.*:.*$/gm))
					{
						var key = lines[i].split(":")[0];
						var value = lines[i].split(":")[1];
						possible_attributes[key] = value;
					}

				}

				var ks = {};
				//Found attributes

				{
					var s = "";
					for(let i in product.attributes)
					{
						let att = product.attributes[i];
						if(att.value_name != null)
						{
							s += (s == "" ? "" : ",") + "'" + att.id + "'";
							ks[att.id] = att.value_name;
						}
					}

					if(s != " ")
						mysql_con.query("UPDATE suggestion SET solved=1 WHERE name IN (" + s + ") AND product_id='" + product.id + "' AND platform='mercado_livre'", function(err, result, fields) {

						});
				}


				let keys = Object.keys(possible_attributes);

				mysql_con.query("DELETE FROM suggestion WHERE product_id='" + product.id + "'AND platform='mercado_livre' AND source=1", function(err, result, fields)
				{
					for(let i = 0; i < keys.length; i++)
					{
						//Check suggetions with watson

						let k = keys[i].trim();
						let v = possible_attributes[keys[i]].trim();
						watson.answer("%internal% " + k + " %internal%", "").then(function(value)
						{
							var data = JSON.parse(value.output.generic[0].text);


							if(data.type != null)
								if(data.type == "attribute" && ks[data.attribute] == null)
								{
									global.core.saveSuggestionAtDataBase("mercado_livre", user_data.user_id, product.id, 0, data.attribute, v, function(res) {});
								}

						});
					}
				});



			});
		});
	},

	/*
		Get products for user
	*/
	getProducts: function(user_id, callback)
	{
		global.core.getSync(user_id, "mercado_livre", function(c)
		{
			if(c != null)
				global.meliObject.get("users/" + c.platform_user_id + "/items/search?access_token=" + c.token, function(err, res)
				{
					let prods = res.results;
					let prods_c = 0;

					let prod_array = [];

					for(let i = 0; i < prods.length; i++)
					{
						global.meliObject.get('items/' + prods[i], function(err, ires)
						{
							var product = {
								id: prods[i],
								title: ires.title,
								platform: "mercado_livre",
								price: ires.price,
								base_price: ires.base_price,
								picture: ires.pictures[0].url
							};

							prod_array.push(product);

							prods_c++;

							if(prods_c == prods.length)
							{
								callback(prod_array);
							}
						});
					}

					if(prods.length == 0)
					{
						callback([]);
					}
				})
		})
	},

	/*
		Get full product info
	*/
	getProduct: function(user_id, product, resb)
	{
		global.core.getSync(user_id, "mercado_livre", function(c)
		{
			if(c != null)
			{
				global.meliObject.get('items/' + product, function(err, res)
				{
					if(res.error != null)
						return resb.send(
						{
							status: "error",
							error: "invalid_item"
						});

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
						pictures: res.pictures,
						attributes: res.attributes,
						available_quantity: res.available_quantity,
						user_kindness_level: 0,
						suggestions: [],
					};

					global.meliObject.get('items/' + product.id + "/descriptions/" + res.descriptions[0].id, function(err, res)
					{
						var description = res.plain_text;

						product.description = description;

						let attributes = {};
						for(let i = 0; i < product.attributes.length; i++)
						{
							attributes[product.attributes[i].name] = product.attributes[i].value_name;
						}
						product.attributes = attributes;


						//Get questions for product
						global.mysql_con.query("SELECT question_id,answered_by,question,answer,pattern,created_at,UNIX_TIMESTAMP(created_at) as created_at_ms,answered_at,UNIX_TIMESTAMP(answered_at) as answered_at_ms,id,kindness,kindness_info FROM question WHERE product_id='" + product.id + "' AND platform='mercado_livre'", function(err, result, fields)
						{
							let pid = {};

							let kindness_sum = 0;
							let kindness_amount = 0;

							let types = {};

							for(let i = 0; i < result.length; i++)
							{
								var answered = true;
								if(result[i].answered_by == "1")
								{
									result[i].answered_by = "user"
									kindness_amount++;
									kindness_sum += parseFloat(result[i].kindness);
								}
								else if(result[i].answered_by == "2")
									result[i].answered_by = "kate"
								else if(result[i].answered_by == "3")
								{
									result[i].answered_by = "waiting_confirmation"
									answered = false;
								}
								else
								{
									answered = false;
								}

								if(result[i].pattern != null)
								{
									if(types[result[i].pattern] ==  null)
										types[result[i].pattern] = 1;
									else
										types[result[i].pattern] += 1;
								}

								result[i].kindness_info = {
									greetings: result[i].kindness_info.includes("H"),
									bye: result[i].kindness_info.includes("B")
								}

								result[i].delay = result[i].answered_at_ms - result[i].created_at_ms;

								delete result[i].answered_at_ms;
								delete result[i].created_at_ms;

								result[i].answered = answered;
								pid[result[i].question_id] = i;
								delete result[i].question_id;
							}

							for(let i = 0; i < result.length; i++)
							{
								if(result[i].pattern != null)
								{		
									result[i].equals_questions = types[result[i].pattern] - 1;					
									result[i].pattern = global.attributes_labels[result[i].pattern];
								}
								else
								{
									result[i].equals_questions = 0;		
								}
							}

							product.questions = result;
							product.user_kindness_level = kindness_amount == 0 ? 1 : kindness_sum / kindness_amount;

							//Get suggestions for product 
							global.mysql_con.query("SELECT source,name,value,id FROM suggestion WHERE solved=0 AND product_id='" + product.id + "' AND platform='mercado_livre'", function(err, result, fields)
							{
								let desc_suggestion = [];

								for(let i = 0; i < result.length; i++)
								{
									result[i].name = global.attributes_labels[result[i].name];

									if(result[i].source == "0")
										desc_suggestion.push(result[i]);
									else
										if(product.questions[pid[result[i].source]] != null)
											product.questions[pid[result[i].source]].suggestion = result[i];
								}
								product.attribute_suggestions = desc_suggestion;

								//Add kindness level for product
								resb.send(product);
							});
						});




					});
				});
			}
		});
	},

	/*
		Accept suggestion
	*/
	acceptSuggestion: function(user_id, suggestion, value, ires)
	{
		global.core.getSync(user_id, "mercado_livre", function(c)
		{
			global.meliObject.get('items/' + suggestion.product_id, function(err, res)
			{

				res.attributes.push(
				{
					"id": suggestion.name,
					"value_name": value
				});


				global.meliObject.put('items/' + suggestion.product_id + "?access_token=" + c.token,
				{
					attributes: res.attributes
				}, function(err, res)
				{
					ires.send(res);
				});
			});
		});
	}

}