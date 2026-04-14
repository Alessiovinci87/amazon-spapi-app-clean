// backend_v2/middleware/validate.js
// Middleware factory per validazione input con Zod.
// Uso: router.post("/x", validate({ body: schema }), handler)

const { ZodError } = require("zod");

function formatZodError(err) {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}

/**
 * Factory middleware di validazione.
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          message: "Dati non validi.",
          errors: formatZodError(err),
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };
