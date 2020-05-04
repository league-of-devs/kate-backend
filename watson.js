const AssistantV2 = require('ibm-watson/assistant/v2')
const { IamAuthenticator } = require('ibm-watson/auth')
require('dotenv').config();

const assistant = new AssistantV2({
  authenticator: new IamAuthenticator({ apikey: process.env.WATSON_API_KEY }),
  url: process.env.WATSON_URL,
  version: new Date().toISOString().slice(0,10)
});

var session_id;
var assistantId = process.env.WATSON_ID;

module.exports = {
  forceNewSession: function()
  {
    session_id = null;
  },

  answer: async (texto,nome_do_cliente) => 
  {
    //Create session if not exists
    if(session_id == null)
    {
      session = await assistant.createSession({
            assistantId
      })
      session_id = session.result.session_id;
    }

    //console.log(assistant);
    //Get message from bot
    const message = await assistant.message(
    {
      input: { text: texto},
      context:
      {
        skills:
        {
          "main skill":
          {
            user_defined:
            {
              //Variables
              client_name: nome_do_cliente
            }
          }
        }
      },
      assistantId: assistantId,
      sessionId: session_id,
    });

     return message.result;
  }
}