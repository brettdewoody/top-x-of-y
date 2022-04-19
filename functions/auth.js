const querystring = require('querystring')
const https = require('https')

exports.handler = function(event, context, callback) {
  const postData = querystring.stringify({
    client_id: process.env.API_APP_ID,
    client_secret: process.env.API_APP_SECRET,
    code: event.queryStringParameters.code,
    grant_type: 'authorization_code',
    fields: 'id,media_url',
    redirect_uri: `${process.env.URL.replace('http', 'https')}/`
  })

  const options = {
    host: process.env.API_BASE,
    port: 443,
    path: '/oauth/access_token',
    method: 'POST',
    headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'Content-Length': postData.length
       }
  }
  
  var req = https.request(options, (res) => {
    let data = ''

    res.on('data', (d) => {
      data += d 
    })

    res.on('end', () => {
      callback(null, {
        statusCode: 200,
        body: data
      })
    })

  })
  
  req.on('error', (e) => {
    console.error(e)
    callback(null, {
      statusCode: 500
    })
  })

  req.write(postData)
  req.end()
}
