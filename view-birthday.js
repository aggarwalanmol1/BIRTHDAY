import { get } from '@vercel/blob';
import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 310000, 32, 'sha256');
}

async function readBlob(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed.' });
  try {
    const slug = String(req.body?.slug || '');
    const password = String(req.body?.password || '');
    if (!/^[a-f0-9]{14}$/.test(slug)) return json(res, 400, { success: false, error: 'Invalid birthday link.' });
    if (!password) return json(res, 400, { success: false, error: 'Please enter your password.' });

    const recordBytes = await readBlob(`birthday-records/${slug}.json`);
    if (!recordBytes) return json(res, 404, { success: false, error: 'This birthday link does not exist.' });
    const record = JSON.parse(recordBytes.toString('utf8'));
    const expected = Buffer.from(record.passwordHash, 'hex');
    const actual = hashPassword(password, record.passwordSalt);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return json(res, 401, { success: false, error: 'Incorrect password! Try again.' });
    }

    const photos = [];
    for (const pathname of (record.photoPaths || []).slice(0, 4)) {
      const bytes = await readBlob(pathname);
      if (bytes) {
        const extension = pathname.split('.').pop().toLowerCase();
        const mime = extension === 'jpg' ? 'jpeg' : extension;
        photos.push(`data:image/${mime};base64,${bytes.toString('base64')}`);
      }
    }

    return json(res, 200, {
      success: true,
      birthday: {
        name: record.name,
        traits: record.traits,
        message: record.message,
        sender: record.sender,
        theme: record.theme,
        photos
      }
    });
  } catch (error) {
    console.error('view-birthday error:', error);
    return json(res, 500, { success: false, error: 'Could not open this birthday surprise. Please try again.' });
  }
}
