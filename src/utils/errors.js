class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExtractionError';
    this.statusCode = 502;
  }
}

function formatErrorResponse(error) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  return {
    statusCode,
    body: {
      success: false,
      error: {
        type: error.name || 'Error',
        message,
      },
    },
  };
}

module.exports = {
  ValidationError,
  NotFoundError,
  ExtractionError,
  formatErrorResponse,
};
