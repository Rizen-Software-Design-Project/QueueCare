// Same as in the previous file, what is special here is that catch error for when a route is not found, this is important to have as it stops the server from hanging when a user tries to access a route that does not exist and it also gives them a nice error message instead of just a blank page or a some weird or random   error
const notFound = (req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
};

export default notFound;
