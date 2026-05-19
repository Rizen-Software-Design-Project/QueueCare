
// These are just error hadling middleware for Express. They catch any errors thrown in the route handlers, they catch an error and return it if soemthing went wrong
// There are written seperately for reusability and readability 
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({ error: message });
};

export default errorHandler;
