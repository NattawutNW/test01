const ALLOWED_ACTIONS = new Set([
  'load', 'save', 'uploadLogo', 'uploadProfile', 'uploadScan'
]);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  const endpoint = process.env.QUIZ_APPS_SCRIPT_URL;
  const secret = process.env.QUIZ_BRIDGE_SECRET;
  if (!endpoint || !secret) {
    return res.status(503).json({ ok: false, error: 'QuizSuite Google backend is not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !ALLOWED_ACTIONS.has(body.action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action' });
    }
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, action: body.action, payload: body.payload ?? null }),
      redirect: 'follow'
    });
    const result = await upstream.json();
    if (!upstream.ok || !result.ok) {
      return res.status(502).json({ ok: false, error: result.error || 'Google Apps Script request failed' });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('QuizSuite Google bridge:', error);
    return res.status(502).json({ ok: false, error: 'Could not reach Google Apps Script' });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '9mb' } }
};
