import { generateShelfPDF } from './services/pdf.service.js';

// Test PDF generation
const testShelf = {
  _id: 'test123',
  name: 'Test Shelf'
};

const testLinks = [
  {
    title: 'Sample Link 1',
    url: 'https://example.com/1',
    subject: 'Testing',
    topic: 'PDF Generation',
    summary: 'This is a test link to verify PDF generation works correctly.',
    vibes: ['Educational', 'HighSignal'],
    status: 'fresh'
  },
  {
    title: 'Sample Link 2',
    url: 'https://example.com/2',
    subject: 'Testing',
    topic: 'WhatsApp Bot',
    summary: 'Another test link for the WhatsApp command bot implementation.',
    vibes: ['Chaotic'],
    status: 'aging'
  }
];

console.log('Testing PDF generation...');

generateShelfPDF(testShelf, testLinks, null)
  .then(({ fileName, filePath }) => {
    console.log('✅ PDF generated successfully!');
    console.log('File name:', fileName);
    console.log('File path:', filePath);
    console.log('\nYou can access it at: http://localhost:5000/static/pdfs/' + fileName);
  })
  .catch((err) => {
    console.error('❌ PDF generation failed:', err.message);
  });
