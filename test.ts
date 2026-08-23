import { getLatest } from 'tu-scraper';
async function main() {
  const sources = ['iof', 'foe', 'fol', 'iom', 'iaas'];
  for (const src of sources) {
    try {
      const notice = await getLatest(src as any);
      console.log(`[${src.toUpperCase()}] Title:`, notice?.title);
      console.log(`[${src.toUpperCase()}] Content:`, notice?.content?.substring(0, 50));
      console.log(`[${src.toUpperCase()}] URL:`, notice?.url);
      console.log(`[${src.toUpperCase()}] PDF:`, notice?.pdf);
    } catch(e) {
      console.log(`[${src.toUpperCase()}] Error`);
    }
  }
}
main();
