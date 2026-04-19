export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  try {
    const { type, system, userMsg, prompt, base64, mediaType } = req.body;

    let messages;

    if (type === 'vision') {
      // Vision request — image + text
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ];
    } else {
      // Standard text request
      messages = [
        {
          role: 'user',
          content: userMsg
        }
      ];
    }

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages
    };

    // Add system prompt for text requests
    if (type !== 'vision' && system) {
      body.system = system;
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await anthropicRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const text = data.content.map(b => b.text || '').join('');
    return res.status(200).json({ text });

  } catch (err) {
    console.error('API route error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
