{
  "name": "football-api",
  "version": "1.0.0",
  "description": "API REST de resultados de fútbol — UTN FRVT",
  "main": "dist/init.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/init.ts",
    "build": "tsc",
    "start": "node dist/init.js",
    "cleanup:legacy": "ts-node-dev --transpile-only src/scripts/cleanupLegacyMatches.ts"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongoose": "^8.4.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
