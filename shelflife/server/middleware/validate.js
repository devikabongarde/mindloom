module.exports = function(fields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (!req.body[field]) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({ msg: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
};
