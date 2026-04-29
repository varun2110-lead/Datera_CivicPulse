# CivicPulse

A real time monitoring dashboard for India's government websites.

CivicPulse acts as a digital watchdog that tracks uptime, performance, and failures across important public platforms. It helps improve transparency and accountability in digital services.

## Problem

During everyday use, we noticed that government websites like DigiLocker, UMANG, or eSanjeevani often become slow or unavailable without any clear communication.

There is no visibility into outages  
No alerts for users  
No simple way to report issues  

For important services like healthcare or identity systems, this becomes a serious problem.

## Solution

CivicPulse provides a simple real time dashboard that

Monitors government websites continuously  
Measures response time  
Detects whether a service is UP, DOWN, or SLOW  
Auto refreshes every 10 seconds  
Allows users to report issues via email  

## How it works

User opens dashboard  
Frontend calls backend  
Backend checks live websites  
Results are returned and displayed  

## Core monitoring logic

async function checkSite(url) {
  try {
    const start = Date.now();

    const res = await axios.get(url, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const time = Date.now() - start;

    return {
      status: "UP",
      time,
      code: res.status
    };
  } catch (err) {
    return {
      status: "DOWN",
      time: null,
      code: err.response?.status || "NO RESPONSE"
    };
  }
}

We measure

Response time  
HTTP status  
Failures like timeouts or no response  

## Features

### Monitoring

Real time website status tracking  
Response time measurement  
UP DOWN SLOW classification  
Auto refresh every 10 seconds  

### Dashboard

Dark theme interface  
Overall health bar  
Status statistics  
Mini performance charts  

### User interaction

Visit official website directly  
Search and filter services  
Report issues via email  

### Analytics

Health score visualization  
Response insights  
Service level performance  

## Tech stack

Frontend  
React using Vite  

Backend  
Node.js  
Express  

Other tools  
Axios for HTTP checks  
CORS  

## How to run

Backend

cd backend  
npm install  
node server.js  

Frontend

cd client  
npm install  
npm run dev  

## Current state

Backend is checking real websites  
Frontend displays live status  
Reporting system is working  
Dashboard updates in real time  

## Future improvements

Add history tracking  
Improve accuracy with retries  
Add automated alerts  

## Why this matters

Even small failures in public digital infrastructure affect many users.

CivicPulse makes these failures visible.
