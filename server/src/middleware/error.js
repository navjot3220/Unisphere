export function notFound(req, res) {
  res.status(404).json({ error: "Route not found." });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.code === 11000) {
    return res.status(409).json({ error: "That already exists." });
  }
  if (err.name === "ZodError") {
    return res.status(400).json({ error: err.errors?.[0]?.message || "Invalid input." });
  }
  console.error("[error]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
}
