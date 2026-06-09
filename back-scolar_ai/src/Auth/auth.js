// const jwt = require('jsonwebtoken');
// const privatekey = require('../Auth/private_key');

// // Middleware d'authentification de base
// const auth = (req, res, next) => {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//         return res.status(401).json({ 
//             success: false,
//             message: 'Token manquant' 
//         });
//     }

//     try {
//         const decoded = jwt.verify(token, privatekey);
//         req.user = decoded;
//         next();
//     } catch (error) {
//         res.status(401).json({ 
//             success: false,
//             message: 'Token invalide ou expiré' 
//         });
//     }
// };

// // Middleware de contrôle des rôles
// const requireRole = (allowedRoles) => {
//     return (req, res, next) => {
//         if (!req.user) {
//             return res.status(401).json({ 
//                 success: false,
//                 message: 'Authentification requise' 
//             });
//         }

//         if (!allowedRoles.includes(req.user.role)) {
//             return res.status(403).json({ 
//                 success: false,
//                 message: `Accès refusé. Rôle ${req.user.role} non autorisé.` 
//             });
//         }
//         next();
//     };
// };

// // Middleware de vérification des permissions
// const requirePermission = (permission) => {
//     return (req, res, next) => {
//         if (!req.user?.permissions?.includes(permission)) {
//             return res.status(403).json({ 
//                 success: false,
//                 message: `Permission ${permission} requise` 
//             });
//         }
//         next();
//     };
// };

// module.exports = { auth, requireRole, requirePermission };


const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
// const logger    = require('./logger');
const privatekey = require('../Auth/private_key');

// À la place de: const logger = require('./logger');
const logger = {
    info:  (msg, meta = '') => console.log(`[INFO] ${msg}`, meta),
    warn:  (msg, meta = '') => console.warn(`\x1b[33m[WARN] ${msg}\x1b[0m`, meta), // En jaune
    error: (msg, meta = '') => console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`, meta) // En rouge
};

// ─── Validation au démarrage ────────────────────────────────────────────────────
if (!privatekey || privatekey.length < 32) {
    throw new Error('[Auth] Clé privée manquante ou trop courte');
}

const IS_PROD = process.env.NODE_ENV === 'production';

const JWT_OPTIONS = {
    algorithms: ['HS256'],
    issuer:     process.env.JWT_ISSUER,
    audience:   process.env.JWT_AUDIENCE,
};

// ─── Rate limiter ───────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Trop de tentatives, réessayez plus tard' }
});

// ─── Constantes d'erreurs ───────────────────────────────────────────────────────
const AUTH_ERRORS = {
    MISSING_TOKEN: { status: 401, message: 'Token manquant'           },
    INVALID_TOKEN: { status: 401, message: 'Token invalide ou expiré' },
    AUTH_REQUIRED: { status: 401, message: 'Authentification requise' },
    ROLE_DENIED:   { status: 403, message: 'Accès refusé'             },
    PERM_REQUIRED: { status: 403, message: 'Permission requise'       },
};

const sendError = (res, errorKey, extra = '') => {
    const { status, message } = AUTH_ERRORS[errorKey];
    return res.status(status).json({
        success: false,
        message: extra ? `${message} : ${extra}` : message,
    });
};

const extractToken = (req) => {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token || null;
};

// ─── Middleware : auth ──────────────────────────────────────────────────────────
const auth = async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return sendError(res, 'MISSING_TOKEN');

    try {
        // Vérification blacklist (si Redis disponible)
        // const isRevoked = await redisClient.get(`blacklist:${token}`);
        // if (isRevoked) return sendError(res, 'INVALID_TOKEN');

        const decoded = jwt.verify(token, privatekey, JWT_OPTIONS);
        req.user = Object.freeze(decoded);
        next();
    } catch (error) {
        logger.warn('[Auth] Token rejeté', {
            ip: req.ip,
            reason: error.name,
            path: req.path,
            timestamp: new Date().toISOString()
        });

        const detail = IS_PROD
            ? ''
            : error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide';

        return sendError(res, 'INVALID_TOKEN', detail);
    }
};

// ─── Middleware : requireRole ───────────────────────────────────────────────────
const requireRole = (...allowedRoles) => {
    const rolesSet = new Set(allowedRoles);
    return (req, res, next) => {
        if (!req.user) return sendError(res, 'AUTH_REQUIRED');
        if (!rolesSet.has(req.user.role))
            return sendError(res, 'ROLE_DENIED', IS_PROD ? '' : `rôle "${req.user.role}" non autorisé`);
        next();
    };
};

// ─── Middleware : requirePermission ─────────────────────────────────────────────
const requirePermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) return sendError(res, 'AUTH_REQUIRED');
        const userPerms = new Set(Array.from(req.user.permissions ?? []));
        const missing   = permissions.filter(p => !userPerms.has(p));
        if (missing.length)
            return sendError(res, 'PERM_REQUIRED', IS_PROD ? '' : missing.join(', '));
        next();
    };
};

module.exports = { auth, requireRole, requirePermission, authLimiter };