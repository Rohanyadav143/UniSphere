import { ApiError } from "./errors.js";

export function validate(schema, source = "body") {
  return (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      const issue = result.error.issues[0];
      return next(new ApiError(400, issue?.message || "Please check the submitted information."));
    }
    request[source] = result.data;
    next();
  };
}
