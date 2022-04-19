exports.handler = function(event, context, callback) {
  const postData = new URLSearchParams({
    client_id: process.env.API_APP_ID,
    client_secret: process.env.API_APP_SECRET,
    code: event.queryStringParameters.code,
    grant_type: 'authorization_code',
    redirect_uri: `${process.env.URL.replace('http', 'https')}/`
  })

  const options = {
    method: 'POST',
    body: JSON.stringify(postData)
  }

  return fetch(`${process.env.API_BASE}/oauth/access_token`, options)
    .then((response) => {
      // Do something with response
      console.log(response)

      return ({
        statusCode: 200,
        body: JSON.stringify(response)
      })
    })
    .catch(function (err) {
      console.log("Unable to fetch -", err);
    })
}
