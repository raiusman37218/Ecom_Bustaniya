const fs = require('fs');
const crypto = require('crypto');

const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).reduce((acc, l) => {
  const [k, ...v] = l.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const secret = env.ADMIN_SESSION_SECRET;
const payload = Buffer.from(JSON.stringify({
  createdAt: Date.now(),
  userId: 'e65851f8-9073-43b5-bdc2-a7be62e58805',
  role: 'Owner',
  permissions: ['dashboard', 'orders', 'orders.export', 'products', 'inventory', 'customers', 'settings', 'users']
})).toString('base64url');

const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
const cookieVal = payload + '.' + sig;

fs.writeFileSync('scratch/cookie.txt', cookieVal);
console.log('Cookie generated successfully and saved to scratch/cookie.txt');
