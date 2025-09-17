# Truck Log App

A simple Node.js application for tracking truck diesel entries and expenses.

## Features
- Add truck entries with date, truck number, location, diesel liters, and amount
- View entries by date range or month
- Get summary statistics
- Delete entries

## Installation
```bash
npm install
npm start
```

## API Endpoints
- POST /api/entries - Create new entry
- GET /api/entries - List all entries
- GET /api/entries/month/:ym - Get entries by month
- GET /api/entries/summary - Get summary statistics
- DELETE /api/entries/:id - Delete entry