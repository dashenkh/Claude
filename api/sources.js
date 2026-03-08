const { SOURCES } = require('../scraper');

module.exports = async function handler(req, res) {
  res.json(
    SOURCES.map((s) => ({
      name: s.name,
      url: s.url,
      category: s.category,
    }))
  );
};
