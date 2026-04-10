import fs from 'fs';
import path from 'path';

const pages = [
  'dashboard/page.tsx',
  'users/page.tsx',
  'courses/page.tsx',
  'certificates/page.tsx',
  'compliance/page.tsx',
  'feedback/page.tsx',
  'announcements/page.tsx',
  'reports/page.tsx',
  'profile/page.tsx'
];

pages.forEach(p => {
  const filePath = path.join(process.cwd(), 'app', 'admin', p);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing ${p}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  content = content.replace(/import AdminLayout from ['"]@\/components\/admin\/layout\/AdminLayout['"];?\n?/, '');
  
  content = content.replace(/<AdminLayout>\s*/g, '');
  content = content.replace(/\s*<\/AdminLayout>/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`Cleaned ${p}`);
});
console.log('Done cleaning AdminLayout wrappers.');
