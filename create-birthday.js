import { put } from '@vercel/blob';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed.' });
  try {
    const configuredPassword = process.env.CREATOR_PASSWORD;
    if (!configuredPassword) return json(res, 500, { success: false, error: 'Creator password is not configured in Vercel yet.' });

    const body = req.body || {};
    const supplied = String(body.creatorPassword || '');
    const a = Buffer.from(supplied);
    const b = Buffer.from(configuredPassword);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return json(res, 401, { success: false, error: 'Your creator password is incorrect.' });
    }

    const name = String(body.name || '').trim().slice(0, 80);
    const password = String(body.password || '');
    const traits = Array.isArray(body.traits) ? body.traits.slice(0, 4).map(x => String(x).slice(0, 120)) : [];
    const photos = Array.isArray(body.photos) ? body.photos : [];
    if (!name) return json(res, 400, { success: false, error: 'Birthday name is required.' });
    if (password.length < 8 || password.length > 100) return json(res, 400, { success: false, error: 'Viewing password must be at least 8 characters.' });
    if (photos.length > 4) return json(res, 400, { success: false, error: 'You can upload a maximum of 4 photos.' });
    if (JSON.stringify(body).length > 3900000) return json(res, 413, { success: false, error: 'The photos are too large. Please select smaller images.' });

    const slug = randomBytes(7).toString('hex');
    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const photoPaths = [];

    for (let i = 0; i < photos.length; i++) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(photos[i]));
      if (!match) return json(res, 400, { success: false, error: 'One of the uploaded photos has an unsupported format.' });
      const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (!buffer.length || buffer.length > 600000) return json(res, 400, { success: false, error: 'A photo is too large after compression.' });
      const pathname = `birthday-photos/${slug}/${i + 1}.${extension}`;
      await put(pathname, buffer, { access: 'private', contentType: `image/${match[1]}`, addRandomSuffix: false });
      photoPaths.push(pathname);
    }

    const record = {
      slug,
      name,
      passwordSalt: salt,
      passwordHash,
      traits,
      message: String(body.message || '').slice(0, 3000),
      sender: String(body.sender || 'Your Best Friend').slice(0, 100),
      theme: ['pink', 'purple', 'blue', 'dark'].includes(body.theme) ? body.theme : 'pink',
      photoPaths,
      createdAt: new Date().toISOString()
    };
    await put(`birthday-records/${slug}.json`, JSON.stringify(record), {
      access: 'private', contentType: 'application/json', addRandomSuffix: false
    });

    return json(res, 200, { success: true, slug });
  } catch (error) {
    console.error('create-birthday error:', error);
    return json(res, 500, { success: false, error: 'Something went wrong while saving. Check that your Vercel Blob store is connected.' });
  }
}
