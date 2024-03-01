const admin = require("firebase-admin");


const auth = async (req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: 'Missing API key'
        });
        return
    }

    const usersSnap = await admin.firestore().collection('users').where('apikey', '==', apiKey).get();

    if (usersSnap.size !== 1) {
        res.status(403).json({
            success: false,
            error: 'Invalid API key'
        });
        return
    }
    const userData = usersSnap.docs[0].data();
    
    if (userData.disabled) {
        res.status(401).json({
            success: false,
            error: 'User disabled'
        });
        return
    }

    req.body.user_data = {
        id: usersSnap.docs[0].id,
    }

    if (req.body.session_id) {
        const sessionDoc = await admin.firestore().collection('users').doc(usersSnap.docs[0].id).collection('sessions').doc(req.body.session_id).get();
        if (!sessionDoc.exists) {
            res.status(403).json({
                success: false,
                error: 'Session do not exist'
            });
            return
        }

        const session_data = sessionDoc.data();
        const now = new Date();
        if (session_data.expires_at.toDate() < now) {
            res.status(410).json({
                success: false,
                error: 'Session is expired'
            });
            return
        }

        var resp = await fetch(session_data.cookies);

        if (!resp.ok) {
            res.status(410).json({
                success: false,
                error: 'Could not fetch session cookies'
            });
            return
        }

        var cookies = await resp.json();

        req.body.session_data = {
            id: sessionDoc.id,
            cookies_data: cookies,
            ...session_data
        }
    }

    next();
}

exports.auth = auth