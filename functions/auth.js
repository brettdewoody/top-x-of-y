import fetch from 'node-fetch'

exports.handler = function(event) {
  const postData = new URLSearchParams()
  postData.append('client_id', process.env.API_APP_ID)
  postData.append('client_secret', process.env.API_APP_SECRET)
  postData.append('code', event.queryStringParameters.code)
  postData.append('grant_type', 'authorization_code')
  postData.append('redirect_uri', `${process.env.URL}/.netlify/functions/auth`)

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: postData
  }

  console.log({options})

  return fetch(`${process.env.API_BASE}/oauth/access_token`, options)
    .then((response) => response.json())
    .then((result) => {
      console.log(result)
      
      return ({
        statusCode: 302,
        headers: {
          Location: `${process.env.URL}/?token=${result.access_token}`
        }
      })
    })
    .catch(function (err) {
      console.log("Unable to fetch -", err);
    })
}
