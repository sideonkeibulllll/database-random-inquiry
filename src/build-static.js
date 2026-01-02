import { DatabaseManager } from './utils/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file if available
import dotenv from 'dotenv';
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Loaded environment variables from .env file');
  console.log('DB_A_URL:', process.env.DB_A_URL);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../static');

class StaticPageGenerator {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.dbConfigs = this.dbManager.dbConfigs;
  }

  // Create directory if it doesn't exist
  async ensureDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
      await fs.promises.mkdir(directoryPath, { recursive: true });
      console.log(`Created directory: ${directoryPath}`);
    }
  }

  // Generate HTML page with data block
  generatePage(data, databaseAbbr, pageNumber = null) {
    const title = pageNumber 
      ? `${databaseAbbr} - Page ${pageNumber}` 
      : `${databaseAbbr} - Overview`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #333;
        }
        .data-section {
            background: #f5f5f5;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        pre {
            background: #fff;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow-x: auto;
        }
        .page-links {
            margin: 20px 0;
        }
        .page-link {
            display: inline-block;
            margin: 5px;
            padding: 8px 12px;
            background: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        .page-link:hover {
            background: #0051bb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="data-section">
            <h2>Data</h2>
            <!-- DATA_START -->
            <pre>${JSON.stringify(data, null, 2)}</pre>
            <!-- DATA_END -->
        </div>
        
        ${pageNumber ? `
        <div class="page-links">
            <a href="../${databaseAbbr}.html" class="page-link">Back to Overview</a>
            ${pageNumber > 1 ? `<a href="${databaseAbbr}-${pageNumber - 1}.html" class="page-link">Previous Page</a>` : ''}
            ${pageNumber < 100 ? `<a href="${databaseAbbr}-${pageNumber + 1}.html" class="page-link">Next Page</a>` : ''}
        </div>
        ` : `
        <div class="page-links">
            <h2>Pages</h2>
            ${Array.from({ length: 100 }, (_, i) => i + 1).map(page => 
                `<a href="pages/${databaseAbbr}-${page}.html" class="page-link">Page ${page}</a>`
            ).join('')}
        </div>
        `}
    </div>
</body>
</html>`;
  }

  // Generate static pages for all databases
  async generateAllPages() {
    // Create output directory
    await this.ensureDirectory(outputDir);

    // Iterate through all database configurations
    for (const [abbr, config] of Object.entries(this.dbConfigs)) {
      console.log(`Generating pages for database: ${abbr}`);
      
      // Create directory for this database
      const dbDir = path.join(outputDir, abbr);
      const pagesDir = path.join(dbDir, 'pages');
      await this.ensureDirectory(pagesDir);
      
      // Generate overview page (二级页面)
      const overviewData = {
        database: abbr,
        type: config.type,
        description: `Overview page for ${abbr} database`,
        totalPages: 100
      };
      const overviewHtml = this.generatePage(overviewData, abbr);
      const overviewPath = path.join(outputDir, `${abbr}.html`);
      await fs.promises.writeFile(overviewPath, overviewHtml);
      console.log(`Generated overview page: ${overviewPath}`);
      
      // Generate 100 data pages (三级页面)
      for (let i = 1; i <= 100; i++) {
        try {
          // Get random data from database
          const randomData = await this.dbManager.getRandomData(abbr, 10);
          
          // Generate page with data
          const pageHtml = this.generatePage(randomData, abbr, i);
          const pagePath = path.join(pagesDir, `${abbr}-${i}.html`);
          
          // Write page to file
          await fs.promises.writeFile(pagePath, pageHtml);
          console.log(`Generated page ${i}/100 for ${abbr}: ${pagePath}`);
        } catch (error) {
          console.error(`Error generating page ${i} for ${abbr}:`, error.message);
        }
      }
      
      console.log(`Completed generating pages for database: ${abbr}`);
    }
    
    console.log('All static pages generated successfully!');
  }
}

// Run the generator
async function main() {
  try {
    const generator = new StaticPageGenerator();
    await generator.generateAllPages();
    
    // Close all database connections
    await generator.dbManager.closeAllConnections();
    
    console.log('Build process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating static pages:', error);
    process.exit(1);
  }
}

main();
