// Diagnostic-only entrypoint: confirms whether Vercel routes requests into this file.
// No imports, secrets, or database access.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ status: 'diagnostic-entrypoint', path: req.url }));
};
