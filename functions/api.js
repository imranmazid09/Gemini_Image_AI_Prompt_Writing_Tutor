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
    let requestPayload = payload;
    if (endpoint === 'generateContent') {
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
      payload.generationConfig = {
        ...payload.generationConfig,
        thinkingConfig: { thinkingLevel: 'low' },
      };
    } else if (endpoint === 'predict') {
      const prompt = payload?.instances?.[0]?.prompt;
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return { statusCode: 400, body: JSON.stringify({ error: 'An image prompt is required.' }) };
      }

      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent';
      requestPayload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      };
    } else {
       return { statusCode: 400, body: JSON.stringify({ error: 'Invalid API endpoint specified.' }) };
    }

    // Make the secure request from the server to the Google AI API.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await response.json();
    
    if (!response.ok) {
       console.error('Google AI API Error:', data);
       return { statusCode: response.status, body: JSON.stringify(data) };
    }

    // Preserve the response shape expected by the image preview.
    if (endpoint === 'predict') {
      const image = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
      if (!image) {
        return { statusCode: 422, body: JSON.stringify({ error: 'The image model returned no preview.' }) };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: [{ bytesBase64Encoded: image.data }] }),
      };
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
