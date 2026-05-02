"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnership = requireOwnership;
function requireOwnership(ownerField = 'owner_user_id') {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        if (user.is_super_admin === true) {
            next();
            return;
        }
        req.ownershipField = ownerField;
        req.requestingUserId = user.userId || user.id;
        next();
    };
}
//# sourceMappingURL=require-ownership.js.map