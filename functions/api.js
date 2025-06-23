// This is a Netlify Function that will act as a secure proxy to the Google AI API.
// It keeps your API key secret on the server.

exports.handler = async (event) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the data sent from the front-end (index.html)
    const body = JSON.parse(event.body);
    const { endpoint, payload } = body;

    // Get the secret API key from the Netlify environment variables.
    // We will set this up on the Netlify website later.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key is not set on the server.' }) };
    }
    
    // Determine the correct Google AI API URL based on the endpoint sent from the front-end.
    let apiUrl;
    if (endpoint === 'generateContent') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    } else if (endpoint === 'predict') {
       apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    } else {
       return { statusCode: 400, body: JSON.stringify({ error: 'Invalid API endpoint specified.' }) };
    }

    // Make the secure request from the server to the Google AI API.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
       console.error('Google AI API Error:', data);
       return { statusCode: response.status, body: JSON.stringify(data) };
    }

    // Send the response from the Google AI API back to the front-end.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal server error occurred.' }),
    };
  }
};
