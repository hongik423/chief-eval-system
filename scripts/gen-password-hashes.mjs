#!/usr/bin/env node
import bcrypt from 'bcryptjs'; // eslint-disable-line
const names = ['나동환', '권영도', '권오경', '김홍', '박성현', '윤덕상', '하상현'];
for (const name of names) {
  const hash = bcrypt.hashSync(name, 10);
  console.log(`  ('${name}'): '${hash}',`);
}
