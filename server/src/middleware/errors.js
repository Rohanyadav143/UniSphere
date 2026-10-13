export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(_request, _response, next) {
  next(new ApiError(404, "Resource not found"));
}

export function errorHandler(error, _request, response, _next) {
  if (error?.type === "entity.parse.failed") {
    response.status(400).json({ success: false, message: "Request body must be valid JSON." });
    return;
  }
  if (error?.code === 11000) {
    response.status(409).json({ success: false, message: "That slug or email is already in use." });
    return;
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    response.status(400).json({ success: false, message: "Please check the submitted information." });
    return;
  }
  const status = error instanceof ApiError ? error.status : error?.status >= 400 && error?.status < 500 ? error.status : 500;
  if (status >= 500) console.error("Request failed:", error);
  response.status(status).json({
    success: false,
    message: status >= 500 ? "Something went wrong. Please try again." : error.message
  });
}
