const jwt = require('jsonwebtoken');
function verifyToken(req, res, next) {
    // console.log(req);
    const token = req.header('Authorization');
    // console.log(token);
    if (!token) return res.status(401).json({ error: 'Access denied, Register to continue' });
    try {
        const decoded = jwt.verify(token.split(" ")[1], 'jwt-secret-key');
        console.log(decoded);
        req.username = decoded.username;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;