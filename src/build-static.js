import { DatabaseManager } from './utils/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file if available
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../public');

class StaticPageGenerator {
  constructor() {
    this.dbManager = new DatabaseManager();
    // Load configs immediately
    this.dbConfigs = this.dbManager.loadDbConfigs();
  }

  // Create directory if it doesn't exist
  async ensureDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
      await fs.promises.mkdir(directoryPath, { recursive: true });
      console.log(`Created directory: ${directoryPath}`);
    }
  }

  // Generate HTML page with data block
  generatePage(data, databaseAbbr) {
    const title = `${databaseAbbr} - Random Data`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!-- Disable browser caching -->
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
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
        .refresh-button {
            background: #0070f3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        .refresh-button:hover {
            background: #0051bb;
        }
        .note {
            background: #e8f0fe;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #0070f3;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        
        <div class="note">
            <p>📋 This page displays 10 random data items from a pool of up to 200 items. Click the refresh button to see different random items.</p>
        </div>
        
        <div class="data-section">
            <h2>Random Data</h2>
            <button class="refresh-button" onclick="refreshRandomData()">🔄 Refresh Random Data</button>
            <div style="margin-top: 20px;">
                <!-- RANDOM_DATA_START -->
                <pre id="randomData"></pre>
                <!-- RANDOM_DATA_END -->
            </div>
        </div>
    </div>
    
    <script>
        // Pre-loaded data from the database
        const allData = ${JSON.stringify(data, null, 2)};
        
        // Function to generate random data based on random numbers
        function generateRandomData() {
            if (allData.length === 0) {
                return [];
            }
            
            // Generate 10 unique random indices
            const indices = new Set();
            while (indices.size < 10 && indices.size < allData.length) {
                indices.add(Math.floor(Math.random() * allData.length));
            }
            
            // Get the data items at the generated indices
            return Array.from(indices).map(index => allData[index]);
        }
        
        // Function to display random data
        function refreshRandomData() {
            const randomData = generateRandomData();
            const dataElement = document.getElementById('randomData');
            dataElement.textContent = JSON.stringify(randomData, null, 2);
        }
        
        // Initialize page with random data
        document.addEventListener('DOMContentLoaded', refreshRandomData);
    </script>
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
      
      // Generate overview page with up to 200 random data items
      let data;
      try {
        // Get up to 200 random data items
        data = await this.dbManager.getRandomData(abbr, 200);
      } catch (error) {
        console.error(`Error getting data for ${abbr}:`, error.message);
        data = [];
      }
      
      // Generate page with data
      const overviewHtml = this.generatePage(data, abbr);
      const overviewPath = path.join(outputDir, `${abbr}.html`);
      
      // Write page to file
      await fs.promises.writeFile(overviewPath, overviewHtml);
      console.log(`Generated overview page: ${overviewPath}`);
      
      console.log(`Completed generating pages for database: ${abbr}`);
    }
    
    console.log('All static pages generated successfully!');
    
    // Generate blank index.html as entry point
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database API</title>
</head>
<body>
    <div class="container">
        <h1>Database API</h1>
        <p>Welcome to the Database API. Select a database to view its data:</p>
        <div class="database-links">
            ${Object.entries(this.dbConfigs).map(([abbr]) => 
                `<a href="./${abbr}.html" class="database-link">${abbr}</a>`
            ).join('')}
        </div>
    </div>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 0;
            background-color: #f0f0f0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        .database-links {
            margin-top: 20px;
        }
        .database-link {
            display: inline-block;
            margin: 5px;
            padding: 10px 15px;
            background: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        .database-link:hover {
            background: #0051bb;
        }
    </style>
</body>
</html>`;
    
    const indexPath = path.join(outputDir, 'index.html');
    await fs.promises.writeFile(indexPath, indexHtml);
    console.log(`Generated index.html at: ${indexPath}`);
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
