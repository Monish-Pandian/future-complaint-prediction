const fs = require('fs');
const path = require('path');

function searchFiles(dir, matchPatterns, ignoreDirs = ['node_modules', '.git', 'dist', 'playwright-report', 'test-results']) {
  const results = [];

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(file)) {
          walk(fullPath);
        }
      } else if (stat.isFile() && /\.(js|jsx|ts|tsx|py|json|md)$/.test(file)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of matchPatterns) {
            const regex = new RegExp(pattern.regex, pattern.flags || 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
              const linesBefore = content.substring(0, match.index).split('\n');
              const lineNum = linesBefore.length;
              const lineContent = content.split('\n')[lineNum - 1].trim();
              results.push({
                category: pattern.category,
                file: path.relative(process.cwd(), fullPath),
                line: lineNum,
                match: match[0],
                snippet: lineContent
              });
            }
          }
        } catch (e) {
          // ignore unreadable files
        }
      }
    }
  }

  walk(dir);
  return results;
}

const patterns = [
  { category: 'MOCK_FALLBACK', regex: 'mock|MOCK|fallback|generateMock|DEMO_SEED', flags: 'gi' },
  { category: 'BASELINE_MODEL', regex: 'baseline-spatial-v1', flags: 'g' },
  { category: 'XGB_MODEL', regex: 'xgb-test-v1', flags: 'g' }
];

const found = searchFiles(process.cwd(), patterns);

const summary = {
  totalMockFallback: found.filter(f => f.category === 'MOCK_FALLBACK').length,
  totalBaseline: found.filter(f => f.category === 'BASELINE_MODEL').length,
  totalXgb: found.filter(f => f.category === 'XGB_MODEL').length,
  baselineOccurrences: found.filter(f => f.category === 'BASELINE_MODEL'),
  sampleMocks: found.filter(f => f.category === 'MOCK_FALLBACK' && !f.file.includes('test') && !f.file.includes('report')).slice(0, 20)
};

console.log(JSON.stringify(summary, null, 2));
